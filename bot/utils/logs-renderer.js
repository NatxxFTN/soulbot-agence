'use strict';

// ═══════════════════════════════════════════════
// LOGS RENDERER V4 — v2.1.2
// Rendu centralisé des logs sécurité (table security_logs).
// renderLogEntry : embed individuel pour les canaux de logs.
// renderLogsPanel : panel filtrable (feature + sévérité) et paginé,
// avec export CSV — consommé par ;securitylogs.
// ═══════════════════════════════════════════════

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { e, forButton } = require('../core/emojis');
const { footer } = require('./response-builder');
const { FEATURE_LABELS, ACTION_LABELS } = require('../core/security-punishments');

// Couleur par gravité de l'action prise — le rouge identitaire reste
// la couleur des panels (préférence Nathan), ici c'est SÉMANTIQUE.
const SEVERITY_BY_ACTION = {
  none   : 'info',    delete : 'info',
  warn   : 'warning', timeout: 'warning', mute_5m: 'warning', mute_1h: 'warning',
  kick   : 'danger',  ban    : 'critical',
  scan   : 'info',    restore: 'info',    mass_kick: 'danger', mass_ban: 'critical',
};
const LOG_COLORS = {
  info    : 0x5865F2,
  warning : 0xFF8800,
  danger  : 0xFF3333,
  critical: 0x8B0000,
};

const FEATURE_EMOJI = {
  antilink: 'ui_git', antiinvite: 'ui_mail', antieveryone: 'ui_alert',
  antimention: 'ui_members', antispam: 'ui_antispam', antileak: 'ui_antileak',
  antiraid: 'cat_protection', antibot: 'cat_protection', antiwords: 'ui_chat',
  anticaps: 'ui_speaker', antiduplicate: 'ui_chat', antiemojispam: 'ui_smiley',
  antinewaccount: 'ui_user', softmute: 'ui_lock', globalblacklist: 'ui_nuke',
  scanmembers: 'btn_search',
};

function severityOf(log) {
  return SEVERITY_BY_ACTION[log.action_taken] ?? 'info';
}

// triggered_at est stocké en MILLISECONDES (Date.now() dans security-storage)
function tsSec(log) {
  return Math.floor(log.triggered_at / 1000);
}

/**
 * Embed individuel d'un log sécurité — pour les canaux de logs.
 * @param {{user_id, feature, action_taken, message_content, channel_id, triggered_at}} log
 */
function renderLogEntry(log) {
  const severity = severityOf(log);
  const featLabel = FEATURE_LABELS[log.feature] ?? log.feature;
  const actLabel  = ACTION_LABELS[log.action_taken] ?? log.action_taken;

  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS[severity])
    .setTitle(`${e(FEATURE_EMOJI[log.feature] ?? 'ui_pin')} ${featLabel} — ${actLabel}`)
    .addFields(
      { name: 'Cible',  value: `<@${log.user_id}>`,                                        inline: true },
      { name: 'Salon',  value: log.channel_id ? `<#${log.channel_id}>` : '—',              inline: true },
      { name: 'Quand',  value: `<t:${tsSec(log)}:R>`,                                      inline: true },
    )
    .setFooter(footer())
    .setTimestamp(new Date(log.triggered_at));

  if (log.message_content) {
    embed.addFields({ name: 'Contenu', value: log.message_content.slice(0, 1000), inline: false });
  }
  return embed;
}

/**
 * Panel logs filtrable + paginé.
 * @param {Array} logs - lignes security_logs (déjà triées DESC)
 * @param {{page?: number, perPage?: number, filterFeature?: ?string, filterSeverity?: ?string}} options
 * @returns {{ embeds, components, filtered }} (+ filtered pour l'export CSV)
 */
function renderLogsPanel(logs, options = {}) {
  const { page = 1, perPage = 8, filterFeature = null, filterSeverity = null } = options;

  let filtered = logs;
  if (filterFeature)  filtered = filtered.filter(l => l.feature === filterFeature);
  if (filterSeverity) filtered = filtered.filter(l => severityOf(l) === filterSeverity);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const cur = Math.min(Math.max(1, page), totalPages);
  const pageItems = filtered.slice((cur - 1) * perPage, cur * perPage);

  const lines = pageItems.map(l =>
    `${e(FEATURE_EMOJI[l.feature] ?? 'ui_pin')} **${FEATURE_LABELS[l.feature] ?? l.feature}** · ` +
    `\`${l.action_taken}\` · <@${l.user_id}> · <t:${tsSec(l)}:R>`,
  );

  const embed = new EmbedBuilder()
    .setColor(0xB600A8)
    .setTitle(`${e('ui_pin')} Logs sécurité — V4`)
    .setDescription(lines.join('\n') || '*Aucun log avec ces filtres.*')
    .addFields({
      name: 'Statistiques',
      value: `Total filtré : **${filtered.length}** / ${logs.length} · Page **${cur}/${totalPages}**`,
      inline: false,
    })
    .setFooter(footer());

  // Filtres dynamiques — features réellement présentes dans les logs
  const presentFeatures = [...new Set(logs.map(l => l.feature))].slice(0, 24);
  const featureSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('seclogs:feature')
      .setPlaceholder('Filtrer par module…')
      .addOptions([
        { label: 'Tous les modules', value: 'all', default: !filterFeature },
        ...presentFeatures.map(f => ({
          label: FEATURE_LABELS[f] ?? f, value: f, default: filterFeature === f,
        })),
      ]),
  );
  const severitySelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('seclogs:severity')
      .setPlaceholder('Filtrer par gravité…')
      .addOptions([
        { label: 'Toutes gravités', value: 'all', default: !filterSeverity },
        { label: 'Info',     value: 'info',     default: filterSeverity === 'info' },
        { label: 'Warning',  value: 'warning',  default: filterSeverity === 'warning' },
        { label: 'Danger',   value: 'danger',   default: filterSeverity === 'danger' },
        { label: 'Critical', value: 'critical', default: filterSeverity === 'critical' },
      ]),
  );
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`seclogs:page:${cur - 1}`).setEmoji(forButton('btn_prev')).setStyle(ButtonStyle.Secondary).setDisabled(cur === 1),
    new ButtonBuilder().setCustomId('seclogs:refresh').setLabel('Actualiser').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`seclogs:page:${cur + 1}`).setEmoji(forButton('btn_next')).setStyle(ButtonStyle.Secondary).setDisabled(cur === totalPages),
    new ButtonBuilder().setCustomId('seclogs:export').setLabel('Exporter CSV').setStyle(ButtonStyle.Success),
  );

  return { embeds: [embed], components: [featureSelect, severitySelect, navRow], filtered };
}

/** CSV des logs (pour le bouton Exporter). */
function logsToCsv(logs) {
  return ['id,feature,action,user_id,channel_id,timestamp,content']
    .concat(logs.map(l =>
      `${l.id},${l.feature},${l.action_taken},${l.user_id},${l.channel_id ?? ''},${l.triggered_at},"${(l.message_content ?? '').replace(/"/g, '""').slice(0, 200)}"`,
    ))
    .join('\n');
}

module.exports = { renderLogEntry, renderLogsPanel, logsToCsv, LOG_COLORS, severityOf };
