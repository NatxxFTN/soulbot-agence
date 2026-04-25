'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT PANEL — Showcase premium Soulbot
// Components V2 avec hero score, 6 sections thématiques, recommandations
// priorisées et boutons d'action.
// ═══════════════════════════════════════════════════════════════════════════

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const {
  newContainer, separator, text, buildHeader, buildHeroScore,
  buildScoreSection, scoreMeta, toV2Payload,
} = require('./_premium-helpers');

const { e } = require('../../core/emojis');

// Mapping section id → emoji thématique + label enrichi
const SECTION_META = {
  config   : { emoji: '🛡️', niceLabel: 'Sécurité Discord' },
  roles    : { emoji: '📜', niceLabel: 'Rôles' },
  channels : { emoji: '📂', niceLabel: 'Salons' },
  members  : { emoji: '👥', niceLabel: 'Membres' },
  emojis   : { emoji: '🎨', niceLabel: 'Emojis' },
  security : { emoji: '🔗', niceLabel: 'Intégrations' },
};

/** Extrait les 3 findings les plus "critiques" pour les recommandations. */
function topRecommendations(sections) {
  const all = [];
  for (const sec of sections) {
    for (const f of sec.findings) {
      if (f.startsWith('🔴') || f.startsWith('⚠️')) {
        all.push({ section: sec.title, finding: f });
      }
    }
  }
  return all.slice(0, 3);
}

/**
 * Rend le rapport d'audit en Components V2 premium.
 * @param {import('discord.js').Guild} guild
 * @param {{globalScore:number, sections:{id,title,score,findings[]}[]}} report
 */
function renderAuditPanel(guild, report) {
  const container = newContainer();

  // ── Header ───────────────────────────────────────────────────────────
  buildHeader(container, {
    emojiKey : 'btn_search',
    title    : `Audit Serveur — ${guild.name}`,
    subtitle : `**${guild.memberCount}** membres · Boost tier **${guild.premiumTier ?? 0}** · <t:${Math.floor(Date.now() / 1000)}:f>`,
  });

  // ── Hero score global ────────────────────────────────────────────────
  const gl = scoreMeta(report.globalScore);
  buildHeroScore(container, {
    score : report.globalScore,
    label : gl.label === 'Excellent' ? '*Serveur bien sécurisé.*'
          : gl.label === 'Moyen' ? '*Améliorations recommandées.*'
          : '*Actions correctives nécessaires.*',
  });

  // ── 6 sections détaillées ────────────────────────────────────────────
  for (const sec of report.sections) {
    const meta = SECTION_META[sec.id] || { emoji: '•', niceLabel: sec.title };
    buildScoreSection(container, {
      sectionEmoji : meta.emoji,
      title        : meta.niceLabel,
      score        : sec.score,
      findings     : sec.findings,
    });
  }

  // ── Recommandations priorisées (top 3 critiques) ────────────────────
  const recs = topRecommendations(report.sections);
  if (recs.length) {
    container.addTextDisplayComponents(
      text(
        `### ${e('btn_tip') || '💡'} Top ${recs.length} action(s) à mener\n` +
        recs.map((r, i) => `\`${i + 1}.\` **${r.section}** — ${r.finding}`).join('\n'),
      ),
    );
    container.addSeparatorComponents(separator('Small'));
  }

  // ── Boutons d'action ─────────────────────────────────────────────────
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('innovation:audit:refresh')
      .setLabel('Re-auditer')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔄'),
    new ButtonBuilder()
      .setCustomId('innovation:audit:export')
      .setLabel('Export JSON')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋'),
  );
  container.addActionRowComponents(row);

  // ── Footer signature ─────────────────────────────────────────────────
  container.addTextDisplayComponents(
    text(`-# 🔴 < 50 · 🟡 50–80 · 🟢 > 80 · Soulbot • Innovation • Audit v1.0`),
  );

  return toV2Payload(container);
}

module.exports = { renderAuditPanel };
