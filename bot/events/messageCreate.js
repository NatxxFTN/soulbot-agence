'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { db, ensureGuild, getGuildSettings } = require('../database');
const E = require('../utils/embeds');
const botLogger = require('../core/logger');

// Statements précompilés UNE SEULE FOIS au chargement du module.
// POURQUOI hors du handler : better-sqlite3 compile le statement à chaque appel
// de db.prepare(). Sur 10 000 messages/seconde, appeler prepare() dans le handler
// = 10 000 compilations SQL/seconde. Ici : 2 compilations au démarrage, point final.
const STMT_INC_USER_STATS = db.prepare(`
  INSERT INTO user_stats (guild_id, user_id, messages, last_message_at)
  VALUES (?, ?, 1, ?)
  ON CONFLICT(guild_id, user_id) DO UPDATE SET
    messages        = messages + 1,
    last_message_at = excluded.last_message_at
`);

const STMT_INC_CHANNEL_STATS = db.prepare(`
  INSERT INTO user_channel_stats (guild_id, channel_id, user_id, messages)
  VALUES (?, ?, ?, 1)
  ON CONFLICT(guild_id, channel_id, user_id) DO UPDATE SET
    messages = messages + 1
`);

module.exports = {
  name : 'messageCreate',

  async execute(message, client) {
    // Court-circuit immédiat sur les bots et les DMs.
    // POURQUOI en premier : évite tout traitement inutile sur 100% des messages
    // provenant d'autres bots ou de DMs — cas les plus fréquents après les messages humains.
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    ensureGuild(guildId);

    // ── Enregistrement des stats ──────────────────────────────────────────────
    const now = Math.floor(Date.now() / 1000);

    STMT_INC_USER_STATS.run(guildId, message.author.id, now);
    STMT_INC_CHANNEL_STATS.run(guildId, message.channel.id, message.author.id);

    // ── Récupérer le prefix ───────────────────────────────────────────────────
    const settings = getGuildSettings(guildId);
    const prefix   = settings?.prefix ?? process.env.PREFIX ?? ';';

    if (!message.content.startsWith(prefix)) return;

    // ── Parse de la commande ──────────────────────────────────────────────────
    const args        = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    // Résolution via aliases
    const resolvedName = client.aliases.get(commandName) ?? commandName;
    const cmd          = client.commands.get(resolvedName);
    if (!cmd) return;

    // ── Guard ownerOnly ───────────────────────────────────────────────────────
    if (cmd.ownerOnly) {
      const owners = (process.env.BOT_OWNERS ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(s => /^\d{17,19}$/.test(s));
      if (!owners.includes(message.author.id)) {
        return message.reply({ embeds: [E.error('Accès refusé', 'Commande réservée au propriétaire du bot.')] });
      }
    }

    // ── Cooldown ──────────────────────────────────────────────────────────────
    const cooldownMs = (cmd.cooldown ?? 3) * 1000;
    const cdKey      = `${cmd.name}-${message.author.id}`;
    const lastUsed   = client.cooldowns.get(cdKey);

    if (lastUsed) {
      const remaining = cooldownMs - (Date.now() - lastUsed);
      if (remaining > 0) {
        const msg = await message.reply({
          embeds: [E.error('Cooldown', `Patiente encore **${(remaining / 1000).toFixed(1)}s** avant de réutiliser \`${prefix}${cmd.name}\`.`)]
        }).catch(() => null);
        if (msg) setTimeout(() => msg.delete().catch(() => {}), 4000);
        return;
      }
    }

    client.cooldowns.set(cdKey, Date.now());
    setTimeout(() => client.cooldowns.delete(cdKey), cooldownMs);

    // ── Permissions requises ──────────────────────────────────────────────────
    if (cmd.permissions?.length) {
      const missing = cmd.permissions.filter(p => !message.member.permissions.has(p));
      if (missing.length) {
        return message.reply({
          embeds: [E.error('Permissions insuffisantes', `Tu as besoin de : \`${missing.join('`, `')}\``)]
        });
      }
    }

    // ── Exécution ─────────────────────────────────────────────────────────────
    const startTime = Date.now();
    try {
      await cmd.execute(message, args, client);
      botLogger.command({
        eventType  : 'command_executed',
        guildId    : message.guild.id,
        guildName  : message.guild.name,
        userId     : message.author.id,
        userName   : message.author.tag,
        channelId  : message.channel.id,
        commandName: cmd.name,
        message    : `;${cmd.name} par ${message.author.tag}`,
        durationMs : Date.now() - startTime,
        success    : true,
      });
    } catch (err) {
      console.error(`[Commands] Erreur dans ${cmd.name}:`, err);
      botLogger.error({
        eventType  : 'command_error',
        guildId    : message.guild.id,
        guildName  : message.guild.name,
        userId     : message.author.id,
        userName   : message.author.tag,
        commandName: cmd.name,
        message    : `Erreur ${cmd.name}: ${err.message}`,
        success    : false,
      });
      message.reply({
        embeds: [E.error('Erreur interne', 'Une erreur est survenue. Vérifie les logs du bot.')]
      }).catch(() => {});
    }
  },
};
