'use strict';

// ═══════════════════════════════════════════════
// BOTCONFIG PANEL — v2.1.2
// Panel central de configuration Soulbot : 3 onglets
// (Général / Tarifs / Permissions) navigués par StringSelect.
// Rendu pur — aucune écriture DB ici, c'est le handler qui agit.
// Protocole customId : botcfg:<action>[:param]
// ═══════════════════════════════════════════════

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { mainConfigPanel } = require('../../utils/panels-v4');
const { getGuildSettings } = require('../../database');
const { getGuildBotConfig } = require('../../core/guild-config');
const pricing = require('../../core/pricing');
const { isOwner } = require('../../core/permissions');

const SECTIONS = [
  { key: 'general',     label: 'Paramètres généraux', emojiName: 'cat_configuration' },
  { key: 'pricing',     label: 'Plans tarifaires',    emojiName: 'ani_coin' },
  { key: 'permissions', label: 'Permissions',         emojiName: 'ui_lock' },
];

/**
 * Rend le panel /botconfig pour un onglet donné.
 * @param {import('discord.js').Guild} guild
 * @param {string} [tab] - 'general' | 'pricing' | 'permissions'
 * @param {string} [viewerId] - pour adapter les boutons (édition tarifs = BotOwner)
 * @returns {{ components, flags }}
 */
function renderBotConfigPanel(guild, tab = 'general', viewerId = null) {
  const config = {
    title       : 'Configuration Soulbot',
    description : 'Personnalise le bot pour ce serveur — navigation par sections.',
    sections    : SECTIONS,
    selectAction: 'botcfg:tab',
  };

  let body;
  if (tab === 'pricing')          body = _pricingBody(viewerId);
  else if (tab === 'permissions') body = _permissionsBody(guild);
  else                            body = _generalBody(guild);

  return mainConfigPanel(config, tab, body);
}

// ─── Onglet Général ───────────────────────────────────────────────────────────

function _generalBody(guild) {
  const settings  = getGuildSettings(guild.id);
  const botConfig = getGuildBotConfig(guild.id);
  const nickname  = guild.members.me?.nickname ?? botConfig?.nickname ?? null;

  const text =
    `${e('ui_pin')} Prefix : \`${settings?.prefix ?? ';'}\`\n` +
    `${e('ui_user')} Nickname du bot : ${nickname ? `**${nickname}**` : '*Par défaut*'}\n` +
    `${e('ui_bulb')} Couleur embed : \`#${botConfig?.embed_color ?? 'B600A8'}\``;

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('botcfg:editprefix')
        .setLabel('Changer le prefix')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('botcfg:editnick')
        .setLabel('Changer le nickname')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('botcfg:reset')
        .setLabel('Reset config')
        .setStyle(ButtonStyle.Danger),
    ),
  ];

  return { text, rows };
}

// ─── Onglet Tarifs ────────────────────────────────────────────────────────────

function _pricingBody(viewerId) {
  const tiers = pricing.getAllPricing();

  const lines = tiers.map((tier) => {
    const price    = tier.price_usd > 0 ? `$${tier.price_usd.toFixed(2)}` : 'Gratuit';
    const features = pricing.getFeaturesByTier(tier.id);
    const featStr  = features.length ? `\n-# ${features.join(' · ')}` : '';
    return `${e('ani_diamond')} **${tier.name}** — ${price}\n-# ${tier.description ?? ''}${featStr}`;
  });

  const text = lines.join('\n') || '*Aucun plan configuré.*';

  const rows = [];
  // Édition des tarifs : réservée BotOwner — le select n'apparaît pas pour les autres.
  if (viewerId && isOwner(viewerId)) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('botcfg:edittier')
        .setPlaceholder('Modifier un tarif… (BotOwner)')
        .addOptions(tiers.map(t => ({
          label      : t.name,
          value      : t.id,
          description: t.price_usd > 0 ? `$${t.price_usd.toFixed(2)}` : 'Gratuit',
        }))),
    ));
  }

  return { text, rows };
}

// ─── Onglet Permissions ───────────────────────────────────────────────────────

function _permissionsBody(guild) {
  const text =
    `${e('ui_lock')} Ouverture du panel : **Gérer le serveur** requis\n` +
    `${e('ui_unlock')} Édition des tarifs : **BotOwner** uniquement\n` +
    `${e('btn_tip')} Niveaux par utilisateur : \`;setperm\` / \`;listperm\``;

  return { text, rows: [] };
}

module.exports = { renderBotConfigPanel, SECTIONS };
