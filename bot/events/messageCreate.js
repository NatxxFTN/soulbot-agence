'use strict';

const {
  PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { db, ensureGuild, getGuildSettings } = require('../database');
const E = require('../utils/embeds');
const botLogger = require('../core/logger');
const { sendUnknownCommand } = require('../core/unknown-command');
const { e } = require('../core/emojis');
const ac = require('../core/access-control');

// Commandes TOUJOURS accessibles (publiques) — le middleware whitelist les exempte.
// ⚠️ help reste accessible pour que l'utilisateur puisse voir l'accès refusé stylé.
const PUBLIC_COMMANDS = new Set(['help', 'aide', 'h', 'ping']);

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
    if (!cmd) {
      // ── Interceptor : commande custom ? ───────────────────────────────────
      const customStorage = require('../core/custom-commands-storage');
      const customCmd     = customStorage.getCommand(guildId, commandName);
      if (customCmd) {
        // Whitelist : les custom cmds sont soumises au même accès que les natives
        if (!ac.hasAccess(guildId, message.author.id)) {
          return; // silencieux — pas de spam
        }
        // Cooldown 3s par (user, cmd)
        const cdKey  = `custom:${message.author.id}:${commandName}`;
        const last   = client.cooldowns.get(cdKey);
        if (last && Date.now() - last < 3000) return;
        client.cooldowns.set(cdKey, Date.now());
        setTimeout(() => client.cooldowns.delete(cdKey), 3000);

        try {
          customStorage.incrementUses(guildId, commandName);
          const { parseVariables } = require('../core/custom-variables');
          const ctx = { user: message.author, member: message.member, guild: message.guild, channel: message.channel };

          if (customCmd.response_type === 'text') {
            const text = parseVariables(customCmd.response_text || '', ctx);
            await message.channel.send({ content: text, allowedMentions: { parse: ['users'] } });
          } else if (customCmd.response_type === 'embed') {
            const { EmbedBuilder } = require('discord.js');
            const data  = JSON.parse(customCmd.embed_data || '{}');
            const embed = new EmbedBuilder();
            if (data.title)       embed.setTitle(parseVariables(data.title, ctx).slice(0, 256));
            if (data.description) embed.setDescription(parseVariables(data.description, ctx).slice(0, 4096));
            if (data.color)       embed.setColor(data.color);
            if (data.image)       embed.setImage(data.image);
            if (data.thumbnail)   embed.setThumbnail(data.thumbnail);
            await message.channel.send({ embeds: [embed] });
          }
        } catch (err) {
          console.error('[custom-exec]', err.message);
        }
        return;
      }

      await sendUnknownCommand(message, commandName, prefix, [...client.commands.values()]);
      return;
    }

    // ── Middleware WHITELIST (accès au bot) ───────────────────────────────────
    // Refuse si user n'est ni BotOwner, ni Buyer, ni Owner sur ce serveur.
    // Les commandes PUBLIC_COMMANDS restent accessibles pour éviter qu'un user
    // non-whitelisté se retrouve sans aucun feedback.
    if (!PUBLIC_COMMANDS.has(cmd.name) && !ac.hasAccess(guildId, message.author.id)) {
      const level = ac.getPermissionLevel(guildId, message.author.id);
      const badge = ac.getPermissionBadge(level);

      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('btn_error')} **Accès refusé**`),
      );
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_lock')} Soulbot est un **bot privé premium**.\n` +
          `${e('ui_crown')} Seuls les **BotOwners**, **Buyers** et **Owners** du serveur peuvent l'utiliser.`,
        ),
      );
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_user')} **Ton niveau actuel** : ${badge}\n` +
          `${e('btn_tip')} Contacte un **Buyer** du serveur pour obtenir l'accès.`,
        ),
      );

      return message.reply({
        components: [ct],
        flags     : MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

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
