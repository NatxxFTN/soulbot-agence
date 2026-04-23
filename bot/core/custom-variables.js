'use strict';

// ── Custom Variables Parser — substitution dans les réponses custom ──────────
// Règle : si une variable référence un objet non fourni, la laisse telle quelle.

function parseVariables(template, context) {
  if (!template || typeof template !== 'string') return '';

  const { user, member, guild, channel } = context || {};
  let output = template;

  // ── User ────────────────────────────────────────────────────────────────
  if (user) {
    output = output
      .replace(/\{user\.displayname\}/g, member?.displayName || user.username || '')
      .replace(/\{user\.name\}/g,        user.username || '')
      .replace(/\{user\.id\}/g,          user.id || '')
      .replace(/\{user\.avatar\}/g,      (user.displayAvatarURL?.({ size: 512 })) || '')
      .replace(/\{user\.tag\}/g,         user.tag || '')
      .replace(/\{user\}/g,              `<@${user.id}>`);
  }

  // ── Server ──────────────────────────────────────────────────────────────
  if (guild) {
    output = output
      .replace(/\{server\.name\}/g, guild.name || '')
      .replace(/\{server\.id\}/g,   guild.id   || '')
      .replace(/\{server\.icon\}/g, (guild.iconURL?.({ size: 512 })) || '')
      .replace(/\{server\}/g,       guild.name || '')
      .replace(/\{membercount\}/g,  String(guild.memberCount ?? 0));
  }

  // ── Channel ─────────────────────────────────────────────────────────────
  if (channel) {
    output = output
      .replace(/\{channel\.name\}/g, channel.name || '')
      .replace(/\{channel\}/g,       `<#${channel.id}>`);
  }

  // ── Date / time ─────────────────────────────────────────────────────────
  const now = new Date();
  output = output
    .replace(/\{date\}/g,      now.toLocaleDateString('fr-FR'))
    .replace(/\{time\}/g,      now.toLocaleTimeString('fr-FR'))
    .replace(/\{timestamp\}/g, `<t:${Math.floor(now.getTime() / 1000)}:R>`);

  // ── Random choice : {random:a|b|c} ──────────────────────────────────────
  output = output.replace(/\{random:([^}]+)\}/g, (_, choices) => {
    const arr = choices.split('|').map(s => s.trim()).filter(Boolean);
    if (arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  });

  return output;
}

module.exports = { parseVariables };
