'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT HELPER — logique commune ;auditserver
// Retourne un rapport structuré par section avec score + findings
// ═══════════════════════════════════════════════════════════════════════════

const { PermissionsBitField, ChannelType } = require('discord.js');

function scoreLabel(score) {
  if (score >= 80) return { emoji: '🟢', label: 'Excellent' };
  if (score >= 50) return { emoji: '🟡', label: 'Moyen' };
  return { emoji: '🔴', label: 'Problématique' };
}

/**
 * Lance l'audit complet. Retourne :
 * {
 *   globalScore,
 *   sections: { id, title, score, findings:[] }[]
 * }
 */
async function runAudit(guild) {
  const sections = [];

  // ── Section 1 : Config Discord ─────────────────────────────────────────
  const cfg = { title: 'Configuration Discord', id: 'config', score: 100, findings: [] };
  const vLvl = guild.verificationLevel; // 0..4
  if (vLvl < 2) { cfg.findings.push('⚠️ Verification Level bas (recommandé ≥ Medium)'); cfg.score -= 25; }
  else          { cfg.findings.push('✅ Verification Level acceptable'); }

  if (guild.explicitContentFilter < 2) { cfg.findings.push('⚠️ Filtre contenu explicite non max'); cfg.score -= 15; }
  else { cfg.findings.push('✅ Filtre contenu explicite au max'); }

  if (guild.mfaLevel === 0) { cfg.findings.push('🔴 2FA modération désactivé'); cfg.score -= 30; }
  else { cfg.findings.push('✅ 2FA modération activé'); }

  sections.push(cfg);

  // ── Section 2 : Rôles ──────────────────────────────────────────────────
  const roles = { title: 'Rôles', id: 'roles', score: 100, findings: [] };
  const danger = guild.roles.cache.filter(r =>
    !r.managed && r.id !== guild.id &&
    r.permissions.has(PermissionsBitField.Flags.Administrator) &&
    r.mentionable,
  );
  if (danger.size > 0) {
    roles.findings.push(`🔴 ${danger.size} rôle(s) Admin + mentionnable (${danger.map(r => r.name).slice(0, 3).join(', ')})`);
    roles.score -= Math.min(40, danger.size * 15);
  } else {
    roles.findings.push('✅ Aucun rôle Admin mentionnable');
  }

  const adminRoles = guild.roles.cache.filter(r =>
    !r.managed && r.id !== guild.id && r.permissions.has(PermissionsBitField.Flags.Administrator),
  );
  roles.findings.push(`ℹ️ ${adminRoles.size} rôle(s) avec permission Administrator`);
  if (adminRoles.size > 5) { roles.findings.push('⚠️ Beaucoup de rôles Admin — vérifier la nécessité'); roles.score -= 15; }

  sections.push(roles);

  // ── Section 3 : Salons ─────────────────────────────────────────────────
  const chs = { title: 'Salons', id: 'channels', score: 100, findings: [] };
  const orphan = guild.channels.cache.filter(c =>
    !c.parentId && [ChannelType.GuildText, ChannelType.GuildVoice].includes(c.type),
  );
  if (orphan.size > 0) {
    chs.findings.push(`🟡 ${orphan.size} salon(s) sans catégorie`);
    chs.score -= Math.min(20, orphan.size * 3);
  } else {
    chs.findings.push('✅ Tous les salons dans une catégorie');
  }

  const everyoneId = guild.roles.everyone.id;
  let permOk = 0, permKo = 0;
  for (const ch of guild.channels.cache.values()) {
    if (ch.type !== ChannelType.GuildText) continue;
    const ovr = ch.permissionOverwrites?.cache?.get(everyoneId);
    if (!ovr) { permOk++; continue; }
    if (ovr.allow.has(PermissionsBitField.Flags.Administrator)) permKo++;
    else permOk++;
  }
  if (permKo > 0) { chs.findings.push(`🔴 ${permKo} salon(s) avec @everyone + perms élevées`); chs.score -= permKo * 10; }
  else { chs.findings.push('✅ Perms @everyone cohérentes'); }

  sections.push(chs);

  // ── Section 4 : Membres ────────────────────────────────────────────────
  const mem = { title: 'Membres', id: 'members', score: 100, findings: [] };
  try {
    const bots = guild.members.cache.filter(m => m.user.bot);
    const botsAdmin = bots.filter(m => m.permissions.has(PermissionsBitField.Flags.Administrator));
    mem.findings.push(`ℹ️ ${bots.size} bot(s), dont ${botsAdmin.size} avec Admin`);
    if (botsAdmin.size > 3) { mem.findings.push('⚠️ Nombre élevé de bots Admin — à auditer'); mem.score -= 20; }
    else { mem.findings.push('✅ Nombre de bots Admin raisonnable'); }
  } catch {
    mem.findings.push('⚠️ Impossible de scanner les membres (cache partiel)');
    mem.score -= 10;
  }
  sections.push(mem);

  // ── Section 5 : Emojis ─────────────────────────────────────────────────
  const emo = { title: 'Emojis', id: 'emojis', score: 100, findings: [] };
  const totalEmo = guild.emojis.cache.size;
  emo.findings.push(`ℹ️ ${totalEmo} emoji(s) custom sur ${guild.premiumTier === 3 ? 250 : guild.premiumTier === 2 ? 150 : 50} slots`);
  const byName = new Map();
  for (const e of guild.emojis.cache.values()) {
    byName.set(e.name, (byName.get(e.name) || 0) + 1);
  }
  const dupes = [...byName.entries()].filter(([_, n]) => n > 1);
  if (dupes.length > 0) { emo.findings.push(`🟡 ${dupes.length} doublon(s) de nom d'emoji`); emo.score -= Math.min(20, dupes.length * 3); }
  else { emo.findings.push('✅ Aucun doublon de nom'); }

  sections.push(emo);

  // ── Section 6 : Sécurité (webhooks + intégrations) ────────────────────
  const sec = { title: 'Sécurité', id: 'security', score: 100, findings: [] };
  try {
    const hooks = await guild.fetchWebhooks().catch(() => null);
    if (hooks) {
      sec.findings.push(`ℹ️ ${hooks.size} webhook(s) au total`);
      if (hooks.size > 20) { sec.findings.push('⚠️ Beaucoup de webhooks — risque'); sec.score -= 15; }
      else { sec.findings.push('✅ Nombre de webhooks raisonnable'); }
    } else {
      sec.findings.push('⚠️ Impossible de lister les webhooks (perm ManageWebhooks ?)');
      sec.score -= 5;
    }
  } catch {
    sec.findings.push('⚠️ Erreur fetch webhooks');
    sec.score -= 5;
  }
  sections.push(sec);

  // ── Score global ───────────────────────────────────────────────────────
  const globalScore = Math.round(sections.reduce((s, sec) => s + sec.score, 0) / sections.length);

  return { globalScore, sections };
}

module.exports = { runAudit, scoreLabel };
