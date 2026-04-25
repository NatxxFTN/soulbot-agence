'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// PREMIUM HELPERS — factories partagées pour la refonte visuelle Soulbot
// Utilisé par les 22 commandes Innovation / Role / Logs.
// Source : spec Nathan v2026-04-24 + déviation sur le bug V2-edit legacy.
// ═══════════════════════════════════════════════════════════════════════════

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');

const { e } = require('../../core/emojis');

const ACCENT = 0xFF0000;

/** Barre de progression ASCII 10 cases */
function progressBar(pct, width = 10) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Score → { emoji, label, colorHint } */
function scoreMeta(score) {
  if (score >= 80) return { emoji: '🟢', label: 'Excellent' };
  if (score >= 50) return { emoji: '🟡', label: 'Moyen' };
  return { emoji: '🔴', label: 'Problématique' };
}

/** Container de base — accent rouge Soulbot */
function newContainer() {
  return new ContainerBuilder().setAccentColor(ACCENT);
}

/** Ligne de séparation premium */
function separator(size = 'Small') {
  return new SeparatorBuilder().setSpacing(SeparatorSpacingSize[size] || SeparatorSpacingSize.Small);
}

/** Texte display rapide */
function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

/** Footer signature Soulbot */
function footerLine(category, extra = '') {
  const ts = Math.floor(Date.now() / 1000);
  return `-# Soulbot • ${category} • <t:${ts}:f>${extra ? ' • ' + extra : ''}`;
}

/**
 * Panel header : titre avec emoji + sous-titre optionnel.
 * Le container reçoit déjà l'accent rouge Soulbot.
 */
function buildHeader(container, { emojiKey, title, subtitle }) {
  const emo = emojiKey ? (e(emojiKey) || '') : '';
  container.addTextDisplayComponents(
    text(`# ${emo} ${title}${subtitle ? `\n${subtitle}` : ''}`.trim()),
  );
  container.addSeparatorComponents(separator('Small'));
  return container;
}

/**
 * Section "hero" avec grand score et barre de progression.
 */
function buildHeroScore(container, { score, label }) {
  const m = scoreMeta(score);
  container.addTextDisplayComponents(
    text(
      `## ${m.emoji} Score global : **${score}/100**\n` +
      `\`${progressBar(score)}\` · *${m.label}*` +
      (label ? `\n${label}` : ''),
    ),
  );
  container.addSeparatorComponents(separator('Small'));
  return container;
}

/**
 * Section avec titre scoré et findings (array de lignes).
 */
function buildScoreSection(container, { sectionEmoji = '', title, score, findings }) {
  const m = scoreMeta(score);
  const body = (findings || []).slice(0, 6).map(f => `${f}`).join('\n');
  container.addTextDisplayComponents(
    text(
      `### ${m.emoji} ${sectionEmoji} ${title} — **${score}/100**\n${body}`.trim(),
    ),
  );
  container.addSeparatorComponents(separator('Small'));
  return container;
}

/**
 * Footer signature + scoring legend.
 */
function buildFooter(container, category, { withLegend = false } = {}) {
  if (withLegend) {
    container.addTextDisplayComponents(
      text(`-# 🔴 < 50 · 🟡 50–80 · 🟢 > 80 · ${footerLine(category).slice(3)}`),
    );
  } else {
    container.addTextDisplayComponents(text(footerLine(category)));
  }
  return container;
}

/**
 * Panel de confirmation destructive : warning + details + 2 boutons.
 * @param {Object} opts
 * @param {string} opts.title      — ex "Supprimer le rôle Admin"
 * @param {string} opts.warning    — ex "Cette action est irréversible."
 * @param {string} opts.details    — ex "42 membres le portent."
 * @param {string} opts.actionId   — racine customId, ex "role:delete:42"
 * @param {string} [opts.category] — footer signature (défaut "Soulbot")
 * @param {string} [opts.confirmLabel]
 * @returns {{ flags:number, components:Array }}
 */
function buildConfirmPanel({ title, warning, details, actionId, category = 'Soulbot', confirmLabel = 'Confirmer' }) {
  const container = newContainer();
  buildHeader(container, { emojiKey: 'btn_flag', title });

  container.addTextDisplayComponents(text(`> ${warning}`));
  container.addSeparatorComponents(separator('Small'));

  if (details) {
    container.addTextDisplayComponents(text(`## ${e('btn_tip') || 'ℹ️'} Ce qui va se passer\n\n${details}`));
    container.addSeparatorComponents(separator('Small'));
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${actionId}:confirm`)
      .setLabel(confirmLabel)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${actionId}:cancel`)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary),
  );

  container.addActionRowComponents(row);

  container.addTextDisplayComponents(
    text(`-# Timeout 30s · ${footerLine(category).slice(3)}`),
  );

  return { flags: MessageFlags.IsComponentsV2, components: [container] };
}

