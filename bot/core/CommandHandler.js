'use strict';

// POURQUOI core/ et non handlers/ : les handlers/ sont le chargeur de fichiers
// hérité. core/CommandHandler est le moteur d'exécution complet : cooldowns,
// permissions Discord, owner guard, injection DB. Les deux coexistent pendant
// la transition ; handlers/ sera retiré en Phase 2.
// Référence : ARCHITECT_LOGIC.md §3 — Injection de dépendances

const fs     = require('fs');
const path   = require('path');
const { Collection, PermissionsBitField } = require('discord.js');

const COMMANDS_ROOT = path.join(__dirname, '../commands');

// Objectifs par catégorie (roadmap S1→S6)
const CATEGORY_TARGETS = {
  owner        : 39,
  moderation   : 35,
  information  : 15,
  utility      : 21,
  configuration: 20,
  protection   : 13,
  fun          : 12,
  stats        : 15,
  ticket       : 12,
  game         : 10,
  custom       :  5,
  giveaway     :  5,
  greeting     :  5,
  invitation   :  6,
  level        :  6,
  role         :  7,
};
const GLOBAL_TARGET = Object.values(CATEGORY_TARGETS).reduce((a, b) => a + b, 0);

/**
 * Charge récursivement toutes les commandes depuis bot/commands/**
 * Chaque fichier doit exporter : { name, execute, [aliases], [cooldown],
 *   [permissions], [ownerOnly], [guildOnly], [description], [usage] }
 *
 * @param {import('discord.js').Client} client
 * @param {import('../utils/logger')} logger
 */
function loadCommands(client, logger) {
  // Réinitialisation propre — permet un reload à chaud sans doublon
  client.commands.clear();
  client.aliases.clear();

  let loaded  = 0;
  let skipped = 0;
  const errors      = [];
  const catCounts   = {};

  const categoryDirs = fs.readdirSync(COMMANDS_ROOT);

  for (const category of categoryDirs) {
    const catPath = path.join(COMMANDS_ROOT, category);
    if (!fs.statSync(catPath).isDirectory()) continue;

    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
    catCounts[category] = 0;

    for (const file of files) {
      const filePath = path.join(catPath, file);

      try {
        // Purge cache pour rechargement à chaud
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);

        if (!cmd?.name || typeof cmd.execute !== 'function') {
          logger.warn('CommandHandler', `${category}/${file} — "name" ou "execute" manquant, ignoré`);
          skipped++;
          errors.push(`${category}/${file} — name/execute manquant`);
          continue;
        }

        cmd.category = category;
        client.commands.set(cmd.name.toLowerCase(), cmd);

        if (Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            client.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
          }
        }

        loaded++;
        catCounts[category]++;
      } catch (err) {
        logger.errorStack('CommandHandler', err);
        skipped++;
        errors.push(`${category}/${file} — ${err.message}`);
      }
    }
  }

  // ── Tableau de chargement par catégorie ──────────────────────────────────
  const SEP = '━'.repeat(44);
  const lines = [`\n${SEP}`, '🤖 Soulbot — Chargement des commandes', SEP];

  const allCats = [...new Set([...Object.keys(CATEGORY_TARGETS), ...Object.keys(catCounts)])];
  for (const cat of allCats) {
    const count  = catCounts[cat] ?? 0;
    const target = CATEGORY_TARGETS[cat] ?? '?';
    let icon;
    if (count === 0)                      icon = '⏳';
    else if (count >= target)             icon = count > target ? '🎉' : '✅';
    else                                  icon = '⏳';
    const label = `📁 ${cat}`.padEnd(20);
    lines.push(`${label}: ${String(count).padStart(2)} / ${String(target).padStart(2)}  ${icon}`);
  }

  lines.push(SEP);
  const pct = GLOBAL_TARGET > 0 ? Math.round((loaded / GLOBAL_TARGET) * 100) : 0;
  lines.push(`TOTAL : ${loaded} / ${GLOBAL_TARGET} commandes chargées (${pct}%)`);

  if (errors.length) {
    lines.push('', `⚠️  ${errors.length} erreur(s) de chargement :`);
    for (const e of errors) lines.push(`  - ${e}`);
  }

  lines.push(SEP);
  logger.info('CommandHandler', lines.join('\n'));
}

