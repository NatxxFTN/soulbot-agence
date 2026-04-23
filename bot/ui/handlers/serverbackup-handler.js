'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/serverbackup-storage');
const { createBackup } = require('../../core/serverbackup-scheduler');

async function refreshConfig(interaction) {
  const { buildPanel } = require('../../commands/owner/serverbackupconfig');
  const { container, rows } = buildPanel(interaction.guild);
  return interaction.update({
    components: [container, ...rows],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => {});
}

async function handleServerbackupInteraction(interaction, params, _client) {
  try {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: `${e('btn_error')} Permission requise.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    const ns = interaction.customId.split(':')[0];

    // ── sbackcfg ─────────────────────────────────────────────────────────────
    if (ns === 'sbackcfg') {
      const action = params[0];
      const guildId = interaction.guild.id;

      if (interaction.isStringSelectMenu?.() && action === 'set_interval') {
        storage.setConfig(guildId, { interval_days: parseInt(interaction.values[0], 10) || 7 });
      } else if (interaction.isStringSelectMenu?.() && action === 'set_max') {
        storage.setConfig(guildId, { max_backups: parseInt(interaction.values[0], 10) || 5 });
      } else if (interaction.isChannelSelectMenu?.() && action === 'set_notify') {
        storage.setConfig(guildId, { notify_channel: interaction.values[0] || null });
      } else if (action === 'toggle_enabled') {
        const cur = storage.getConfig(guildId) || {};
        storage.setConfig(guildId, { enabled: cur.enabled ? 0 : 1 });
      } else if (action === 'toggle_members') {
        const cur = storage.getConfig(guildId) || {};
        storage.setConfig(guildId, { include_members: cur.include_members ? 0 : 1 });
      } else if (action === 'backup_now') {
        const cfg = storage.getConfig(guildId) || {};
        await interaction.deferUpdate().catch(() => {});
        const res = await createBackup(interaction.guild, cfg, false);
        if (res && cfg.notify_channel) {
          try {
            const ch = await interaction.guild.channels.fetch(cfg.notify_channel).catch(() => null);
            if (ch) {
              await ch.send({
                content: `${e('btn_success')} Backup manuel : **${res.name}** · ${(res.size / 1024).toFixed(1)} KB`,
              }).catch(() => {});
            }
          } catch {}
        }
        return refreshConfig(interaction);
      }

      return refreshConfig(interaction);
    }

    // ── sbackrestore ─────────────────────────────────────────────────────────
    if (ns === 'sbackrestore') {
      const action = params[0];

      if (action === 'cancel') {
        const ct = new ContainerBuilder().setAccentColor(0xFF0000);
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e('btn_tip')} Restauration annulée.`,
        ));
        return interaction.update({
          components: [ct],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      }

      if (action === 'step1') {
        const id = parseInt(params[1], 10);
        const snap = storage.getSnapshot(id);
        if (!snap || snap.guild_id !== interaction.guild.id) {
          return interaction.update({
            content: `${e('btn_error')} Snapshot introuvable.`,
            components: [],
          }).catch(() => {});
        }

        const ct = new ContainerBuilder().setAccentColor(0xFF0000);
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e('btn_error')} **Étape 2 — Confirmation finale**`,
        ));
        ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `Aperçu de la restauration de \`${snap.name}\` :\n\n` +
          `• Restaurerait **${snap.roles_count}** rôles\n` +
          `• Restaurerait **${snap.channels_count}** salons\n` +
          `• Taille compressée : **${(snap.size_bytes / 1024).toFixed(1)} KB**\n\n` +
          `${e('btn_tip')} **L'exécution réelle est désactivée** dans cette version. ` +
          `Clique sur *Exécuter (stub)* pour voir le log console simulé.`,
        ));

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`sbackrestore:execute:${id}`)
            .setLabel('Exécuter (stub)')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('sbackrestore:cancel')
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Secondary),
        );
        ct.addActionRowComponents(row);

        return interaction.update({
          components: [ct, row],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      }

      if (action === 'execute') {
        const id = parseInt(params[1], 10);
        const snap = storage.getSnapshot(id);
        if (!snap || snap.guild_id !== interaction.guild.id) {
          return interaction.update({
            content: `${e('btn_error')} Snapshot introuvable.`,
            components: [],
          }).catch(() => {});
        }

        // Stub
        console.log(`[serverbackup] STUB restore: would restore ${snap.channels_count} channels, ${snap.roles_count} roles from snapshot #${id}`);

        const ct = new ContainerBuilder().setAccentColor(0xFF0000);
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e('btn_tip')} **Stub exécuté**`,
        ));
        ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `Aurait restauré :\n` +
          `• **${snap.channels_count}** salons\n` +
          `• **${snap.roles_count}** rôles\n\n` +
          `Aucune modification réelle effectuée. La restauration complète sera ajoutée dans une version ultérieure.`,
        ));

        return interaction.update({
          components: [ct],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[serverbackup-handler]', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

module.exports = {
  handleServerbackupInteraction,
};