/**
 * Embed premium — succès.
 * Color = 0xFF0000 rouge signature (accent Soulbot), pas vert générique.
 */
function successEmbed({ title, description, fields = [], user, category = 'Soulbot' }) {
  const emb = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(`${e('btn_success') || '✅'} ${title}`)
    .setTimestamp();

  if (description) emb.setDescription(description);
  if (fields.length) emb.addFields(fields);

  if (user) {
    emb.setFooter({
      text    : `Soulbot • ${category} • ${user.username}`,
      iconURL : user.displayAvatarURL?.({ size: 64 }) ?? undefined,
    });
  } else {
    emb.setFooter({ text: `Soulbot • ${category}` });
  }

  return emb;
}

/**
 * Embed premium — erreur.
 * Color = 0xFF0000 (cohérence rouge signature).
 */
function errorEmbed({ title, description, category = 'Soulbot' }) {
  return new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(`${e('btn_error') || '❌'} ${title}`)
    .setDescription(description || null)
    .setTimestamp()
    .setFooter({ text: `Soulbot • ${category}` });
}

/**
 * Embed premium — warning.
 */
function warningEmbed({ title, description, fields = [], category = 'Soulbot' }) {
  const emb = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(`${e('btn_flag') || '⚠️'} ${title}`)
    .setTimestamp()
    .setFooter({ text: `Soulbot • ${category}` });
  if (description) emb.setDescription(description);
  if (fields.length) emb.addFields(fields);
  return emb;
}

/**
 * Embed premium — info (neutre, rouge signature).
 */
function infoEmbed({ title, description, fields = [], thumbnail, category = 'Soulbot' }) {
  const emb = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(`${e('btn_tip') || 'ℹ️'} ${title}`)
    .setTimestamp()
    .setFooter({ text: `Soulbot • ${category}` });
  if (description) emb.setDescription(description);
  if (fields.length) emb.addFields(fields);
  if (thumbnail) emb.setThumbnail(thumbnail);
  return emb;
}

/**
 * Wrapper final qui enveloppe un container dans le payload Discord.
 * Par convention, tous les renders de panels V2 retournent un objet
 * directement utilisable dans `message.reply(...)` / `interaction.update(...)`.
 */
function toV2Payload(container, { allowedRepliedPing = false } = {}) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { repliedUser: allowedRepliedPing },
  };
}

const STATUS_META = {
  success: { emoji: '✅', emojiKey: 'btn_success' },
  error  : { emoji: '❌', emojiKey: 'btn_error' },
  warning: { emoji: '⚠️', emojiKey: 'btn_flag' },
  info   : { emoji: 'ℹ️', emojiKey: 'btn_tip' },
};

/**
 * Panel V2 de statut — utilisé quand on doit mettre à jour un message V2
 * existant (interaction.update / prompt.edit sur un container V2).
 * Évite le bug MESSAGE_CANNOT_USE_LEGACY_FIELDS_WITH_COMPONENTS_V2.
 */
function statusV2Panel({ status = 'info', title, description, fields = [], category = 'Soulbot' }) {
  const meta = STATUS_META[status] || STATUS_META.info;
  const container = newContainer();
  buildHeader(container, { emojiKey: meta.emojiKey, title });

  if (description) container.addTextDisplayComponents(text(description));

  if (fields.length) {
    container.addSeparatorComponents(separator('Small'));
    const body = fields.map(f => `• **${f.name} :** ${f.value}`).join('\n');
    container.addTextDisplayComponents(text(body));
  }

  container.addTextDisplayComponents(text(footerLine(category)));
  return toV2Payload(container);
}

/**
 * Helper simple pour les commandes rapides qui veulent juste un embed en reply.
 */
function toEmbedReply(embed, { allowedRepliedPing = false } = {}) {
  return {
    embeds: [embed],
    allowedMentions: { repliedUser: allowedRepliedPing },
  };
}

module.exports = {
  ACCENT,
  progressBar,
  scoreMeta,
  newContainer,
  separator,
  text,
  footerLine,
  buildHeader,
  buildHeroScore,
  buildScoreSection,
  buildFooter,
  buildConfirmPanel,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  toV2Payload,
  toEmbedReply,
  statusV2Panel,
};
