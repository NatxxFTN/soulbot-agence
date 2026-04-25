'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// INNOVATION HANDLER — router pour tous les customId "innovation:*"
// customId format : innovation:<section>:<action>[:<arg>]
// Sections : schedule, audit
// ═══════════════════════════════════════════════════════════════════════════

const { MessageFlags, AttachmentBuilder } = require('discord.js');
const { e } = require('../../core/emojis');
const scheduleStorage = require('../../core/schedule-storage');
const { renderSchedulePanel } = require('../panels/schedule-panel');
const { runAudit } = require('../../core/audit-helper');
const { renderAuditPanel } = require('../panels/audit-panel');

async function handleInnovationButton(interaction, params, client) {
  try {
    const [section, action, arg] = params;

    // ── SCHEDULE : cancel <id> ────────────────────────────────────────
    if (section === 'schedule' && action === 'cancel') {
      const id = parseInt(arg, 10);
      if (!id) return interaction.reply({ content: `${e('btn_error')} ID invalide.`, flags: MessageFlags.Ephemeral });

      if (!interaction.member?.permissions?.has('ManageGuild')) {
        return interaction.reply({ content: `${e('btn_error')} Permission manquante : ManageGuild.`, flags: MessageFlags.Ephemeral });
      }

      const ok = scheduleStorage.cancel(id, interaction.guild.id);
      if (!ok) {
        return interaction.reply({
          content: `${e('btn_error')} Schedule \`#${id}\` introuvable ou déjà exécuté.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const rows = scheduleStorage.listPending(interaction.guild.id);
      return interaction.update(renderSchedulePanel(interaction.guild, rows));
    }

    // ── AUDIT : refresh ────────────────────────────────────────────────
    if (section === 'audit' && action === 'refresh') {
      if (!interaction.member?.permissions?.has('ManageGuild')) {
        return interaction.reply({ content: `${e('btn_error')} Permission manquante : ManageGuild.`, flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      await interaction.guild.members.fetch().catch(() => {});
      const report = await runAudit(interaction.guild);
      return interaction.editReply(renderAuditPanel(interaction.guild, report));
    }

    // ── AUDIT : export JSON ────────────────────────────────────────────
    if (section === 'audit' && action === 'export') {
      if (!interaction.member?.permissions?.has('ManageGuild')) {
        return interaction.reply({ content: `${e('btn_error')} Permission manquante : ManageGuild.`, flags: MessageFlags.Ephemeral });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const report = await runAudit(interaction.guild);
      const buf = Buffer.from(JSON.stringify({
        guild: { id: interaction.guild.id, name: interaction.guild.name },
        generatedAt: new Date().toISOString(),
        report,
      }, null, 2), 'utf8');
      const file = new AttachmentBuilder(buf, { name: `audit-${interaction.guild.id}-${Date.now()}.json` });
      return interaction.editReply({
        content: `${e('btn_success')} Rapport JSON prêt — score global **${report.globalScore}/100**.`,
        files  : [file],
      });
    }

    // Section inconnue → noop silencieux
  } catch (err) {
    console.error('[innovation-handler] button:', err);
    const payload = { content: `${e('btn_error')} Erreur interne handler innovation.`, flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

function register(client) {
  client.buttonHandlers.set('innovation', handleInnovationButton);
}

module.exports = { register, handleInnovationButton };
