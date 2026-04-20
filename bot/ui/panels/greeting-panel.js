'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');
const { COLORS, EMOJIS, LABELS } = require('../theme');
const { getConfig } = require('../../core/greeting-helper');

function e(key, fallback) {
  return typeof EMOJIS[key] === 'function' ? EMOJIS[key]() : (EMOJIS[key] || fallback);
}

/**
 * Panel Greeting v3 — clone visuel Crowbot.
 * Tout sur UN seul écran. 5 rows max (limite Discord).
 * Chaque paramètre sur sa propre ligne (inline: false).
 * Boutons groupés par paramètre.
 *
 * @param {string} guildId
 * @param {'join'|'leave'} mode
 */
function renderPanel(guildId, mode = 'join') {
  const cfg    = getConfig(guildId) || {};
  const isJoin = mode === 'join';

  const channelId = isJoin ? cfg.join_channel_id : cfg.leave_channel_id;
  const message   = isJoin ? cfg.join_message    : cfg.leave_message;
  const embed     = isJoin ? cfg.join_embed       : cfg.leave_embed;
  const dm        = isJoin ? cfg.join_dm          : cfg.leave_dm;
  const dmEmbed   = isJoin ? cfg.join_dm_embed    : cfg.leave_dm_embed;
  const isEnabled = isJoin ? !!cfg.join_enabled   : !!cfg.leave_enabled;

  const eCheck = e('check', '✅');
  const eCross = e('cross', '❌');

  // ── Embed ──────────────────────────────────────────────────────────────────
  const mainEmbed = new EmbedBuilder()
    .setColor(COLORS.accent)
    .setTitle(`${EMOJIS.bot || '🍊'} Configuration Greeting`)
    .setDescription('Paramétrez les messages d\'arrivée et de départ de votre serveur.')
    .addFields(
      {
        name : `${isJoin ? (EMOJIS.join || '🔔') : (EMOJIS.leave || '👋')} ${isJoin ? 'Arrivée' : 'Départ'}`,
        value: isEnabled
          ? `${EMOJIS.on || '🟢'} **${LABELS.statusOn}**`
          : `${EMOJIS.off || '🔴'} ${LABELS.statusOff}`,
        inline: false,
      },
      {
        name : `${EMOJIS.channel || '#'} Salon`,
        value: channelId ? `<#${channelId}>` : `*${LABELS.notDefined}*`,
        inline: false,
      },
      {
        name : `${EMOJIS.message || '💬'} Message`,
        value: message ? `${eCheck} **${LABELS.defined}**` : `${eCross} *${LABELS.notDefined}*`,
        inline: false,
      },
      {
        name : `${EMOJIS.embed || '🖼️'} Embed`,
        value: embed ? `${eCheck} **${LABELS.defined}**` : `${eCross} *${LABELS.notDefined}*`,
        inline: false,
      },
      {
        name : `${EMOJIS.dm || '📨'} DM`,
        value: dm ? `${eCheck} **${LABELS.defined}**` : `${eCross} *${LABELS.notDefined}*`,
        inline: false,
      },
      {
        name : `${EMOJIS.dmEmbed || '💌'} DM Embed`,
        value: dmEmbed ? `${eCheck} **${LABELS.defined}**` : `${eCross} *${LABELS.notDefined}*`,
        inline: false,
      },
    )
    .setFooter({ text: `Soulbot · ${isJoin ? 'Arrivée' : 'Départ'}` });

  // ── Row 1 : Dropdown Arrivée / Départ ─────────────────────────────────────
  const row1 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('greeting:mode:select')
      .setPlaceholder('Choisir la section à configurer')
      .addOptions(
        { label: 'Arrivée', value: 'join',  description: 'Messages quand un membre rejoint', emoji: '🔔', default: isJoin  },
        { label: 'Départ',  value: 'leave', description: 'Messages quand un membre quitte',  emoji: '👋', default: !isJoin },
      ),
  );

  // ── Row 2 : Sélecteur salon ────────────────────────────────────────────────
  const row2 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`greeting:${mode}:channel`)
      .setPlaceholder('Sélectionner un salon')
      .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
      .setMinValues(1).setMaxValues(1),
  );

  // ── Row 3 : Activer/Désactiver · Message [Configurer] [Reset] ─────────────
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:toggle`)
      .setLabel(isEnabled ? LABELS.deactivate : LABELS.activate)
      .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:message_modal`)
      .setLabel('Message')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:message_reset`)
      .setEmoji('🔄')
      .setLabel('Reset msg')
      .setStyle(ButtonStyle.Secondary),
  );

  // ── Row 4 : Embed [Configurer] [Reset] · DM [Configurer] ──────────────────
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:embed_modal`)
      .setLabel('Embed')
      .setEmoji('🖼️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:embed_reset`)
      .setEmoji('🔄')
      .setLabel('Reset embed')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:dm_modal`)
      .setLabel('DM')
      .setEmoji('📨')
      .setStyle(ButtonStyle.Primary),
  );

  // ── Row 5 : DM [Reset] · DM Embed [Configurer] [Reset] · Variables ────────
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:dm_reset`)
      .setEmoji('🔄')
      .setLabel('Reset DM')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:dm_embed_modal`)
      .setLabel('DM Embed')
      .setEmoji('💌')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:dm_embed_reset`)
      .setEmoji('🔄')
      .setLabel('Reset DM emb')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`greeting:${mode}:variables`)
      .setLabel('Variables')
      .setEmoji('🔍')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [mainEmbed], components: [row1, row2, row3, row4, row5] };
}

module.exports = { renderPanel };
