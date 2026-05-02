'use strict';

const P = require('../../core/audit-mod-panels');

const ACCOUNT_AGE_THRESHOLD = 7 * 86400_000;       // 7 jours
const JOIN_BURST_WINDOW     = 3600_000;             // 1h

function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (!al) return bl; if (!bl) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v0[bl];
}

function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase(); b = b.toLowerCase();
  const max = Math.max(a.length, b.length);
  if (!max) return 0;
  return 1 - levenshtein(a, b) / max;
}

function scoreMember(member, allMembers) {
  let score = 0;
  const reasons = [];

  const accountAge = Date.now() - member.user.createdTimestamp;
  if (accountAge < ACCOUNT_AGE_THRESHOLD) {
    score += 35;
    reasons.push(`compte créé <7j (${Math.round(accountAge / 86400_000)}j)`);
  } else if (accountAge < 30 * 86400_000) {
    score += 15;
    reasons.push(`compte récent (${Math.round(accountAge / 86400_000)}j)`);
  }

  if (!member.user.avatar) {
    score += 20;
    reasons.push('avatar par défaut');
  }

  if (member.joinedTimestamp) {
    const burst = allMembers.filter(m =>
      m.id !== member.id
      && m.joinedTimestamp
      && Math.abs(m.joinedTimestamp - member.joinedTimestamp) < JOIN_BURST_WINDOW,
    ).size;
    if (burst >= 3) {
      score += 25;
      reasons.push(`${burst} membres rejoints dans la même heure`);
    } else if (burst >= 1) {
      score += 10;
      reasons.push(`${burst} membre(s) rejoint(s) dans la même heure`);
    }
  }

  let bestSim = 0;
  let twin = null;
  for (const other of allMembers.values()) {
    if (other.id === member.id) continue;
    const sim = nameSimilarity(member.user.username, other.user.username);
    if (sim > bestSim) { bestSim = sim; twin = other; }
  }
  if (bestSim >= 0.85 && twin) {
    score += 20;
    reasons.push(`pseudo similaire à ${twin.user.tag} (${Math.round(bestSim * 100)}%)`);
  } else if (bestSim >= 0.7 && twin) {
    score += 10;
    reasons.push(`pseudo proche de ${twin.user.tag} (${Math.round(bestSim * 100)}%)`);
  }

  return { score: Math.min(100, score), reasons };
}

module.exports = {
  name       : 'altdetect',
  aliases    : ['alts', 'multidetect'],
  description: 'Détection de comptes alts (score de risque par membre).',
  usage      : ';altdetect [@membre|pN]',
  cooldown   : 30,
  guildOnly  : true,
  permissions: ['KickMembers'],

  async execute(message, args) {
    const guild = message.guild;
    let members;
    try {
      members = await guild.members.fetch();
    } catch {
      return message.reply(P.dangerPanel('Erreur', 'Impossible de fetch les membres.'));
    }
    members = members.filter(m => !m.user.bot);

    const target = message.mentions.members.first();

    if (target) {
      const { score, reasons } = scoreMember(target, members);
      const body = `**Membre** : ${target.user.tag} · \`${target.id}\`\n`
        + `**Compte créé** : <t:${Math.floor(target.user.createdTimestamp / 1000)}:R>\n`
        + (target.joinedTimestamp ? `**A rejoint** : <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n` : '')
        + `\n---\n`
        + `### Score de risque : **${score}/100**\n`
        + (reasons.length ? reasons.map(r => `• ${r}`).join('\n') : '*Aucun signal détecté.*');

      const color = score >= 70 ? P.COLORS.danger : score >= 40 ? P.COLORS.warning : P.COLORS.success;
      return message.reply(P.infoPanel('🕵️ Analyse alt', body, color));
    }

    let page = 1;
    if (args[0] && /^p\d+$/i.test(args[0])) page = parseInt(args[0].slice(1), 10);

    const scored = [];
    for (const m of members.values()) {
      const r = scoreMember(m, members);
      if (r.score > 0) scored.push({ m, ...r });
    }
    scored.sort((a, b) => b.score - a.score);

    const items = scored.slice(0, 50).map(s =>
      `**${s.score}%** — ${s.m.user.tag} \`${s.m.id}\`\n  ${s.reasons.slice(0, 2).join(' · ')}`,
    );

    return message.reply(P.paginatedList(
      `🕵️ Top suspects alts (sur ${members.size} membres)`,
      items,
      page,
      5,
      P.COLORS.warning,
      '*Analyse précise : `;altdetect @membre`*',
    ));
  },
};
