'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderFeaturePanel } = require('../../ui/panels/security-feature-panel');

const FEATURE = 'antiwords';
const META = {
  label: 'Filtre de mots',
  emoji: 'btn_edit',
  description: 'Bloque les messages contenant des mots interdits custom.',
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
  aliases    : ['awords', 'wordfilter'],
  category   : 'protection',
  description: META.description,
  usage      : ';antiwords [on|off|add|remove|list|clear] [mot]',
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
      return plain(message, `${e('btn_success')} **${META.label}** activé (${data.words.length} mots filtrés).`);
    }
    if (['off', 'disable', 'desactiver', 'désactiver'].includes(sub)) {
      storage.setConfig(message.guild.id, FEATURE, { enabled: 0 });
      return plain(message, `${e('btn_error')} **${META.label}** désactivé.`);
    }

    if (sub === 'add') {
      const word = args.slice(1).join(' ').trim().toLowerCase();
      if (!word || word.length < 2) return plain(message, `${e('btn_error')} Mot invalide (min 2 caractères).`);
      if (data.words.length >= MAX_WORDS) return plain(message, `${e('btn_error')} Limite de ${MAX_WORDS} mots atteinte.`);
      if (data.words.includes(word))      return plain(message, `${e('btn_error')} "${word}" est déjà dans la liste.`);

      data.words.push(word);
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify(data) });
      return plain(message, `${e('btn_success')} "${word}" ajouté. Total : **${data.words.length}/${MAX_WORDS}**.`);
    }

    if (sub === 'remove' || sub === 'rm') {
      const word = args.slice(1).join(' ').trim().toLowerCase();
      const idx  = data.words.indexOf(word);
      if (idx === -1) return plain(message, `${e('btn_error')} "${word}" n'est pas dans la liste.`);
      data.words.splice(idx, 1);
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify(data) });
      return plain(message, `${e('btn_success')} "${word}" retiré. Total : **${data.words.length}**.`);
    }

    if (sub === 'list') {
      if (data.words.length === 0) {
        return plain(message, `${e('btn_tip')} Aucun mot. Ajoute via \`;antiwords add <mot>\`.`);
      }
      const container = new ContainerBuilder().setAccentColor(0xFF0000);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_edit')} **Mots filtrés** (${data.words.length}/${MAX_WORDS})`,
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const listText = data.words.map((w, i) => `${i + 1}. \`${w}\``).join('\n');
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(listText.slice(0, 3800)));
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    if (sub === 'clear') {
      storage.setConfig(message.guild.id, FEATURE, { custom_data: JSON.stringify({ words: [] }) });
      return plain(message, `${e('btn_success')} Liste vidée.`);
    }

    const panel = renderFeaturePanel(message.guild, FEATURE, META);
    await message.reply({ components: [panel], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
  },
};
