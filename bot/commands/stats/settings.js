'use strict';

const { db, getGuildSettings, setGuildSetting } = require('../../database');
const { e } = require('../../core/emojis');
const V2 = require('./_components-v2');

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
  guildOnly  : true,
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

      return V2.reply(message, V2.panel(
        `${e('cat_configuration')}  **Paramètres — ${message.guild.name}**`,
        V2.fieldBlock([
          { name: `${e('cat_utility')} Préfixe`, value: `\`${settings.prefix}\`` },
          { name: `${e('cat_information')} Stats activées`, value: settings.stats_enabled ? `${e('btn_success')} Oui` : `${e('btn_error')} Non` },
          { name: `${settings.star_emoji} Starboard`, value: settings.star_enabled ? `${e('btn_success')} Actif · ${starChan}` : `${e('btn_error')} Inactif` },
          { name: `${settings.star_emoji} Emoji star`, value: settings.star_emoji },
          { name: `${settings.star_emoji} Seuil`, value: `${settings.star_threshold} étoile(s)` },
          { name: `${e('cat_owner')} Rôle Badge`, value: badgeRole },
          { name: `${e('btn_calendar')} Rôle Anniversaire`, value: bdayRole },
          { name: `${e('cat_giveaway')} Rôle Booster`, value: boostRole },
          { name: `${e('ui_mic')} Rôle Vocal`, value: vocRole },
          { name: `${e('ui_pin')} StatEmbed`, value: embedChan },
        ]),
      ));
    }

    // ── Modifier le préfixe ───────────────────────────────────────────────────
    if (action === 'prefix') {
      const newPrefix = args[2];
      if (!newPrefix || newPrefix.length > 5) {
        return V2.reply(message, V2.error('Préfixe invalide', 'Le préfixe doit faire 1 à 5 caractères.'));
      }
      setGuildSetting(guildId, 'prefix', newPrefix);
      return V2.reply(message, V2.success('Préfixe mis à jour', `Nouveau préfixe : \`${newPrefix}\``));
    }

    // ── Activer/désactiver les stats ──────────────────────────────────────────
    if (action === 'stats') {
      const val = (args[2] ?? '').toLowerCase();
      if (!['on', 'off', '1', '0', 'true', 'false'].includes(val)) {
        return V2.reply(message, V2.usage(';', 'settings global stats <on|off>', ''));
      }
      const enabled = ['on', '1', 'true'].includes(val) ? 1 : 0;
      setGuildSetting(guildId, 'stats_enabled', enabled);
      return V2.reply(message, V2.success('Stats', enabled ? `${e('btn_success')} Tracking des statistiques activé.` : `${e('btn_error')} Tracking des statistiques désactivé.`));
    }

    return V2.reply(message, V2.usage(';', 'settings global [prefix|stats] [valeur]', 'Paramètres globaux du bot.'));
  },
};
