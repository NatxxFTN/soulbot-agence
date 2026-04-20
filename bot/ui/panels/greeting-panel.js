'use strict';

const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { buildPanel } = require('../builders/panel-builder');
const { buildToggleButton } = require('../builders/toggle-section');
const buttons = require('../components/buttons');
const selects  = require('../components/selects');
const { COLORS, EMOJIS, LABELS } = require('../theme');
const { getConfig } = require('../../core/greeting-helper');

function renderMainPanel(guildId) {
  const cfg = getConfig(guildId) || {};

  const joinChannel  = cfg.join_channel_id  ? `<#${cfg.join_channel_id}>`  : '*non défini*';
  const leaveChannel = cfg.leave_channel_id ? `<#${cfg.leave_channel_id}>` : '*non défini*';

  const joinSection =
    `${EMOJIS.join} **Arrivée**\n` +
    `Status : ${cfg.join_enabled  ? `${EMOJIS.on} **${LABELS.statusOn}**`  : `${EMOJIS.off} ${LABELS.statusOff}`}\n` +
    `Salon : ${joinChannel}\n` +
    `${EMOJIS.message} Message : ${cfg.join_message  ? '**Défini**' : '*par défaut*'}`;

  const leaveSection =
    `${EMOJIS.leave} **Départ**\n` +
    `Status : ${cfg.leave_enabled ? `${EMOJIS.on} **${LABELS.statusOn}**`  : `${EMOJIS.off} ${LABELS.statusOff}`}\n` +
    `Salon : ${leaveChannel}\n` +
    `${EMOJIS.message} Message : ${cfg.leave_message ? '**Défini**' : '*par défaut*'}`;

  const sectionSelect = new StringSelectMenuBuilder()
    .setCustomId('greeting:section:select')
    .setPlaceholder('Choisir une section à configurer…')
    .addOptions(
      { label: 'Arrivée', value: 'join',  description: 'Configurer les messages d\'arrivée', emoji: EMOJIS.join  },
      { label: 'Départ',  value: 'leave', description: 'Configurer les messages de départ',  emoji: EMOJIS.leave },
    );

  return buildPanel({
    title      : `${EMOJIS.bot} Configuration Greeting`,
    description: 'Paramétrez les arrivées et départs de votre serveur.',
    color      : COLORS.accent,
    sections   : [
      { label: '\u200b', value: joinSection  },
      { label: '\u200b', value: leaveSection },
    ],
    components: [new ActionRowBuilder().addComponents(sectionSelect)],
    footer     : 'Soulbot · Premium',
  });
}

function renderJoinPanel(guildId) {
  const cfg = getConfig(guildId) || {};
  const isOn = !!cfg.join_enabled;

  const channelLine = cfg.join_channel_id
    ? `${EMOJIS.channel} Salon : <#${cfg.join_channel_id}>`
    : `${EMOJIS.channel} Salon : *non défini*`;

  const messageLine = cfg.join_message
    ? `${EMOJIS.message} Message : **Défini**`
    : `${EMOJIS.message} Message : *par défaut*`;

  const row1 = new ActionRowBuilder().addComponents(
    buildToggleButton({ customId: 'greeting:join:toggle', isOn }),
    buttons.back('greeting:back'),
  );
  const row2 = new ActionRowBuilder().addComponents(
    selects.channel('greeting:join:channel', 'Sélectionner un salon d\'arrivée'),
  );
  const row3 = new ActionRowBuilder().addComponents(
    buttons.configure('greeting:join:message_modal', 'Configurer le message'),
    buttons.reset('greeting:join:reset'),
  );

  return buildPanel({
    title      : `${EMOJIS.join} Configuration — Arrivée`,
    description: 'Gérez les messages envoyés quand un membre rejoint.',
    color      : isOn ? COLORS.success : COLORS.accent,
    sections   : [
      {
        label: '\u200b',
        value: `**Status**\n${isOn ? `${EMOJIS.on} **${LABELS.statusOn}**` : `${EMOJIS.off} ${LABELS.statusOff}`}\n\n${channelLine}\n${messageLine}`,
      },
      { label: 'Variables disponibles', value: '`{user}` `{username}` `{server}` `{count}`' },
    ],
    components: [row1, row2, row3],
    footer     : 'Soulbot · Arrivée',
  });
}

function renderLeavePanel(guildId) {
  const cfg = getConfig(guildId) || {};
  const isOn = !!cfg.leave_enabled;

  const channelLine = cfg.leave_channel_id
    ? `${EMOJIS.channel} Salon : <#${cfg.leave_channel_id}>`
    : `${EMOJIS.channel} Salon : *non défini*`;

  const messageLine = cfg.leave_message
    ? `${EMOJIS.message} Message : **Défini**`
    : `${EMOJIS.message} Message : *par défaut*`;

  const row1 = new ActionRowBuilder().addComponents(
    buildToggleButton({ customId: 'greeting:leave:toggle', isOn }),
    buttons.back('greeting:back'),
  );
  const row2 = new ActionRowBuilder().addComponents(
    selects.channel('greeting:leave:channel', 'Sélectionner un salon de départ'),
  );
  const row3 = new ActionRowBuilder().addComponents(
    buttons.configure('greeting:leave:message_modal', 'Configurer le message'),
    buttons.reset('greeting:leave:reset'),
  );

  return buildPanel({
    title      : `${EMOJIS.leave} Configuration — Départ`,
    description: 'Gérez les messages envoyés quand un membre quitte.',
    color      : isOn ? COLORS.success : COLORS.accent,
    sections   : [
      {
        label: '\u200b',
        value: `**Status**\n${isOn ? `${EMOJIS.on} **${LABELS.statusOn}**` : `${EMOJIS.off} ${LABELS.statusOff}`}\n\n${channelLine}\n${messageLine}`,
      },
      { label: 'Variables disponibles', value: '`{user}` `{username}` `{server}` `{count}`' },
    ],
    components: [row1, row2, row3],
    footer     : 'Soulbot · Départ',
  });
}

module.exports = { renderMainPanel, renderJoinPanel, renderLeavePanel };
