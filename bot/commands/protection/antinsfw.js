'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderFeaturePanel } = require('../../ui/panels/security-feature-panel');
const { DEFAULT_NSFW_WORDS } = require('../../core/security-detectors/antinsfw');

const FEATURE = 'antinsfw';
const META = {
  label: 'Anti-NSFW',
  emoji: 'btn_error',
  description: 'Détecte les mots NSFW (liste defaults + custom serveur).',
  supportsThreshold: false,
  defaultThreshold : 1,
};
const MAX_WORDS = 100;

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

function parseData(raw) {
  if (!raw) return { words: [] };
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { words: Array.isArray(obj?.words) ? obj.words : [] };
  } catch { return { words: [] }; }
}

module.exports = {
  name       : FEATURE,
  aliases    : ['ansfw'],
  category   : 'protection',
  description: META.description,
  usage      : ';antinsfw [on|off|add|remove|list|clear] [mot]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.ManageGuild],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
    }

    const sub     = (args[0] || '').toLowerCase();
    const current = storage.getConfig(message.guild.id, FEATURE) || { enabled: 0, action: 'delete', threshold: 1 };
    const data    = parseData(current.custom_data);

    if (['on', 'enable', 'activer'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 1 });
      return plain(message, `${e('btn_success')} **${META.label}** activé (defaults : ${DEFAULT_NSFW_WORDS.length} · custom : ${data.words.length}).`);
    }
    if (['off', 'disable', 'desactiver', 'désactiver'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 0 });
      return plain(message, `${e('btn_error')} **${META.label}** désactivé.`);
    }

    if (sub === 'add') {
      const word = args.slice(1).join(' ').trim().toLowerCase();
      if (!word || word.length < 2) return plain(message, `${e('btn_error')} Mot invalide (min 2 caractères).`);
      if (data.words.length >= MAX_WORDS) return plain(message, `${e('btn_error')} Limite de ${MAX_WORDS} mots custom atteinte.`);
      if (data.words.includes(word))      return plain(message, `${e('btn_error')} "${word}" est déjà dans la liste custom.`);

      data.words.push(word);
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify(data) });
      return plain(message, `${e('btn_success')} "${word}" ajouté à la liste NSFW custom. Total custom : **${data.words.length}**.`);
    }

    if (sub === 'remove' || sub === 'rm') {
      const word = args.slice(1).join(' ').trim().toLowerCase();
      const idx  = data.words.indexOf(word);
      if (idx === -1) return plain(message, `${e('btn_error')} "${word}" n'est pas dans la liste custom.`);
      data.words.splice(idx, 1);
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify(data) });
      return plain(message, `${e('btn_success')} "${word}" retiré.`);
    }

    if (sub === 'list') {
      const container = new ContainerBuilder().setAccentColor(0xFF0000);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Liste NSFW** · defaults: ${DEFAULT_NSFW_WORDS.length} · custom: ${data.words.length}/${MAX_WORDS}`,
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_information')} **Defaults** : ${DEFAULT_NSFW_WORDS.map(w => `\`${w}\``).join(', ')}`,
      ));
      if (data.words.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        const listText = data.words.map((w, i) => `${i + 1}. \`${w}\``).join('\n');
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e('btn_edit')} **Custom** :\n${listText.slice(0, 2000)}`,
        ));
      }
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'clear') {
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify({ words: [] }) });
      return plain(message, `${e('btn_success')} Liste custom vidée. *Les defaults restent actifs.*`);
    }

    const panel = renderFeaturePanel(message.guild, FEATURE, META);
    await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  },
};
