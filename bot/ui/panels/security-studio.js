'use strict';

// ═══════════════════════════════════════════════
// SECURITY STUDIO — V5 (panel hub)
// Rendu CV2 exclusif · accent ROUGE 0xFF0000 · zéro emoji Unicode
// (tout passe par e()/forButton() — règle Soulbot).
// Étape 1 : le HUB (vue d'ensemble 15 modules + toggle rapide).
// Les vues module détaillées arrivent aux étapes 2-4.
// customId : security:<section>:<action>[:arg]
// ═══════════════════════════════════════════════

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const registry = require('../../core/security-registry');
const storage = require('../../core/security-storage');
const { buildSocState } = require('../../core/soc-state');
const { SOC_POSTURE } = require('../theme');

const ACCENT = 0xFF0000; // rouge — confirmations destructives, toujours

const FEED_SIZE = 8;

// Feed terminal — bloc code monospace, vrai look SOC.
function _buildFeed(guildId) {
  const logs = storage.getRecentLogs(guildId, FEED_SIZE);
  if (!logs.length) return '— aucun incident enregistré —';
  return logs.map(l => {
    const t = new Date(l.triggered_at).toLocaleTimeString('fr-FR', { hour12: false });
    const mod = (l.feature || '?').toUpperCase().padEnd(14).slice(0, 14);
    const who = `…${String(l.user_id).slice(-5)}`;
    return `[${t}] ${mod} ${who}  ${String(l.action_taken || '').toUpperCase()}`;
  }).join('\n');
}

const CAT_TITLES = {
  messages: 'Protections de messages',
  joins   : 'Protections d\'arrivées',
  server  : 'Protections serveur',
};

function _statusLine(mod) {
  const state = mod.enabled ? e('btn_success') : e('btn_error');
  const sanction = mod.enabled ? ` · \`${mod.sanctionLabel}\`` : '';
  return `${state} ${e(mod.emoji)} **${mod.label}** — ${mod.desc}${sanction}`;
}

/**
 * HUB principal — console SOC : posture live, feed terminal, dock d'urgence.
 * @param {{withImage?: boolean, state?: object}} [opts]
 *   withImage : dashboard PNG joint sous attachment://soc.png (2A)
 *   state : SocState pré-calculé par soc-image (évite un double build)
 * L'ACCENT DU CONTAINER SUIT LA POSTURE (2B) : vert SECURE · ambre
 * ELEVATED · rouge BREACH. Budget ≈ 28 composants avec image (limite 40).
 */
