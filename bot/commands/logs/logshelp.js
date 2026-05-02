'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// ;logshelp — Guide complet du système Logs V3
// Components V2 — accent rouge Soulbot — pas d'interaction (pure doc)
// ═══════════════════════════════════════════════════════════════════════════

const V3 = require('../../core/logs-v3-helper');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
} = require('../../ui/panels/_premium-helpers');

// Mapping group sémantique des EVENT_TYPES → emoji + label panel
const PANEL_GROUPS = [
  { key: 'messages',   icon: '💬', label: 'Messages' },
  { key: 'members',    icon: '👥', label: 'Membres' },
  { key: 'roles',      icon: '🎭', label: 'Rôles' },
  { key: 'channels',   icon: '📂', label: 'Salons' },
  { key: 'voice',      icon: '🎤', label: 'Vocal' },
  { key: 'server',     icon: '⚙️', label: 'Serveur' },
  { key: 'moderation', icon: '🛡️', label: 'Modération' },
];

module.exports = {
  name       : 'logshelp',
  aliases    : ['logsguide', 'loghelp', 'logsinfo'],
  description: 'Guide complet du système de logs V3 (commandes, events, astuces, FAQ).',
  usage      : ';logshelp',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    const container = newContainer();

    buildHeader(container, {
      emojiKey : 'cat_innovation',
      title    : 'LOGS V3 — Guide complet',
      subtitle : `**${Object.keys(V3.EVENT_TYPES).length} events** · Components V2 · Cache mémoire`,
    });

    // ── COMMANDES PRINCIPALES ─────────────────────────────────────────
    container.addTextDisplayComponents(
      text(
        `## 🚀 Commandes principales\n` +
        `\`;logs\` — Panel central (status, activité 24h, actions rapides)\n` +
        `\`;logssetup\` — Setup auto : crée la catégorie + 7 salons + routing complet\n` +
        `\`;logsstatus\` — Vue compacte (events actifs, dernier event, top du jour)\n` +
        `\`;logstoggle <event>\` — Active/désactive un event\n` +
        `\`;logstoggle all on|off\` — Tout active/désactive d'un coup`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    // ── COMMANDES AVANCÉES ────────────────────────────────────────────
    container.addTextDisplayComponents(
      text(
        `## ⚙️ Commandes avancées\n` +
        `\`;logsset <#salon>\` — Définir le salon par défaut (fallback)\n` +
        `\`;logsview\` — 20 derniers logs en mémoire (ring buffer)\n` +
        `\`;logstest <event>\` — Simule un event pour tester le rendu visuel\n` +
        `\`;logsreset\` — Réinitialise toute la config (avec confirmation)\n` +
        `\`;logshelp\` — Ce guide`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    // ── EVENTS DISPONIBLES (par groupe) ───────────────────────────────
    let eventsBlock = `## 📊 Events disponibles (${Object.keys(V3.EVENT_TYPES).length})\n`;
    for (const group of PANEL_GROUPS) {
      const events = Object.entries(V3.EVENT_TYPES).filter(([k]) => V3.panelGroupOf(k) === group.key);
      if (!events.length) continue;
      eventsBlock += `\n${group.icon} **${group.label}** (${events.length})\n`;
      eventsBlock += events.map(([k, m]) => `• ${m.icon} \`${k}\` — ${m.label}`).join('\n');
      eventsBlock += `\n`;
    }
    container.addTextDisplayComponents(text(eventsBlock));
    container.addSeparatorComponents(separator('Small'));

    // ── ASTUCES ───────────────────────────────────────────────────────
    container.addTextDisplayComponents(
      text(
        `## 💡 Astuces\n` +
        `• **Cache mémoire** : 0 query DB en lecture, latence quasi nulle\n` +
        `• **Audit Log lookup** : automatique pour ban/kick/role/channel/server (executor récupéré)\n` +
        `• **Filter \`ignore_bot\`** : actif sur \`message_create\` par défaut (évite spam)\n` +
        `• **Ring buffer** : 50 derniers events conservés en mémoire / guilde\n` +
        `• **Fire-and-forget** : envoi non-bloquant, jamais de freeze sur un event\n` +
        `• **Permissions** : par défaut, seuls les rôles Admin voient la catégorie logs`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    // ── FAQ ───────────────────────────────────────────────────────────
    container.addTextDisplayComponents(
      text(
        `## ❓ FAQ\n` +
        `**Pourquoi \`message_create\` est OFF par défaut ?**\n` +
        `Anti-spam. Un serveur actif génère des centaines de messages/h. Active-le seulement si tu veux logger toute l'activité (\`;logstoggle message_create\`).\n\n` +
        `**Comment tout désactiver ?**\n` +
        `\`;logsreset\` (reset complet avec confirmation) ou \`;logstoggle all off\` (garde la config, mute tous les events).\n\n` +
        `**Comment changer un salon de routing ?**\n` +
        `Pour le salon par défaut : \`;logsset #salon\`.\nPour un event précis : panel \`;logs\` (Vague 2) ou DB directe.\n\n` +
        `**Le log indique \`(via API ou bot externe)\` au lieu d'un modérateur ?**\n` +
        `L'audit log Discord n'a pas pu lier l'event à un user (perm \`View Audit Log\` manquante ou délai dépassé).\n\n` +
        `**Comment reload la config sans relancer le bot ?**\n` +
        `Pas encore exposé en commande — \`;logssetup\` recrée tout, ou redémarre le bot.`,
      ),
    );

    // ── FOOTER ────────────────────────────────────────────────────────
    container.addTextDisplayComponents(
      text(`-# Soulbot · Logs V3 Ultimate · Le système de logs Discord francophone le plus avancé`),
    );

    return message.reply(toV2Payload(container));
  },
};
