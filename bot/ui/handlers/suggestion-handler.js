'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/suggestion-storage');

function buildSuggPanel(sugg, authorName) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  const name = sugg.anonymous ? 'Suggestion anonyme' : (authorName || `User ${sugg.user_id}`);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_information')} **Suggestion #${sugg.id}** · par ${name}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(sugg.content));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const statusLabels = {
    pending    : `${e('btn_tip')} En attente`,
    approved   : `${e('btn_success')} Approuvée`,
    rejected   : `${e('btn_error')} Rejetée`,
    implemented: `${e('ui_diamond')} Implémentée`,
  };
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${statusLabels[sugg.status] || sugg.status} · 👍 **${sugg.upvotes}** · 👎 **${sugg.downvotes}**` +
    (sugg.status_reason ? `\n\n**Raison :** ${sugg.status_reason}` : ''),
  ));

  const voteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggest:vote:up:${sugg.id}`)
      .setLabel(`${sugg.upvotes}`)
      .setEmoji('👍')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`suggest:vote:down:${sugg.id}`)
      .setLabel(`${sugg.downvotes}`)
      .setEmoji('👎')
      .setStyle(ButtonStyle.Danger),
  );
  const staffRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggest:approve:${sugg.id}`)
      .setLabel('Approuver')
      .setStyle(ButtonStyle.Success)
      .setDisabled(sugg.status !== 'pending'),
    new ButtonBuilder()
      .setCustomId(`suggest:reject:${sugg.id}`)
      .setLabel('Rejeter')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(sugg.status !== 'pending'),
    new ButtonBuilder()
      .setCustomId(`suggest:implement:${sugg.id}`)
      .setLabel('Implémentée')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(sugg.status === 'implemented'),
  );
  ct.addActionRowComponents(voteRow);
  ct.addActionRowComponents(staffRow);
  return { container: ct, rows: [voteRow, staffRow] };
}

async function refreshMessage(interaction, sugg) {
  try {
    let authorName = null;
    if (!sugg.anonymous) {
      const user = await interaction.client.users.fetch(sugg.user_id).catch(() => null);
      authorName = user?.username || null;
    }
    const { container, rows } = buildSuggPanel(sugg, authorName);
    await interaction.message.edit({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch (err) {
    console.error('[suggestion-handler] refresh:', err);
  }
}

function isStaff(interaction, cfg) {
  if (interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (cfg?.staff_role_id && interaction.member?.roles?.cache?.has(cfg.staff_role_id)) return true;
  return false;
}

async function handleSuggestionInteraction(interaction, params, _client) {
  try {
    const action = params[0];

    // ── Vote ────────────────────────────────────────────────────────────────
    if (action === 'vote') {
      const direction = params[1];
      const suggId = parseInt(params[2], 10);
      const sugg = storage.getSuggestion(suggId);
      if (!sugg) {
        return interaction.reply({
          content: `${e('btn_error')} Suggestion introuvable.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      if (sugg.status !== 'pending') {
        return interaction.reply({
          content: `${e('btn_tip')} Les votes sont clôturés sur cette suggestion.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const vote = direction === 'up' ? 1 : -1;
      storage.castVote(suggId, interaction.user.id, vote);
      const fresh = storage.getSuggestion(suggId);
      await refreshMessage(interaction, fresh);

      return interaction.reply({
        content: `${e('btn_success')} Vote enregistré.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    // ── Staff actions ───────────────────────────────────────────────────────
    if (action === 'approve' || action === 'reject' || action === 'implement') {
      const suggId = parseInt(params[1], 10);
      const sugg = storage.getSuggestion(suggId);
      if (!sugg) {
        return interaction.reply({
          content: `${e('btn_error')} Suggestion introuvable.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const cfg = storage.getConfig(interaction.guild.id);
      if (!isStaff(interaction, cfg)) {
        return interaction.reply({
          content: `${e('btn_error')} Action réservée au staff.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const titles = {
        approve   : 'Approuver la suggestion',
        reject    : 'Rejeter la suggestion',
        implement : 'Marquer comme implémentée',
      };
      const modal = new ModalBuilder()
        .setCustomId(`suggest_modal:${action}:${suggId}`)
        .setTitle(titles[action]);
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Raison (optionnel)')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setRequired(false),
      ));
      return interaction.showModal(modal).catch(() => {});
    }
  } catch (err) {
    console.error('[suggestion-handler] interaction:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

async function handleSuggestionModal(interaction, params, _client) {
  try {
    const action = params[0];
    const suggId = parseInt(params[1], 10);
    const sugg = storage.getSuggestion(suggId);
    if (!sugg) {
      return interaction.reply({
        content: `${e('btn_error')} Suggestion introuvable.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const cfg = storage.getConfig(interaction.guild.id);
    if (!isStaff(interaction, cfg)) {
      return interaction.reply({
        content: `${e('btn_error')} Action réservée au staff.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const reason = (interaction.fields.getTextInputValue('reason') || '').trim();
    const statusMap = {
      approve  : 'approved',
      reject   : 'rejected',
      implement: 'implemented',
    };
    const newStatus = statusMap[action];
    storage.setStatus(suggId, newStatus, reason, interaction.user.id);
    const fresh = storage.getSuggestion(suggId);

    // Repost dans approved_channel si action=approve et config présente
    if (action === 'approve' && cfg?.approved_channel_id) {
      try {
        const appCh = await interaction.guild.channels.fetch(cfg.approved_channel_id).catch(() => null);
        if (appCh) {
          let authorName = null;
          if (!fresh.anonymous) {
            const user = await interaction.client.users.fetch(fresh.user_id).catch(() => null);
            authorName = user?.username || null;
          }
          const { container, rows } = buildSuggPanel(fresh, authorName);
          await appCh.send({
            components: [container, ...rows],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => {});
        }
      } catch {}
    }

    // Mettre à jour le message original
    try {
      let authorName = null;
      if (!fresh.anonymous) {
        const user = await interaction.client.users.fetch(fresh.user_id).catch(() => null);
        authorName = user?.username || null;
      }
      const { container, rows } = buildSuggPanel(fresh, authorName);
      if (interaction.message) {
        await interaction.message.edit({
          components: [container, ...rows],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[suggestion-handler] refresh modal:', err);
    }

    return interaction.reply({
      content: `${e('btn_success')} Statut mis à jour : **${newStatus}**.`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
  } catch (err) {
    console.error('[suggestion-handler] modal:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

async function handleSuggconfigInteraction(interaction, params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: `${e('btn_error')} Permission requise.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const action = params[0];
    const guildId = interaction.guild.id;

    if (interaction.isChannelSelectMenu?.() && action === 'set_channel') {
      storage.setConfig(guildId, { channel_id: interaction.values[0] || null });
    } else if (interaction.isChannelSelectMenu?.() && action === 'set_approved') {
      storage.setConfig(guildId, { approved_channel_id: interaction.values[0] || null });
    } else if (interaction.isRoleSelectMenu?.() && action === 'set_staff_role') {
      storage.setConfig(guildId, { staff_role_id: interaction.values[0] || null });
    } else if (interaction.isStringSelectMenu?.() && action === 'set_cooldown') {
      storage.setConfig(guildId, { cooldown_seconds: parseInt(interaction.values[0], 10) || 300 });
    } else if (action === 'toggle_anonymous') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { anonymous_allowed: cur.anonymous_allowed ? 0 : 1 });
    } else if (action === 'toggle_approval') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { require_approval: cur.require_approval ? 0 : 1 });
    }

    const { buildPanel } = require('../../commands/configuration/suggestionconfig');
    const { container, rows } = buildPanel(interaction.guild);
    return interaction.update({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch (err) {
    console.error('[suggestion-handler] config:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

module.exports = {
  handleSuggestionInteraction,
  handleSuggestionModal,
  handleSuggconfigInteraction,
};
