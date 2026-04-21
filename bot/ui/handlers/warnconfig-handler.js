'use strict';

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { buildModal }             = require('../components/modals');
const { renderWarnconfigPanel }  = require('../panels/warnconfig-panel');
const {
  getWarnConfig, updateWarnConfig,
  getThresholds, addThreshold, removeThreshold,
} = require('../../core/warn-helper');
const { EMOJIS } = require('../theme');

const VALID_ACTIONS = ['mute', 'timeout', 'kick', 'ban'];

function parseDuration(raw) {
  const s = raw.trim().toLowerCase();
  let total = 0;
  for (const [, num, unit] of s.matchAll(/(\d+)\s*([smhd]?)/g)) {
    const n = parseInt(num, 10);
    switch (unit) {
      case 'd': total += n * 86400; break;
      case 'h': total += n * 3600;  break;
      case 'm': total += n * 60;    break;
      default:  total += n;         break;
    }
  }
  return total;
}

async function handleWarnconfigInteraction(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: `${EMOJIS.cross()} Tu dois être administrateur du serveur.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const customId = interaction.customId;
  const action   = customId.replace('warnconfig:', '');
  const guildId  = interaction.guild.id;

  try {
    // ── Toggle système ─────────────────────────────────────────────────────────
    if (action === 'toggle') {
      const cfg = getWarnConfig(guildId) || {};
      updateWarnConfig(guildId, { enabled: cfg.enabled !== 0 ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }

    // ── Salon logs ─────────────────────────────────────────────────────────────
    if (action === 'logs') {
      updateWarnConfig(guildId, { logs_channel_id: interaction.values[0] }, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }
    if (action === 'logs_reset') {
      updateWarnConfig(guildId, { logs_channel_id: null }, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }

    // ── DM toggle ──────────────────────────────────────────────────────────────
    if (action === 'dm_toggle') {
      const cfg = getWarnConfig(guildId) || {};
      updateWarnConfig(guildId, { dm_warned: cfg.dm_warned !== 0 ? 0 : 1 }, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }

    // ── Expiration — ouvre modal ───────────────────────────────────────────────
    if (action === 'exp_modal') {
      const cfg = getWarnConfig(guildId) || {};
      return interaction.showModal(buildModal({
        customId: 'warnconfig:exp_save',
        title   : 'Expiration des warns',
        inputs  : [{
          id         : 'days',
          label      : 'Jours avant expiration (0 = jamais)',
          placeholder: '30',
          value      : String(cfg.expiration_days ?? 30),
          maxLength  : 4,
          required   : true,
        }],
      }));
    }

    // ── Sauvegarde expiration ──────────────────────────────────────────────────
    if (action === 'exp_save') {
      const raw  = interaction.fields.getTextInputValue('days');
      const days = parseInt(raw, 10);
      if (isNaN(days) || days < 0 || days > 365) {
        return interaction.reply({
          content: '✗ Valeur invalide. Saisir un nombre entre 0 et 365 (0 = jamais).',
          flags  : MessageFlags.Ephemeral,
        });
      }
      updateWarnConfig(guildId, { expiration_days: days }, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }

    // ── Ajouter seuil — ouvre modal ────────────────────────────────────────────
    if (action === 'add_threshold') {
      return interaction.showModal(buildModal({
        customId: 'warnconfig:add_threshold_save',
        title   : 'Ajouter un seuil automatique',
        inputs  : [
          {
            id         : 'count',
            label      : 'Nombre de warns déclencheur',
            placeholder: '3',
            maxLength  : 3,
            required   : true,
          },
          {
            id         : 'action',
            label      : 'Action (mute / timeout / kick / ban)',
            placeholder: 'timeout',
            maxLength  : 10,
            required   : true,
          },
          {
            id         : 'duration',
            label      : 'Durée si mute/timeout (ex: 10m, 1h — vide si kick/ban)',
            placeholder: '10m',
            maxLength  : 20,
            required   : false,
          },
        ],
      }));
    }

    // ── Sauvegarde nouveau seuil ───────────────────────────────────────────────
    if (action === 'add_threshold_save') {
      const countRaw  = interaction.fields.getTextInputValue('count');
      const actionRaw = interaction.fields.getTextInputValue('action').trim().toLowerCase();
      const durRaw    = interaction.fields.getTextInputValue('duration')?.trim() || '';

      const count = parseInt(countRaw, 10);
      if (isNaN(count) || count < 1 || count > 100) {
        return interaction.reply({
          content: '✗ Nombre de warns invalide (1–100).',
          flags  : MessageFlags.Ephemeral,
        });
      }
      if (!VALID_ACTIONS.includes(actionRaw)) {
        return interaction.reply({
          content: `✗ Action invalide. Valeurs acceptées : \`${VALID_ACTIONS.join(', ')}\`.`,
          flags  : MessageFlags.Ephemeral,
        });
      }

      let duration = null;
      if (durRaw && (actionRaw === 'mute' || actionRaw === 'timeout')) {
        duration = parseDuration(durRaw);
        if (duration < 60) {
          return interaction.reply({
            content: '✗ Durée trop courte (minimum 60 secondes).',
            flags  : MessageFlags.Ephemeral,
          });
        }
      }

      addThreshold(guildId, count, actionRaw, duration, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }

    // ── Retirer seuil — ouvre modal ────────────────────────────────────────────
    if (action === 'remove_threshold_modal') {
      const thresholds = getThresholds(guildId);
      if (thresholds.length === 0) {
        return interaction.reply({
          content: '✗ Aucun seuil à retirer.',
          flags  : MessageFlags.Ephemeral,
        });
      }
      const list = thresholds.map((t, i) => {
        const dur = t.duration ? ` (${Math.round(t.duration / 60)}min)` : '';
        return `${i} = ${t.count} warns → ${t.action}${dur}`;
      }).join('\n');
      return interaction.showModal(buildModal({
        customId: 'warnconfig:remove_threshold_save',
        title   : 'Retirer un seuil',
        inputs  : [{
          id         : 'index',
          label      : 'Numéro du seuil à retirer (voir liste)',
          placeholder: `${list}`,
          maxLength  : 3,
          required   : true,
        }],
      }));
    }

    // ── Sauvegarde retrait seuil ───────────────────────────────────────────────
    if (action === 'remove_threshold_save') {
      const raw = interaction.fields.getTextInputValue('index');
      const idx = parseInt(raw, 10);
      const thresholds = getThresholds(guildId);
      if (isNaN(idx) || idx < 0 || idx >= thresholds.length) {
        return interaction.reply({
          content: `✗ Numéro invalide. Il y a ${thresholds.length} seuil${thresholds.length > 1 ? 's' : ''} (indices 0 à ${thresholds.length - 1}).`,
          flags  : MessageFlags.Ephemeral,
        });
      }
      removeThreshold(guildId, idx, interaction.user.id);
      return interaction.update(renderWarnconfigPanel(guildId));
    }

    // ── Aide ───────────────────────────────────────────────────────────────────
    if (action === 'help') {
      return interaction.reply({
        content:
          `❓ **Aide Warns**\n\n` +
          `**Système warns :** active/désactive l'enregistrement des warns.\n` +
          `**Salon logs :** reçoit un embed à chaque warn ajouté ou supprimé.\n` +
          `**DM membre :** envoie un DM au membre quand il reçoit un warn.\n` +
          `**Expiration :** les warns plus anciens que N jours sont ignorés dans les comptages. 0 = jamais.\n\n` +
          `**Seuils automatiques :**\n` +
          `Configure des actions automatiques selon le nombre de warns actifs.\n` +
          `Actions disponibles : \`mute\`, \`timeout\`, \`kick\`, \`ban\`\n` +
          `Exemple : *3 warns → timeout 10min*, *5 warns → ban*`,
        flags: MessageFlags.Ephemeral,
      });
    }

  } catch (err) {
    console.error('[warnconfig-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${EMOJIS.cross()} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('warnconfig', (i) => handleWarnconfigInteraction(i));
  client.selectHandlers.set('warnconfig', (i) => handleWarnconfigInteraction(i));
  client.modalHandlers .set('warnconfig', (i) => handleWarnconfigInteraction(i));
}

module.exports = { handleWarnconfigInteraction, register };