/**
 * Dispatche une commande préfixée (MessageCreate).
 * Gère : alias → nom canonique, cooldowns, permissions, ownerOnly, guildOnly.
 *
 * @param {import('discord.js').Message}  message
 * @param {import('discord.js').Client}   client
 * @param {import('../database')}         db
 * @param {import('../utils/logger')}     logger
 */
async function dispatch(message, client, db, logger) {
  const { guild, author, channel } = message;

  // Récupère le prefix depuis la DB si guilde disponible, sinon fallback ';'
  let prefix = ';';
  if (guild) {
    try {
      const row = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(guild.id);
      if (row?.prefix) prefix = row.prefix;
    } catch {
      // DB indisponible — prefix par défaut, on continue
    }
  }

  if (!message.content.startsWith(prefix) || author.bot) return;

  const raw   = message.content.slice(prefix.length).trim();
  const args  = raw.split(/\s+/);
  const input = args.shift().toLowerCase();

  // Résolution alias → nom canonique
  const name = client.aliases.get(input) ?? input;
  const cmd  = client.commands.get(name);
  if (!cmd) return;

  // Garde guildOnly
  if (cmd.guildOnly && !guild) {
    return channel.send({ content: '✗ Cette commande est uniquement disponible sur un serveur.' });
  }

  // Garde ownerOnly — validation Snowflake stricte
  if (cmd.ownerOnly) {
    const owners = (process.env.BOT_OWNERS ?? '').split(',').map(s => s.trim()).filter(s => /^\d{17,19}$/.test(s));
    if (!owners.includes(author.id)) {
      return channel.send({ content: '✗ Commande réservée au propriétaire du bot.' });
    }
  }

  // Garde permissions Discord
  if (Array.isArray(cmd.permissions) && cmd.permissions.length && guild) {
    const missing = cmd.permissions.filter(
      p => !message.member?.permissions.has(PermissionsBitField.Flags[p])
    );
    if (missing.length) {
      return channel.send({
        content: `✗ Permissions manquantes : \`${missing.join(', ')}\``,
      });
    }
  }

  // Cooldown — clé "cmdName:userId" pour isolation totale
  if (cmd.cooldown) {
    const key       = `${cmd.name}:${author.id}`;
    const now       = Date.now();
    const last      = client.cooldowns.get(key) ?? 0;
    const remaining = cmd.cooldown * 1000 - (now - last);

    if (remaining > 0) {
      const secs = (remaining / 1000).toFixed(1);
      return channel.send({ content: `✗ Cooldown actif — réessaie dans **${secs}s**.` });
    }

    client.cooldowns.set(key, now);
    // POURQUOI setTimeout pour cleanup : éviter une fuite mémoire sur les
    // cooldowns. Sans ça, client.cooldowns grossit indéfiniment.
    setTimeout(() => client.cooldowns.delete(key), cmd.cooldown * 1000);
  }

  // Exécution avec catch structuré
  try {
    await cmd.execute(message, args, client, db);
  } catch (err) {
    logger.errorStack('CommandHandler', err);
    channel.send({ content: '✗ Une erreur interne est survenue.' }).catch(() => {});
  }
}

/**
 * Recharge une commande à chaud par nom canonique.
 * @param {import('discord.js').Client} client
 * @param {string} commandName
 * @param {import('../utils/logger')} logger
 * @returns {boolean}
 */
function reloadCommand(client, commandName, logger) {
  const cmd = client.commands.get(commandName.toLowerCase());
  if (!cmd) return false;

  const filePath = path.join(COMMANDS_ROOT, cmd.category, `${commandName}.js`);
  if (!fs.existsSync(filePath)) return false;

  try {
    delete require.cache[require.resolve(filePath)];
    const newCmd = require(filePath);
    newCmd.category = cmd.category;
    client.commands.set(newCmd.name.toLowerCase(), newCmd);
    logger.info('CommandHandler', `Commande "${commandName}" rechargée`);
    return true;
  } catch (err) {
    logger.errorStack('CommandHandler', err);
    return false;
  }
}

module.exports = { loadCommands, dispatch, reloadCommand };
