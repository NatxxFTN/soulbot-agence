'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, getGuildSettings, setGuildSetting } = require('../../database');
const E = require('../../utils/embeds');

/*
 * ;settings global
 * Affiche et modifie les paramètres globaux du bot pour ce serveur.
 *
 * Sous-commandes :
 *   ;settings global                       — Afficher la config actuelle
 *   ;settings global prefix <;>            — Changer le préfixe
 *   ;settings global stats <on|off>        — Activer/désactiver le tracking des stats
 */
module.exports = {
  name        : 'settings',
  aliases     : ['config', 'configuration'],
  description : 'Paramètres globaux du bot.',
  usage       : 'settings global [prefix|stats] [valeur]',
  cooldown    : 3,
  permissions : ['ManageGuild'],

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const sub     = (args[0] ?? '').toLowerCase();

    // ── Route vers settings global ────────────────────────────────────────────
    if (sub !== 'global' && sub !== '') {
      // D'autres modules ont leur propre "settings <module>" → laisser passer silencieusement
      // sauf si sub = 'global' ou pas d'argument
      return;
    }

    const action = (args[1] ?? 'show').toLowerCase();
    const settings = getGuildSettings(guildId);

    // ── Affichage ─────────────────────────────────────────────────────────────
    if (action === 'show' || action === 'info' || !args[1]) {
      const badgeRole  = settings.role_badge_id  ? `<@&${settings.role_badge_id}>`  : '*Non défini*';
      const bdayRole   = settings.role_bday_id   ? `<@&${settings.role_bday_id}>`   : '*Non défini*';
      const boostRole  = settings.role_boost_id  ? `<@&${settings.role_boost_id}>`  : '*Non défini*';
      const vocRole    = settings.role_voc_id    ? `<@&${settings.role_voc_id}>`    : '*Non défini*';

      const starChan   = settings.star_channel_id   ? `<#${settings.star_channel_id}>` : '*Non défini*';
      const embedChan  = settings.statembed_channel_id ? `<#${settings.statembed_channel_id}>` : '*Non défini*';

      const embed = new EmbedBuilder()
        .setColor(E.COLORS.PRIMARY)
        .setTitle(`⚙️  Paramètres — ${message.guild.name}`)
        .setThumbnail(message.guild.iconURL({ dynamic: true }))
        .addFields(
          { name: '🔧 Préfixe',            value: `\`${settings.prefix}\``,                                        inline: true },
          { name: '📊 Stats activées',      value: settings.stats_enabled ? '✅ Oui' : '❌ Non',                    inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: '⭐ Starboard',           value: settings.star_enabled ? `✅ Actif · ${starChan}` : '❌ Inactif', inline: true },
          { name: '⭐ Emoji star',          value: settings.star_emoji,                                              inline: true },
          { name: '⭐ Seuil',              value: `${settings.star_threshold} étoile(s)`,                           inline: true },
          { name: '🎖️ Rôle Badge',          value: badgeRole,   inline: true },
          { name: '🎂 Rôle Anniversaire',   value: bdayRole,    inline: true },
          { name: '🚀 Rôle Booster',        value: boostRole,   inline: true },
          { name: '🎙️ Rôle Vocal',          value: vocRole,     inline: true },
          { name: '📌 StatEmbed',           value: embedChan,   inline: true },
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── Modifier le préfixe ───────────────────────────────────────────────────
    if (action === 'prefix') {
      const newPrefix = args[2];
      if (!newPrefix || newPrefix.length > 5) {
        return message.reply({ embeds: [E.error('Préfixe invalide', 'Le préfixe doit faire 1 à 5 caractères.')] });
      }
      setGuildSetting(guildId, 'prefix', newPrefix);
      return message.reply({ embeds: [E.success('Préfixe mis à jour', `Nouveau préfixe : \`${newPrefix}\``)] });
    }

    // ── Activer/désactiver les stats ──────────────────────────────────────────
    if (action === 'stats') {
      const val = (args[2] ?? '').toLowerCase();
      if (!['on', 'off', '1', '0', 'true', 'false'].includes(val)) {
        return message.reply({ embeds: [E.usage(';', 'settings global stats <on|off>', '')] });
      }
      const enabled = ['on', '1', 'true'].includes(val) ? 1 : 0;
      setGuildSetting(guildId, 'stats_enabled', enabled);
      return message.reply({ embeds: [E.success('Stats', enabled ? '✅ Tracking des statistiques activé.' : '❌ Tracking des statistiques désactivé.')] });
    }

    return message.reply({ embeds: [E.usage(';', 'settings global [prefix|stats] [valeur]', 'Paramètres globaux du bot.')] });
  },
};