function renderHub(guild, opts = {}) {
  const ov = registry.getOverview(guild.id);
  const state = opts.state ?? buildSocState(guild);
  const posture = SOC_POSTURE[state.posture] ?? SOC_POSTURE.BREACH;
  const container = new ContainerBuilder().setAccentColor(posture.accent);

  // ── Dashboard image (Defense Grid) ────────────────────────────────────
  if (opts.withImage) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://soc.png'),
      ),
    );
  }

  // ── Header + état global ──────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('cat_protection')} **SECURITY STUDIO — V5**`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('cat_information')} Posture **${posture.label}** · Score **${state.score}/100** · DEFCON **${state.defconLabel}** · ` +
      `**${state.blockedTotal}** menace(s) bloquée(s)\n` +
      `${e('cat_protection')} **${ov.activeCount}/${ov.totalCount}** protections actives · ` +
      `${e('ui_lock')} Vault : ${ov.whitelist.users} users · ${ov.whitelist.roles} rôles · ${ov.whitelist.channels} salons`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Feed terminal (2B) ────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('```\n' + _buildFeed(guild.id) + '\n```'),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Sections par catégorie ────────────────────────────────────────────
  for (const cat of ['messages', 'joins', 'server']) {
    const mods = ov.modules.filter(m => m.cat === cat);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**${CAT_TITLES[cat]}**\n` + mods.map(_statusLine).join('\n'),
      ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // ── Select : toggle rapide ────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security:hub:toggle')
        .setPlaceholder('Activer / Désactiver une protection')
        .addOptions(ov.modules.map(m => ({
          label      : `${m.enabled ? 'ON' : 'OFF'} · ${m.label}`,
          description: m.desc.slice(0, 100),
          value      : m.key,
          emoji      : forButton(m.enabled ? 'btn_success' : 'btn_error'),
        }))),
    ),
  );

  // ── Select : ouvrir un module ─────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security:hub:open')
        .setPlaceholder('Configurer un module en détail')
        .addOptions(ov.modules.map(m => ({
          label      : m.label,
          description: m.desc.slice(0, 100),
          value      : m.key,
          emoji      : forButton(m.emoji),
        }))),
    ),
  );

  // ── Dock d'urgence (2B) — chaque bouton ouvre une confirmation rouge ──
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:dock:lockdown')
        .setEmoji(forButton('ui_lock')).setLabel('LOCKDOWN').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('security:dock:panic')
        .setEmoji(forButton('btn_error')).setLabel('PANIC').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('security:dock:quarantine')
        .setEmoji(forButton('ui_user')).setLabel('QUARANTINE').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('security:dock:scan')
        .setEmoji(forButton('btn_search')).setLabel('SCAN').setStyle(ButtonStyle.Secondary),
    ),
  );

  // ── Actions globales ──────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:hub:refresh')
        .setEmoji(forButton('btn_home')).setLabel('Actualiser').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('security:hub:staffrole')
        .setEmoji(forButton('ui_lock')).setLabel('Protéger un rôle (staff)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('security:hub:disableall')
        .setEmoji(forButton('btn_error')).setLabel('Tout désactiver').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('security:hub:help')
        .setEmoji(forButton('btn_help')).setLabel('Aide').setStyle(ButtonStyle.Secondary),
    ),
  );

  return container;
}

/**
 * Panel de confirmation — action destructive « Tout désactiver ».
 * Règle Soulbot : confirmation OBLIGATOIRE avant toute action de masse.
 */
function renderDisableAllConfirm(guild) {
  const ov = registry.getOverview(guild.id);
  const container = new ContainerBuilder().setAccentColor(ACCENT);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('btn_error')} **Tout désactiver — confirmation requise**`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Tu es sur le point de désactiver **${ov.activeCount}** protection(s) active(s) ` +
      `sur **${guild.name}**.\n` +
      `${e('btn_tip')} Le serveur ne sera plus protégé tant que tu ne les réactives pas.`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:confirm:disableall:yes')
        .setEmoji(forButton('btn_error')).setLabel('Oui, tout désactiver').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('security:confirm:disableall:no')
        .setEmoji(forButton('btn_prev')).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    ),
  );

  return container;
}

/** Confirmation LOCKDOWN — verrouiller/déverrouiller tous les salons texte. */
function renderLockdownConfirm(guild) {
  const container = new ContainerBuilder().setAccentColor(ACCENT);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ui_lock')} **LOCKDOWN — confirmation requise**`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Verrouiller** : retire l'écriture à @everyone sur TOUS les salons texte de **${guild.name}**.\n` +
      `**Déverrouiller** : restaure les salons verrouillés par le dernier lockdown.\n` +
      `${e('btn_tip')} Réponse raid — les salons restent visibles, l'écriture est coupée.`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:confirm:lockdown:lock')
        .setEmoji(forButton('ui_lock')).setLabel('Verrouiller').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('security:confirm:lockdown:unlock')
        .setEmoji(forButton('ui_unlock')).setLabel('Déverrouiller').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('security:confirm:lockdown:no')
        .setEmoji(forButton('btn_prev')).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    ),
  );
  return container;
}

/** Confirmation PANIC — arme tout + DEFCON HAUT. */
function renderPanicConfirm(guild) {
  const ov = registry.getOverview(guild.id);
  const off = ov.totalCount - ov.activeCount;
  const container = new ContainerBuilder().setAccentColor(ACCENT);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('btn_error')} **PANIC — confirmation requise**`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Arme **les ${ov.totalCount} protections** (${off} actuellement désarmée(s)) et passe **DEFCON HAUT**.\n` +
      `${e('btn_tip')} Les sanctions configurées s'appliquent immédiatement à tout le serveur (hors vault).`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:confirm:panic:yes')
        .setEmoji(forButton('btn_error')).setLabel('PANIC — tout armer').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('security:confirm:panic:no')
        .setEmoji(forButton('btn_prev')).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    ),
  );
  return container;
}

module.exports = {
  renderHub, renderDisableAllConfirm,
  renderLockdownConfirm, renderPanicConfirm,
  ACCENT,
};
