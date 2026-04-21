'use strict';

const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { renderNukePanel, renderNukeHistoryPanel } = require('../panels/nuke-panel');
const { getNukeConfig, updateNukeConfig, checkCooldown, markNukeExecuted, logNuke } = require('../../core/nuke-helper');
const { createBackup } = require('../../core/backup-helper');
const { isOwner } = require('../../core/permissions');
const { EMOJIS } = require('../theme');
const { e } = require('../../core/emojis');

const MODE_LABELS = { classique: 'Classique', rapide: 'Rapide', urgence: 'Urgence' };

async function handleNukeInteraction(interaction) {
  if (!isOwner(interaction.user.id)) {
    return interaction.reply({ content: `${EMOJIS.cross()} Owner bot uniquement.`, flags: MessageFlags.Ephemeral });
  }

  const action  = interaction.customId.replace('nuke:', '');
  const guildId = interaction.guild.id;

  try {
    // ── Toggles cibles ───────────────────────────────────────────────────────
    if (action === 'toggle_channels' || action === 'toggle_roles' || action === 'toggle_emojis') {
      const cfg  = getNukeConfig(guildId) || {};
      const field = action === 'toggle_channels' ? 'targets_channels'
                  : action === 'toggle_roles'    ? 'targets_roles'
                  :                                'targets_emojis';
      updateNukeConfig(guildId, { [field]: cfg[field] === 0 ? 1 : 0 }, interaction.user.id);
      return interaction.update(renderNukePanel(guildId));
    }

    // ── Confirmation via modal ────────────────────────────────────────────────
    if (action.startsWith('confirm_')) {
      const mode = action.replace('confirm_', '');
      if (!MODE_LABELS[mode]) return interaction.reply({ content: `${EMOJIS.cross()} Mode inconnu.`, flags: MessageFlags.Ephemeral });

      const cooldown = checkCooldown(guildId, mode);
      if (cooldown.active) {
        const mins = Math.ceil(cooldown.remainingMs / 60000);
        return interaction.reply({
          content: `${EMOJIS.warning()} Cooldown actif — encore **${mins} min** avant un nouveau nuke (mode ${MODE_LABELS[mode]}).`,
          flags  : MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`nuke:execute_${mode}`)
        .setTitle(`Nuke ${MODE_LABELS[mode]} — Confirmation`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('server_name')
            .setLabel('Tape le nom EXACT du serveur pour confirmer')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100),
        ),
      );
      return interaction.showModal(modal);
    }

    // ── Exécution après modal ─────────────────────────────────────────────────
    if (action.startsWith('execute_')) {
      const mode = action.replace('execute_', '');
      if (!MODE_LABELS[mode]) return interaction.reply({ content: `${EMOJIS.cross()} Mode inconnu.`, flags: MessageFlags.Ephemeral });

      const typed = interaction.fields.getTextInputValue('server_name').trim();
      if (typed !== interaction.guild.name) {
        return interaction.reply({
          content: `${EMOJIS.cross()} Nom incorrect (\`${typed}\` ≠ \`${interaction.guild.name}\`) — nuke annulé.`,
          flags  : MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await executeNuke(interaction, mode);
      return;
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    if (action === 'history') return interaction.update(renderNukeHistoryPanel(guildId));
    if (action === 'back_main') return interaction.update(renderNukePanel(guildId));

  } catch (err) {
    const content = `${EMOJIS.cross()} Erreur : ${err.message}`;
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

async function executeNuke(interaction, mode) {
  const { guild } = interaction;
  const cfg       = getNukeConfig(guild.id) || {};
  const start     = Date.now();

  let backupName        = '';
  let channelsDeleted   = 0;
  let rolesDeleted      = 0;
  let emojisDeleted     = 0;
  let errorMsg          = null;

  await interaction.editReply({ content: `${e('ani_loading')} **Nuke ${MODE_LABELS[mode] || mode} en cours...** Backup en création...` }).catch(() => {});

  try {
    // Backup obligatoire
    backupName = createBackup(guild, `nuke-${mode}`);

    // Suppression en parallèle par catégorie
    const promises = [];

    if (cfg.targets_channels !== 0) {
      for (const ch of guild.channels.cache.values()) {
        promises.push(ch.delete(`Nuke ${mode} par ${interaction.user.tag}`).then(() => { channelsDeleted++; }).catch(() => {}));
      }
    }

    if (cfg.targets_roles !== 0) {
      for (const role of guild.roles.cache.values()) {
        if (role.id === guild.id) continue; // @everyone
        if (!role.editable)      continue; // au-dessus du bot
        promises.push(role.delete(`Nuke ${mode} par ${interaction.user.tag}`).then(() => { rolesDeleted++; }).catch(() => {}));
      }
    }

    if (cfg.targets_emojis !== 0) {
      for (const emoji of guild.emojis.cache.values()) {
        promises.push(emoji.delete(`Nuke ${mode}`).then(() => { emojisDeleted++; }).catch(() => {}));
      }
    }

    await Promise.allSettled(promises);

    markNukeExecuted(guild.id);

    // DM owner
    try {
      const ownerIds = (process.env.OWNER_IDS || process.env.BOT_OWNERS || '').split(',').map(s => s.trim()).filter(s => /^\d{15,20}$/.test(s));
      for (const ownerId of ownerIds) {
        const owner = await interaction.client.users.fetch(ownerId).catch(() => null);
        if (owner) {
          await owner.send(
            `💣 **Nuke exécuté** — \`${guild.name}\` (${guild.id})\n` +
            `Mode : **${mode}** · Par : <@${interaction.user.id}>\n` +
            `Salons: ${channelsDeleted} · Rôles: ${rolesDeleted} · Emojis: ${emojisDeleted}\n` +
            `Backup : \`${backupName}\``
          ).catch(() => {});
        }
      }
    } catch { /* non bloquant */ }

  } catch (err) {
    errorMsg = err.message;
  }

  const durationMs = Date.now() - start;
  logNuke({
    guildId         : guild.id,
    guildName       : guild.name,
    userId          : interaction.user.id,
    backupName,
    channelsDeleted,
    rolesDeleted,
    emojisDeleted,
    durationMs,
    success         : !errorMsg,
    error           : errorMsg,
  });

  const summary = errorMsg
    ? `${EMOJIS.cross()} Nuke partiel — Erreur : ${errorMsg}`
    : `${EMOJIS.check()} Nuke terminé — Salons: **${channelsDeleted}** · Rôles: **${rolesDeleted}** · Emojis: **${emojisDeleted}** · Backup: \`${backupName}\``;

  await interaction.editReply({ content: summary }).catch(() => {});
}

function register(client) {
  client.buttonHandlers.set('nuke', handleNukeInteraction);
  client.modalHandlers.set('nuke',  handleNukeInteraction);
}

module.exports = { handleNukeInteraction, register };
