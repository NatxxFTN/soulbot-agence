'use strict';

// ═══════════════════════════════════════════════
// ANTILEAK ENFORCER — v2.1.2 (fix audit sécurité)
// AVANT CE FICHIER : ;antileak écrivait antileak_config mais AUCUN
// listener ne la lisait — le module était 100% décoratif.
// Détecte : tokens Discord, IPs, emails, numéros de téléphone.
// Sanction par type de fuite (sanction_discord_token, sanction_ip, ...).
// ═══════════════════════════════════════════════

const { PermissionFlagsBits } = require('discord.js');
const { getAntileakConfig, getWhitelistRoles } = require('../core/antileak-helper');
const { applySanction } = require('../core/apply-sanction');

// Token bot Discord : 3 segments base64 séparés par des points
const TOKEN_REGEX = /[\w-]{23,28}\.[\w-]{6,7}\.[\w-]{25,40}/;
// IPv4 stricte (octets 0-255) — évite les versions type 1.2.3.4000
const IP_REGEX = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/;
const EMAIL_REGEX = /[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i;
// FR (+33/0X XX XX XX XX) et international générique 10-15 chiffres
const PHONE_REGEX = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}\b|\+\d{10,15}\b/;

/**
 * Détection pure — exportée pour les tests.
 * @returns {?{type: string, sanction: string, reason: string}}
 */
function detect(content, config) {
  if (!content) return null;

  if (config.detect_discord_token && TOKEN_REGEX.test(content)) {
    return { type: 'discord_token', sanction: config.sanction_discord_token || 'delete', reason: 'Token Discord détecté' };
  }
  if (config.detect_ip && IP_REGEX.test(content)) {
    // localhost / IP privées = pas une fuite
    const ip = content.match(IP_REGEX)[0];
    const isPrivate = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(ip);
    if (!isPrivate) {
      return { type: 'ip', sanction: config.sanction_ip || 'delete', reason: `Adresse IP publique détectée (${ip})` };
    }
  }
  if (config.detect_email && EMAIL_REGEX.test(content)) {
    return { type: 'email', sanction: config.sanction_email || 'delete', reason: 'Adresse email détectée' };
  }
  if (config.detect_phone && PHONE_REGEX.test(content)) {
    return { type: 'phone', sanction: config.sanction_phone || 'delete', reason: 'Numéro de téléphone détecté' };
  }
  return null;
}

module.exports = {
  name: 'messageCreate',
  once: false,
  detect, // exposé pour les tests

  async execute(message, _client) {
    if (!message.guild || message.author?.bot || message.system) return;

    const config = getAntileakConfig(message.guild.id);
    if (!config?.enabled) return;

    if (message.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) return;
    const wlRoles = getWhitelistRoles(message.guild.id);
    if (wlRoles.length && message.member?.roles.cache.some(r => wlRoles.includes(r.id))) return;

    const hit = detect(message.content, config);
    if (!hit || hit.sanction === 'none') return;

    await applySanction(message, 'antileak', hit.sanction, hit.reason, config.logs_channel_id);
  },
};
