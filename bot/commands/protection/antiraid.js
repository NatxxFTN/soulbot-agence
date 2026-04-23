'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderFeaturePanel } = require('../../ui/panels/security-feature-panel');

const FEATURE = 'antiraid';
const META = {
  label: 'Anti-Raid',
  emoji: 'cat_protection',
  description: 'Détecte les raids (flood de joins en fenêtre de temps).',
  supportsThreshold: true,
  defaultThreshold : 10,
};
const VALID_ACTIONS = ['kick', 'ban', 'mute_5m', 'mute_1h'];

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

function parseCD(raw) {
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return {}; }
}

module.exports = {
  name       : FEATURE,
  aliases    : ['araid'],
  category   : 'protection',
  description: META.description,
  usage      : ';antiraid [on|off|threshold <n>|window <s>|clear]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }
    const sub     = (args[0] || '').toLowerCase();
    const current = storage.getConfig(message.guild.id, FEATURE) || { enabled: 0, action: 'kick', threshold: 10 };

    if (['on', 'enable', 'activer'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 1 });
      const cfg      = storage.getConfig(message.guild.id, FEATURE);
      const cd       = parseCD(cfg.custom_data);
      const windowS  = Number(cd.window_seconds) || 60;
      return plain(message, `${e('btn_success')} **${META.label}** activé. Seuil : **${cfg.threshold}** joins en **${windowS}s** · Action : \`${cfg.action}\`.`);
    }
    if (['off', 'disable', 'desactiver', 'désactiver'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 0 });
      return plain(message, `${e('btn_error')} **${META.label}** désactivé.`);
    }
    if (sub === 'action') {
      const v = (args[1] || '').toLowerCase();
      if (!VALID_ACTIONS.includes(v)) {
        return plain(message, `${e('btn_error')} Action invalide (raid). Choix : \`${VALID_ACTIONS.join('`, `')}\`.`);
      }
      storage.setConfig(message.guild.id, FEATURE, { action: v });
      return plain(message, `${e('btn_success')} Action **${META.label}** → \`${v}\`.`);
    }
    if (sub === 'threshold' || sub === 'seuil') {
      const n = parseInt(args[1], 10);
      if (Number.isNaN(n) || n < 2 || n > 50) {
        return plain(message, `${e('btn_error')} Seuil invalide. Plage : **2-50** joins.`);
      }
      storage.setConfig(message.guild.id, FEATURE, { threshold: n });
      return plain(message, `${e('btn_success')} Seuil **${META.label}** → **${n}** joins.`);
    }
    if (sub === 'window' || sub === 'fenetre' || sub === 'fenêtre') {
      const s = parseInt(args[1], 10);
      if (Number.isNaN(s) || s < 10 || s > 300) {
        return plain(message, `${e('btn_error')} Fenêtre invalide. Plage : **10-300** secondes.`);
      }
      const cd = parseCD(current.custom_data);
      cd.window_seconds = s;
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify(cd) });
      return plain(message, `${e('btn_success')} Fenêtre **${META.label}** → **${s}s**.`);
    }
    if (sub === 'clear' || sub === 'reset') {
      const detector = require('../../core/security-detectors/antiraid');
      detector.clearRaid(message.guild.id);
      return plain(message, `${e('btn_success')} Raid **${message.guild.name}** reset — les nouveaux membres sont à nouveau acceptés.`);
    }

    const panel = renderFeaturePanel(message.guild, FEATURE, META);
    await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  },
};
