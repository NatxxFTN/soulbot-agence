'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderFeaturePanel } = require('../panels/security-feature-panel');

// Meta de chaque feature — aligné avec les commandes raccourcies
const META = {
  // ── Tier 1 (Prompt 2) ──────────────────────────────────────────────────
  antilink      : { label: 'Anti-Link',       emoji: 'ui_antileak',    description: 'Bloque les liens HTTP/HTTPS.',                      supportsThreshold: false, defaultThreshold: 1 },
  antiinvite    : { label: 'Anti-Invite',     emoji: 'ui_lock',        description: 'Bloque les invitations Discord.',                   supportsThreshold: false, defaultThreshold: 1 },
  antieveryone  : { label: 'Anti-@everyone',  emoji: 'ui_members',     description: 'Bloque @everyone / @here des non-modérateurs.',     supportsThreshold: false, defaultThreshold: 1 },
  antimention   : { label: 'Anti-Mention',    emoji: 'ui_user',        description: 'Anti-spam de mentions.',                            supportsThreshold: true,  defaultThreshold: 5 },
  antibot       : { label: 'Anti-Bot',        emoji: 'cat_protection', description: "Empêche l'ajout de bots externes.",                supportsThreshold: false, defaultThreshold: 1 },
  antiduplicate : { label: 'Anti-Duplicate',  emoji: 'ui_chat',        description: 'Bloque les messages identiques répétés.',           supportsThreshold: true,  defaultThreshold: 3 },

  // ── Tier 2 (Prompt 3) ──────────────────────────────────────────────────
  antiwords     : { label: 'Filtre de mots',      emoji: 'btn_edit',       description: 'Bloque les mots interdits custom.',            supportsThreshold: false, defaultThreshold: 1 },
  anticaps      : { label: 'Anti-Caps',           emoji: 'btn_edit',       description: 'Bloque les messages avec trop de majuscules.', supportsThreshold: true,  defaultThreshold: 70 },
  antiemojispam : { label: 'Anti-Emoji spam',     emoji: 'ui_smiley',      description: "Bloque l'abus d'emojis.",                     supportsThreshold: true,  defaultThreshold: 10 },
  antinsfw      : { label: 'Anti-NSFW',           emoji: 'btn_error',      description: 'Détecte les mots NSFW.',                       supportsThreshold: false, defaultThreshold: 1 },
  antinewaccount: { label: 'Anti-Nouveau compte', emoji: 'ui_pin',         description: 'Refuse les comptes récents.',                  supportsThreshold: true,  defaultThreshold: 7 },
  antiraid      : { label: 'Anti-Raid',           emoji: 'cat_protection', description: 'Détecte les raids (join flood).',              supportsThreshold: true,  defaultThreshold: 10 },
};

function ensureManageGuild(interaction) {
  if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({
      content: `${e('btn_error')} Permission requise : **Gérer le serveur**.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

async function handleSecurityFeatureInteraction(interaction, params) {
  const feature = params[0];
  const action  = params[1];
  const meta    = META[feature];
  if (!meta) return;

  if (!ensureManageGuild(interaction)) return;

  try {
    // Buttons
    if (interaction.isButton?.()) {
      if (action === 'toggle') {
        storage.toggleFeature(interaction.guild.id, feature);
        const panel = renderFeaturePanel(interaction.guild, feature, meta);
        return interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
      if (action === 'back') {
        const { renderSecurityPanel } = require('../panels/security-panel');
        const main = renderSecurityPanel(interaction.guild);
        return interaction.update({ components: [main], flags: MessageFlags.IsComponentsV2 });
      }
    }

    // Select menus
    if (interaction.isStringSelectMenu?.()) {
      if (action === 'set_action') {
        const newAction = interaction.values[0];
        storage.setConfig(interaction.guild.id, feature, { action: newAction });
        const panel = renderFeaturePanel(interaction.guild, feature, meta);
        return interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
      if (action === 'set_threshold') {
        const newThreshold = parseInt(interaction.values[0], 10);
        if (!Number.isNaN(newThreshold) && newThreshold >= 2 && newThreshold <= 50) {
          storage.setConfig(interaction.guild.id, feature, { threshold: newThreshold });
        }
        const panel = renderFeaturePanel(interaction.guild, feature, meta);
        return interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      }
    }
  } catch (err) {
    console.error('[secfeat-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

module.exports = { handleSecurityFeatureInteraction, META };
