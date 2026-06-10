'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME BUILDER — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Envoie les messages de bienvenue et de règlement dans les salons appropriés.
// Utilise le contenu du template.welcome et template.rules.
// ═══════════════════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { THEME } = require('../../config/theme');
const logger = require('../../utils/logger');

/**
 * Remplace les placeholders dans une chaîne par les valeurs réelles du serveur.
 *
 * @param {string} str - Chaîne avec placeholders
 * @param {import('discord.js').Guild} guild - La guilde
 * @param {object} [extra] - Placeholders supplémentaires
 * @returns {string} Chaîne avec les placeholders résolus
 */
function replacePlaceholders(str, guild, extra = {}) {
  if (typeof str !== 'string') return str;
  let result = str;
  result = result.replace(/\{server\}/g, guild.name);
  result = result.replace(/\{guild\}/g, guild.name);
  if (extra.welcomeChannel) {
    result = result.replace(/\{welcome_channel\}/g, `<#${extra.welcomeChannel}>`);
  }
  if (extra.memberCount) {
    result = result.replace(/\{count\}/g, String(extra.memberCount));
  }
  return result;
}

/**
 * Envoie le message de bienvenue dans le salon spécifié.
 *
 * @param {import('discord.js').Guild} guild - La guilde
 * @param {object} welcomeConfig - Configuration depuis template.welcome
 * @param {string} channelId - ID du salon où envoyer le message
 * @returns {Promise<boolean>} true si envoyé avec succès
 */
async function sendWelcomeMessage(guild, welcomeConfig, channelId) {
  if (!welcomeConfig || !welcomeConfig.enabled) return false;
  if (!channelId) return false;

  try {
    const channel = await guild.channels.fetch(channelId);
    if (!channel) return false;

    const embed = new EmbedBuilder()
      .setColor(parseHexColor(welcomeConfig.color) || THEME.COLOR_PRIMARY)
      .setTitle(replacePlaceholders(welcomeConfig.title, guild, { welcomeChannel: channelId }))
      .setDescription(replacePlaceholders(welcomeConfig.description, guild, { welcomeChannel: channelId }))
      .setFooter({ text: replacePlaceholders(welcomeConfig.footer || THEME.FOOTER_TEXT, guild) })
      .setTimestamp();

    // Ajoute la miniature (avatar du serveur)
    if (welcomeConfig.thumbnail !== false && guild.iconURL()) {
      embed.setThumbnail(guild.iconURL({ size: 256 }));
    }

    // Ajoute une image si configurée
    if (welcomeConfig.image) {
      embed.setImage(welcomeConfig.image);
    }

    await channel.send({ embeds: [embed] });
    logger.info('ServerForge:WelcomeBuilder', `Message de bienvenue envoyé dans #${channel.name}`);
    return true;
  } catch (err) {
    logger.error('ServerForge:WelcomeBuilder', `Erreur envoi bienvenue: ${err.message}`);
    return false;
  }
}

/**
 * Envoie le message de règlement dans le salon spécifié (sous forme d'embed).
 * Liste chaque règle avec un numéro.
 *
 * @param {import('discord.js').Guild} guild - La guilde
 * @param {object} rulesConfig - Configuration depuis template.rules
 * @param {string} channelId - ID du salon où envoyer le message
 * @returns {Promise<boolean>} true si envoyé avec succès
 */
async function sendRulesMessage(guild, rulesConfig, channelId) {
  if (!rulesConfig || !rulesConfig.enabled) return false;
  if (!channelId) return false;
  if (!Array.isArray(rulesConfig.rules) || rulesConfig.rules.length === 0) return false;

  try {
    const channel = await guild.channels.fetch(channelId);
    if (!channel) return false;

    // Construit la liste numérotée des règles
    const rulesList = rulesConfig.rules
      .map((rule, i) => `**${i + 1}.** ${rule}`)
      .join('\n');

    const description = rulesConfig.description
      ? `${replacePlaceholders(rulesConfig.description, guild)}\n\n${rulesList}`
      : rulesList;

    const embed = new EmbedBuilder()
      .setColor(parseHexColor(rulesConfig.color) || THEME.COLOR_PRIMARY)
      .setTitle(replacePlaceholders(rulesConfig.title, guild))
      .setDescription(description)
      .setFooter({ text: replacePlaceholders(rulesConfig.footer || THEME.FOOTER_TEXT, guild) })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    logger.info('ServerForge:WelcomeBuilder', `Message de règlement envoyé dans #${channel.name}`);
    return true;
  } catch (err) {
    logger.error('ServerForge:WelcomeBuilder', `Erreur envoi règlement: ${err.message}`);
    return false;
  }
}

/**
 * Point d'entrée principal — envoie les messages de bienvenue et règlement.
 *
 * @param {import('discord.js').Guild} guild - La guilde
 * @param {object} template - Le template complet
 * @param {object} channelIds - IDs des salons spéciaux
 * @param {string} [channelIds.welcomeChannel] - ID du salon de bienvenue
 * @param {string} [channelIds.rulesChannel] - ID du salon de règlement
 * @param {Function} [progressCallback] - Fonction de progression
 * @returns {Promise<{messagesSent: number, errors: string[]}>}
 */
async function sendWelcomeMessages(guild, template, channelIds, progressCallback = () => {}) {
  const errors = [];
  let messagesSent = 0;

  progressCallback({
    type: 'messages',
    status: 'in_progress',
    current: 0,
    total: 2,
    message: 'Envoi des messages...',
  });

  // Message de bienvenue
  const welcomeSent = await sendWelcomeMessage(guild, template.welcome, channelIds.welcomeChannel);
  if (welcomeSent) {
    messagesSent++;
    logger.info('ServerForge:WelcomeBuilder', 'Message de bienvenue envoyé avec succès');
  } else if (template.welcome && template.welcome.enabled) {
    // Pas une erreur critique — on note seulement si c'était activé
    if (!channelIds.welcomeChannel) {
      errors.push('Aucun salon de bienvenue trouvé dans le template');
    }
  }

  progressCallback({
    type: 'messages',
    status: 'in_progress',
    current: messagesSent,
    total: 2,
    message: messagesSent >= 1 ? 'Message de bienvenue envoyé' : 'Bienvenue ignoré',
  });

  // Message de règlement
  const rulesSent = await sendRulesMessage(guild, template.rules, channelIds.rulesChannel);
  if (rulesSent) {
    messagesSent++;
    logger.info('ServerForge:WelcomeBuilder', 'Message de règlement envoyé avec succès');
  } else if (template.rules && template.rules.enabled) {
    if (!channelIds.rulesChannel) {
      errors.push('Aucun salon de règlement trouvé dans le template');
    }
  }

  progressCallback({
    type: 'messages',
    status: messagesSent > 0 ? 'completed' : 'failed',
    current: messagesSent,
    total: 2,
    message: `${messagesSent}/2 message(s) envoyé(s)`,
  });

  return { messagesSent, errors };
}

/**
 * Parse une couleur hexadécimale (#RRGGBB) en nombre pour Discord.js.
 * @param {string} hex - Couleur hexadécimale (ex: "#8B5CF6")
 * @returns {number|null} Nombre couleur ou null si invalide
 */
function parseHexColor(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const cleaned = hex.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return parseInt(cleaned, 16);
}

module.exports = { sendWelcomeMessages, sendWelcomeMessage, sendRulesMessage };
