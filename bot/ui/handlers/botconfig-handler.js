'use strict';

// ═══════════════════════════════════════════════
// BOTCONFIG HANDLER — v2.1.2
// Routeur des interactions du panel /botconfig.
// customId : botcfg:<action>[:param]  ·  modals : botcfg_modal:<action>[:param]
// Guards : ManageGuild pour le panel, BotOwner pour les tarifs.
// ═══════════════════════════════════════════════

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { e } = require('../../core/emojis');
const { renderBotConfigPanel } = require('../panels/botconfig-panel');
const { editableModal } = require('../../utils/panels-v4');
const { getGuildSettings, setGuildSetting } = require('../../database');
const { setGuildNickname, resetGuildBotConfig } = require('../../core/guild-config');
const pricing = require('../../core/pricing');
const { isOwner } = require('../../core/permissions');
const { logLine } = require('../../utils/response-builder');

// ── Guards ────────────────────────────────────────────────────────────────────

function ensureManageGuild(interaction) {
  if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({
      content: `${e('ui_alert')} Tu as besoin de la permission **Gérer le serveur**.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

function ensureBotOwner(interaction) {
  if (!isOwner(interaction.user.id)) {
    interaction.reply({
      content: `${e('ui_lock')} Les tarifs ne sont modifiables que par le **BotOwner**.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

async function refreshPanel(interaction, tab) {
  const payload = renderBotConfigPanel(interaction.guild, tab, interaction.user.id);
  await interaction.update(payload);
}

// ── Routeur boutons + selects ────────────────────────────────────────────────

async function handleBotConfigInteraction(interaction, params) {
  const action = params[0];
  if (!ensureManageGuild(interaction)) return;

  // Navigation par onglets (StringSelect 'botcfg:tab')
  if (action === 'tab' && interaction.isStringSelectMenu?.()) {
    return refreshPanel(interaction, interaction.values[0]);
  }

  // Changer le prefix → modal
  if (action === 'editprefix') {
    const current = getGuildSettings(interaction.guild.id)?.prefix ?? ';';
    return interaction.showModal(editableModal({
      customId: 'botcfg_modal:prefix',
      title   : 'Changer le prefix',
      fields  : [{ id: 'value', label: 'Nouveau prefix (1-5 caractères)', value: current, maxLength: 5 }],
    }));
  }

  // Changer le nickname → modal
  if (action === 'editnick') {
    const current = interaction.guild.members.me?.nickname ?? '';
    return interaction.showModal(editableModal({
      customId: 'botcfg_modal:nickname',
      title   : 'Changer le nickname du bot',
      fields  : [{
        id: 'value', label: 'Nickname (vide = reset)', value: current,
        required: false, maxLength: 32,
      }],
    }));
  }

  // Reset config serveur (étape de confirmation)
  if (action === 'reset') {
    return interaction.reply({
      content: `${e('btn_flag')} **Réinitialiser la config bot de ce serveur ?** Prefix, nickname et couleur reviennent aux valeurs par défaut.`,
      components: [{
        type: 1,
        components: [
          { type: 2, style: 4, label: 'Confirmer le reset', custom_id: 'botcfg:resetconfirm' },
          { type: 2, style: 2, label: 'Annuler',            custom_id: 'botcfg:resetcancel' },
        ],
      }],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (action === 'resetcancel') {
    return interaction.update({ content: `${e('btn_tip')} Reset annulé — rien n'a été modifié.`, components: [] });
  }

  if (action === 'resetconfirm') {
    setGuildSetting(interaction.guild.id, 'prefix', ';');
    resetGuildBotConfig(interaction.guild.id);
    await interaction.guild.members.me?.setNickname(null).catch(() => {});
    return interaction.update({
      content: `${e('btn_success')} Config réinitialisée : prefix \`;\`, nickname et couleur par défaut.`,
      components: [],
    });
  }

  // Sélection d'un tier à éditer (BotOwner) → modal pré-rempli
  if (action === 'edittier' && interaction.isStringSelectMenu?.()) {
    if (!ensureBotOwner(interaction)) return;
    const tier = pricing.getPricingById(interaction.values[0]);
    if (!tier) return;
    return interaction.showModal(editableModal({
      customId: `botcfg_modal:tier:${tier.id}`,
      title   : `Modifier — ${tier.name}`,
      fields  : [
        { id: 'price',       label: 'Prix USD (ex. 9.99)',           value: String(tier.price_usd) },
        { id: 'description', label: 'Description',                    value: tier.description ?? '', required: false, maxLength: 100 },
        { id: 'features',    label: 'Features (séparées par des virgules)', value: pricing.getFeaturesByTier(tier.id).join(', '), required: false, paragraph: true },
      ],
    }));
  }
}

// ── Routeur modals ───────────────────────────────────────────────────────────

async function handleBotConfigModal(interaction, params) {
  const action = params[0];
  if (!ensureManageGuild(interaction)) return;

  // ── Prefix ────────────────────────────────────────────────────────────────
  if (action === 'prefix') {
    const value = interaction.fields.getTextInputValue('value').trim();
    if (!value || value.length > 5 || /\s/.test(value)) {
      return interaction.reply({
        content: `${e('ui_alert')} Prefix invalide — 1 à 5 caractères, sans espace.`,
        flags  : MessageFlags.Ephemeral,
      });
    }
    const old = getGuildSettings(interaction.guild.id)?.prefix ?? ';';
    setGuildSetting(interaction.guild.id, 'prefix', value);
    console.log(logLine('CONFIG', interaction.user.tag, `prefix ${old} -> ${value} (${interaction.guild.id})`));
    return interaction.reply({
      content: `${e('btn_success')} Prefix mis à jour : \`${old}\` → \`${value}\``,
      flags  : MessageFlags.Ephemeral,
    });
  }

  // ── Nickname ──────────────────────────────────────────────────────────────
  if (action === 'nickname') {
    const value = interaction.fields.getTextInputValue('value').trim() || null;
    try {
      await interaction.guild.members.me.setNickname(value);
    } catch {
      return interaction.reply({
        content: `${e('ui_alert')} Impossible de changer le nickname — vérifie la permission **Gérer les pseudos** et la hiérarchie des rôles.`,
        flags  : MessageFlags.Ephemeral,
      });
    }
    setGuildNickname(interaction.guild.id, value, interaction.user.id);
    return interaction.reply({
      content: value
        ? `${e('btn_success')} Nickname mis à jour : **${value}**`
        : `${e('btn_success')} Nickname réinitialisé.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // ── Tarif (BotOwner) ──────────────────────────────────────────────────────
  if (action === 'tier') {
    if (!ensureBotOwner(interaction)) return;
    const tierId = params[1];
    const tier = pricing.getPricingById(tierId);
    if (!tier) {
      return interaction.reply({ content: `${e('ui_alert')} Tier inconnu.`, flags: MessageFlags.Ephemeral });
    }

    const priceRaw = interaction.fields.getTextInputValue('price').trim().replace(',', '.').replace(/^\$/, '');
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0 || price > 10_000) {
      return interaction.reply({
        content: `${e('ui_alert')} Prix invalide : \`${priceRaw}\` — nombre attendu (ex. 9.99).`,
        flags  : MessageFlags.Ephemeral,
      });
    }

    const description = interaction.fields.getTextInputValue('description').trim() || null;
    const featuresRaw = interaction.fields.getTextInputValue('features').trim();
    const features = JSON.stringify(
      featuresRaw ? featuresRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
    );

    pricing.updatePricing(tierId, {
      price_usd    : price,
      price_discord: Math.round(price * 100),
      description,
      features,
      updated_by   : interaction.user.id,
    });
    await pricing.syncPricingAcrossBot(tierId, interaction.client);

    return interaction.reply({
      content: `${e('btn_success')} **${tier.name}** mis à jour : $${tier.price_usd.toFixed(2)} → $${price.toFixed(2)}. Synchronisé partout.`,
      flags  : MessageFlags.Ephemeral,
    });
  }
}

module.exports = { handleBotConfigInteraction, handleBotConfigModal };
