'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderFeaturePanel } = require('../../ui/panels/security-feature-panel');

const FEATURE = 'antinewaccount';
const META = {
  label: 'Anti-Nouveau compte',
  emoji: 'ui_pin',
  description: "Refuse les comptes < X jours d'ancienneté.",
  supportsThreshold: true,
  defaultThreshold : 7,
};
const VALID_ACTIONS = ['kick', 'ban', 'mute_5m', 'mute_1h', 'warn'];

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

module.exports = {
  name       : FEATURE,
  aliases    : ['anewaccount', 'anewacc'],
  category   : 'protection',
  description: META.description,
  usage      : ';antinewaccount [on|off|action <type>|days <1-90>]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }
    const sub = (args[0] || '').toLowerCase();

    if (['on', 'enable', 'activer'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 1 });
      const cfg = storage.getConfig(message.guild.id, FEATURE);
      return plain(message, `${e('btn_success')} **${META.label}** activé. Seuil : **${cfg.threshold} jours** · Action : \`${cfg.action}\`.`);
    }
    if (['off', 'disable', 'desactiver', 'désactiver'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 0 });
      return plain(message, `${e('btn_error')} **${META.label}** désactivé.`);
    }
    if (sub === 'action') {
      const v = (args[1] || '').toLowerCase();
      if (!VALID_ACTIONS.includes(v)) {
        return plain(message, `${e('btn_error')} Action invalide (nouveau membre). Choix : \`${VALID_ACTIONS.join('`, `')}\`.`);
      }
      storage.setConfig(message.guild.id, FEATURE, { action: v });
      return plain(message, `${e('btn_success')} Action **${META.label}** → \`${v}\`.`);
    }
    if (sub === 'days' || sub === 'threshold' || sub === 'seuil') {
      const n = parseInt(args[1], 10);
      if (Number.isNaN(n) || n < 1 || n > 90) {
        return plain(message, `${e('btn_error')} Jours invalide. Plage : **1-90**.`);
      }
      storage.setConfig(message.guild.id, FEATURE, { threshold: n });
      return plain(message, `${e('btn_success')} Seuil **${META.label}** → **${n} jours** d'ancienneté min.`);
    }

    const panel = renderFeaturePanel(message.guild, FEATURE, META);
    await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  },
};
