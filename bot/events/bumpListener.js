'use strict';

// ── Bump Listener — détecte les bumps Disboard (bot ID 302050872383242240) ───
// On NE lance PAS le bump — on observe seulement la réponse de Disboard
// pour comptabiliser et démarrer le timer de rappel de 2h.

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../core/emojis');
const storage = require('../core/bump-storage');

const DISBOARD_BOT_ID  = '302050872383242240';
const BUMP_COOLDOWN_MS = storage.BUMP_COOLDOWN_MS;

const SUCCESS_PATTERNS = [
  'bump effectué',
  'bump done',
  'bump réalisé',
  'bumpé avec succès',
  'thx for bumping',
];

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client) {
    // ── Filtrage rapide ────────────────────────────────────────────────────
    if (message.author?.id !== DISBOARD_BOT_ID) return;
    if (!message.guild) return;

    // Récupération du contenu (embed obligatoire chez Disboard)
    const embed = message.embeds?.[0];
    if (!embed) return;

    const content = `${embed.description || ''} ${embed.title || ''}`.toLowerCase();
    const isBumpSuccess = SUCCESS_PATTERNS.some(p => content.includes(p));
    if (!isBumpSuccess) return;

    // ── Qui a bump ? ───────────────────────────────────────────────────────
    // Disboard utilise une slash command → message.interaction.user
    // En fallback, on tente interactionMetadata (discord.js v14+)
    const bumpUser =
      message.interaction?.user ||
      message.interactionMetadata?.user ||
      null;

    if (!bumpUser) return;

    // ── Config guilde ──────────────────────────────────────────────────────
    const config = storage.getConfig(message.guild.id);
    if (!config || !config.enabled) return;

    // ── Enregistrement ─────────────────────────────────────────────────────
    storage.recordBump(message.guild.id, bumpUser.id, message.channel.id);

    // ── Accusé de réception stylé ──────────────────────────────────────────
    try {
      const nextTs = Math.floor((Date.now() + BUMP_COOLDOWN_MS) / 1000);

      const container = new ContainerBuilder().setAccentColor(0xFF0000);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ani_diamond')} **Bump enregistré !** ${e('ani_diamond')}`,
        ),
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('ui_user')} Bump par : <@${bumpUser.id}>\n` +
          `${e('btn_tip')} Prochain bump : <t:${nextTs}:R>\n` +
          `${e('btn_success')} Tu seras notifié automatiquement.`,
        ),
      );

      await message.channel.send({
        components: [container],
        flags     : MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('[bump-listener] send:', err.message);
    }
  },
};
