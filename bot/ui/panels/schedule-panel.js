'use strict';

const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, SectionBuilder,
} = require('discord.js');

const {
  newContainer, separator, text, buildHeader, toV2Payload,
} = require('./_premium-helpers');

const PER_PAGE = 10;

const ACTION_META = {
  ban         : { emoji: '🔨', label: 'Ban' },
  unban       : { emoji: '🕊️', label: 'Unban' },
  kick        : { emoji: '👢', label: 'Kick' },
  role_add    : { emoji: '➕', label: 'Ajout rôle' },
  role_remove : { emoji: '➖', label: 'Retrait rôle' },
  message     : { emoji: '💬', label: 'Message' },
};

/**
 * Rend le panel liste des schedules pending (Components V2 premium).
 * @param {import('discord.js').Guild} guild
 * @param {object[]} rows — résultats de storage.listPending
 */
function renderSchedulePanel(guild, rows) {
  const container = newContainer();

  buildHeader(container, {
    emojiKey : 'btn_calendar',
    title    : `Schedules programmés — ${guild.name}`,
    subtitle : `**${rows.length}** schedule(s) en attente`,
  });

  if (!rows.length) {
    container.addTextDisplayComponents(
      text(
        `*Aucun schedule en attente.*\n\n` +
        `Crée-en un avec \`;schedule @user ban 2h [raison]\`.`,
      ),
    );
    container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Scheduler v1.0`));
    return toV2Payload(container);
  }

  const page = rows.slice(0, PER_PAGE);

  for (const row of page) {
    const ts = Math.floor(row.execute_at / 1000);
    const meta = ACTION_META[row.action] || { emoji: '•', label: row.action };
    const params = row.params ? JSON.parse(row.params) : {};
    const targetStr = row.action === 'message' ? `<#${row.target_id}>` : `<@${row.target_id}>`;
    const extra  = row.action === 'message' && params.content
      ? `\n> ${String(params.content).slice(0, 140)}`
      : row.reason ? `\n*${row.reason}*` : '';

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          text(
            `**\`#${row.id}\`** · ${meta.emoji} **${meta.label}** → ${targetStr}\n` +
            `<t:${ts}:F> (<t:${ts}:R>)${extra}`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`innovation:schedule:cancel:${row.id}`)
            .setLabel('Annuler')
            .setStyle(ButtonStyle.Danger),
        ),
    );
  }

  if (rows.length > PER_PAGE) {
    container.addSeparatorComponents(separator('Small'));
    container.addTextDisplayComponents(
      text(`*+ ${rows.length - PER_PAGE} schedule(s) non affiché(s). Utilise \`;schedule cancel <id>\`.*`),
    );
  }

  container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Scheduler v1.0`));

  return toV2Payload(container);
}

module.exports = { renderSchedulePanel };
