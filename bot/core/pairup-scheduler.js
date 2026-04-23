'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const storage = require('./pairup-storage');

const FREQ_MS = {
  daily  : 24 * 60 * 60 * 1000,
  weekly : 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const TOPICS = [
  'Quel est ton film ou série préféré·e du moment ?',
  'Partage un souvenir marquant de ton parcours Discord.',
  'Si tu pouvais voyager n\'importe où, où irais-tu ?',
  'Quel est le dernier livre, podcast ou musique qui t\'a marqué·e ?',
  'Raconte un projet perso (jeu, art, code) qui te tient à cœur.',
  'Quelle est ta routine du matin ?',
  'Quelle compétence aimerais-tu développer cette année ?',
  'Un hobby que peu de gens connaissent chez toi ?',
  'Si tu avais 24h libres demain, tu ferais quoi ?',
  'Quel est ton jeu-vidéo de tous les temps ?',
  'Partage un plat qui te rappelle ton enfance.',
  'Une personne (réelle ou fictive) qui t\'inspire ?',
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

/** Construit les paires en évitant de repairer quelqu'un vu dans les 5 derniers matchs. */
function buildPairs(guildId, userIds) {
  const available = shuffle(userIds);
  const pairs = [];
  const used = new Set();
  const RECENT_WINDOW = 90 * 24 * 60 * 60 * 1000; // 90 jours

  for (const u of available) {
    if (used.has(u)) continue;
    const recent = storage.getRecentPairings(guildId, u, RECENT_WINDOW);
    // Cherche un partenaire non récent
    let partner = null;
    for (const o of available) {
      if (o === u || used.has(o)) continue;
      if (!recent.has(o)) { partner = o; break; }
    }
    // Fallback : n'importe quel dispo
    if (!partner) {
      for (const o of available) {
        if (o === u || used.has(o)) continue;
        partner = o; break;
      }
    }
    if (partner) {
      used.add(u); used.add(partner);
      pairs.push([u, partner]);
    }
  }

  // Si nombre impair, un "reste" → on l'ajoute en solo (pas de match)
  const leftover = available.filter(u => !used.has(u));
  return { pairs, leftover };
}

async function runPairup(client, cfg) {
  try {
    const guild = client.guilds.cache.get(cfg.guild_id);
    if (!guild) return;

    const channel = await guild.channels.fetch(cfg.channel_id).catch(() => null);
    if (!channel) return;

    // Récupérer les membres du rôle
    const role = await guild.roles.fetch(cfg.role_id).catch(() => null);
    if (!role) return;

    await guild.members.fetch().catch(() => {});
    const members = Array.from(role.members.values()).filter(m => !m.user.bot);
    const userIds = members.map(m => m.id);

    if (userIds.length < 2) {
      await channel.send({
        content: `ℹ️ Moins de 2 membres dans <@&${cfg.role_id}> — aucune paire formée.`,
        allowedMentions: { parse: [] },
      }).catch(() => {});
      storage.updateLastRun(cfg.guild_id);
      return;
    }

    const { pairs, leftover } = buildPairs(cfg.guild_id, userIds);

    for (const [u1, u2] of pairs) {
      const topic = pickTopic();
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `🤝 **Match Pairup** · <@${u1}> × <@${u2}>`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Sujet suggéré :** ${topic}\n\n` +
        `Prenez un moment pour vous écrire en DM ou dans un fil — ` +
        `l'objectif est de créer du lien au-delà du chat habituel.`,
      ));

      await channel.send({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [u1, u2] },
      }).catch(() => {});

      storage.recordPairing(cfg.guild_id, u1, u2);
      // Petit délai pour éviter le rate limit
      await new Promise(r => setTimeout(r, 500));
    }

    if (leftover.length) {
      await channel.send({
        content: `ℹ️ ${leftover.map(id => `<@${id}>`).join(', ')} : pas de match cette fois-ci (nombre impair). Tu seras prioritaire au prochain tour !`,
        allowedMentions: { users: leftover },
      }).catch(() => {});
    }

    storage.updateLastRun(cfg.guild_id);
  } catch (err) {
    console.error('[pairup-scheduler] runPairup:', err);
  }
}

async function checkAllGuilds(client) {
  try {
    const configs = storage.listEnabledConfigs();
    const now = Date.now();

    for (const cfg of configs) {
      const interval = FREQ_MS[cfg.frequency] || FREQ_MS.weekly;
      const elapsed = cfg.last_run_at ? (now - cfg.last_run_at) : Infinity;
      if (elapsed < interval) continue;
      await runPairup(client, cfg);
    }
  } catch (err) {
    console.error('[pairup-scheduler] checkAllGuilds:', err);
  }
}

function startPairupScheduler(client) {
  console.log('[pairup-scheduler] Démarré');
  // Premier check après 60s
  setTimeout(() => checkAllGuilds(client), 60 * 1000);
  // Puis toutes les heures
  setInterval(() => checkAllGuilds(client), 60 * 60 * 1000);
}

module.exports = { startPairupScheduler, runPairup, FREQ_MS };
