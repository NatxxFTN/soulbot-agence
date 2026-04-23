'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderFeaturePanel } = require('../../ui/panels/security-feature-panel');

const FEATURE = 'antibot';
const META = {
  label: 'Anti-Bot',
  emoji: 'cat_protection',
  description: "Empêche l'ajout de bots externes (via guildMemberAdd — câblage prompt 3/3).",
  supportsThreshold: false,
  defaultThreshold : 1,
};
const VALID_ACTIONS = ['delete', 'warn', 'kick', 'ban'];

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

module.exports = {
  name       : FEATURE,
  aliases    : ['abot'],
  category   : 'protection',
  description: META.description,
  usage      : `;${FEATURE} [on|off|action <type>]`,
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
      return plain(message, `${e('btn_success')} **${META.label}** activé. Action : \`${cfg.action}\`.\n${e('btn_tip')} Câblage guildMemberAdd arrive au Prompt 3/3.`);
    }
    if (['off', 'disable', 'desactiver', 'désactiver'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 0 });
      return plain(message, `${e('btn_error')} **${META.label}** désactivé.`);
    }
    if (sub === 'action') {
      const v = (args[1] || '').toLowerCase();
      if (!VALID_ACTIONS.includes(v)) {
        return plain(message, `${e('btn_error')} Action invalide (antibot). Choix : \`${VALID_ACTIONS.join('`, `')}\`.`);
      }
      storage.setConfig(message.guild.id, FEATURE, { action: v });
      return plain(message, `${e('btn_success')} Action **${META.label}** → \`${v}\`.`);
    }

    const panel = renderFeaturePanel(message.guild, FEATURE, META);
    await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  },
};
