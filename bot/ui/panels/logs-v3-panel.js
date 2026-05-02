'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// LOGS V3 PANEL — Hub central spectaculaire
// Components V2, accent 0xFF0000, emoji cat_innovation atome
// ═══════════════════════════════════════════════════════════════════════════

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');

const {
  newContainer, separator, text, buildHeader, toV2Payload,
} = require('./_premium-helpers');

const { e } = require('../../core/emojis');
const V3 = require('../../core/logs-v3-helper');

const GROUP_EMOJIS = {
  messages  : '💬',
  members   : '👥',
  roles     : '🎭',
  channels  : '📂',
  voice     : '🎤',
  server    : '⚙️',
  moderation: '🛡️',
};

function _progressBar(pct, width = 20) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Rend le panel principal ;logs V3.
 * @param {import('discord.js').Guild} guild
 */
function renderLogsV3Panel(guild) {
  const config = V3.getConfig(guild.id);
  const stats  = V3.getStatsToday(guild.id);
  const container = newContainer();

  // ── HEADER ──────────────────────────────────────────────────────────
  buildHeader(container, {
    emojiKey : 'cat_innovation',
    title    : 'LOGS V3  ·  Soulbot Ultimate',
    subtitle : '-# Le système de logs Discord le plus avancé',
  });

  // ── STATUS ──────────────────────────────────────────────────────────
  const globalEmoji = config.global_enabled ? '🟢' : '🔴';
  const statusText  = config.global_enabled ? 'Actif' : 'Désactivé';
  const chanLine    = config.default_channel_id
    ? `<#${config.default_channel_id}>`
    : '*non configuré — tape* `;logssetup`';
  const verBadge    = config.version === 'v3' ? '**V3** ✨' : `${config.version} · *migration via* \`;logssetup\``;

  container.addTextDisplayComponents(
    text(
      `## ${e('ui_git') || '📍'} STATUS\n` +
      `${globalEmoji} Système **${statusText}** · **${Object.keys(V3.EVENT_TYPES).length}** events disponibles\n` +
      `${e('ui_chat') || '📺'} Salon par défaut : ${chanLine}\n` +
      `${e('cat_smiley') || '🎨'} Thème : **${config.theme}**\n` +
      `${e('btn_tip') || '📋'} Version : ${verBadge}`,
    ),
  );
  container.addSeparatorComponents(separator('Small'));

  // ── ACTIVITÉ 24H ────────────────────────────────────────────────────
  const total24h = stats.total || 0;
  // barre normalisée : 50 events = 20/20 bar
  const pct = Math.min(100, Math.round((total24h / 50) * 100));
  const bar = _progressBar(pct);

  let activityBlock = `## 📊 ACTIVITÉ 24H\n\`${bar}\` **${total24h}** events\n`;
  if (stats.topEvents.length) {
    activityBlock += `\n**Top ${Math.min(3, stats.topEvents.length)} events :**\n`;
    activityBlock += stats.topEvents.slice(0, 3).map((ev, i) => {
      const meta = V3.EVENT_TYPES[ev.event_type];
      const icon = meta?.icon || '•';
      const label = meta?.label || ev.event_type;
      return `\`${i + 1}.\` ${icon} ${label} — **${ev.count}**`;
    }).join('\n');
  } else {
    activityBlock += `\n*Aucun event enregistré aujourd'hui.*`;
  }

  container.addTextDisplayComponents(text(activityBlock));
  container.addSeparatorComponents(separator('Small'));

  // ── GROUPES D'EVENTS ────────────────────────────────────────────────
  let groupsBlock = `## 📦 GROUPES D'EVENTS\n`;
  for (const group of V3.EVENT_GROUPS) {
    const groupEvents = Object.entries(V3.EVENT_TYPES).filter(([, v]) => v.group === group);
    const activeCount = groupEvents.filter(([k]) => V3.isEventEnabled(guild.id, k)).length;
    const total = groupEvents.length;
    const dots  = '●'.repeat(activeCount) + '○'.repeat(total - activeCount);
    const label = group.charAt(0).toUpperCase() + group.slice(1);
    groupsBlock += `${GROUP_EMOJIS[group]} **${label}** · \`${dots}\` · ${activeCount}/${total}\n`;
  }

  container.addTextDisplayComponents(text(groupsBlock));
  container.addSeparatorComponents(separator('Small'));

  // ── BOUTONS ──────────────────────────────────────────────────────────
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('logs:action:setup')
      .setLabel('Setup auto')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setCustomId('logs:action:preset')
      .setLabel('Presets')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📁'),
    new ButtonBuilder()
      .setCustomId('logs:action:theme')
      .setLabel('Thème')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎨'),
    new ButtonBuilder()
      .setCustomId('logs:action:stats')
      .setLabel('Stats')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📊'),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('logs:action:groups')
      .setLabel('Groupes')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📦'),
    new ButtonBuilder()
      .setCustomId('logs:action:filters')
      .setLabel('Filtres')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔍'),
    new ButtonBuilder()
      .setCustomId('logs:action:export')
      .setLabel('Export')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💾'),
    new ButtonBuilder()
      .setCustomId('logs:action:toggle_global')
      .setLabel(config.global_enabled ? 'Désactiver' : 'Activer')
      .setStyle(config.global_enabled ? ButtonStyle.Danger : ButtonStyle.Success)
      .setEmoji(config.global_enabled ? '🔴' : '🟢'),
  );

  container.addActionRowComponents(row1);
  container.addActionRowComponents(row2);

  container.addSeparatorComponents(separator('Small'));

  // ── COMMANDES ────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    text(
      `## 📚 COMMANDES\n` +
      `\`;logs\` — Ce panel\n` +
      `\`;logssetup\` — Créer salons + config auto\n` +
      `\`;logsstatus\` — Aperçu compact\n` +
      `\`;logstoggle <event>\` — Activer/désactiver un event\n` +
      `\`;logsset <#salon>\` — Changer salon par défaut\n` +
      `\`;logsview\` — Voir derniers logs (ring buffer)\n` +
      `\`;logstest <event>\` — Simuler un event pour tester\n` +
      `\`;logsreset\` — Reset complet (avec confirmation)\n` +
      `\`;logshelp\` — Guide complet`,
    ),
  );
  container.addSeparatorComponents(separator('Small'));

  // ── NOTES ────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    text(
      `## ℹ️ NOTES\n` +
      `• **${Object.keys(V3.EVENT_TYPES).length} events** au total\n` +
      `• Tous actifs par défaut sauf 💬 \`message_create\` (anti-spam)\n` +
      `• Pour activer message_create : \`;logstoggle message_create\``,
    ),
  );

  // ── FOOTER ──────────────────────────────────────────────────────────
  const pkg = require('../../../package.json');
  container.addTextDisplayComponents(
    text(`-# Soulbot v${pkg.version} · Logs V3 Ultimate · <t:${Math.floor(Date.now() / 1000)}:t>`),
  );

  return toV2Payload(container);
}

module.exports = { renderLogsV3Panel };
