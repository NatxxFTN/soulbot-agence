'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/tempvoc-storage');
const { renderTempvocPanel } = require('../panels/tempvoc-panel');

function ensureManageGuild(i) {
  if (!i.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    i.reply({ content: `${e('btn_error')} Permission **Gérer le serveur** requise.`, flags: MessageFlags.Ephemeral }).catch(() => {});
    return false;
  }
  return true;
}
async function refresh(i) {
  const panel = renderTempvocPanel(i.guild);
  await i.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
}

async function handleTempvocInteraction(interaction, params) {
  const action = params[0];
  if (!ensureManageGuild(interaction)) return;

  try {
    if (interaction.isChannelSelectMenu?.() && action === 'hub') {
      storage.setConfig(interaction.guild.id, { hub_channel_id: interaction.values[0] });
      return refresh(interaction);
    }
    if (interaction.isChannelSelectMenu?.() && action === 'category') {
      storage.setConfig(interaction.guild.id, { category_id: interaction.values[0] || null });
      return refresh(interaction);
    }
    if (interaction.isStringSelectMenu?.() && action === 'limit') {
      storage.setConfig(interaction.guild.id, { default_user_limit: parseInt(interaction.values[0], 10) || 0 });
      return refresh(interaction);
    }
    if (action === 'toggle_delete') {
      const c = storage.getConfig(interaction.guild.id) || {};
      storage.setConfig(interaction.guild.id, { delete_when_empty: c.delete_when_empty ? 0 : 1 });
      return refresh(interaction);
    }
    if (action === 'toggle_transfer') {
      const c = storage.getConfig(interaction.guild.id) || {};
      storage.setConfig(interaction.guild.id, { transfer_on_leave: c.transfer_on_leave ? 0 : 1 });
      return refresh(interaction);
    }
    if (action === 'toggle_enabled') {
      const c = storage.getConfig(interaction.guild.id) || {};
      storage.setConfig(interaction.guild.id, { enabled: c.enabled ? 0 : 1 });
      return refresh(interaction);
    }
    if (action === 'template') {
      const cur = storage.getConfig(interaction.guild.id) || {};
      const modal = new ModalBuilder()
        .setCustomId('tempvoc_modal:template')
        .setTitle('Template nom de salon')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('template')
            .setLabel('Utilise {user} pour le pseudo')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100).setRequired(true)
            .setValue(cur.default_name_template || '🎮 Salon de {user}'),
        ));
      return interaction.showModal(modal);
    }
    if (action === 'list') {
      const active = storage.listActive(interaction.guild.id);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_folder')} **Salons temp actifs** · ${active.length}`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      if (active.length === 0) {
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('btn_tip')} Aucun salon temp actuellement.`));
      } else {
        const lines = active.slice(0, 20).map(tv =>
          `• <#${tv.channel_id}> · owner <@${tv.owner_id}> · créé <t:${Math.floor(tv.created_at / 1000)}:R>`,
        );
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
      }
      ct.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tempvoc:back').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
      ));
      return interaction.update({ components: [ct], flags: MessageFlags.IsComponentsV2 });
    }
    if (action === 'back') return refresh(interaction);
  } catch (err) {
    console.error('[tempvoc-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `${e('btn_error')} ${err.message}`, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
}

async function handleTempvocModal(interaction, params) {
  if (!ensureManageGuild(interaction)) return;
  const action = params[0];
  if (action === 'template') {
    const tpl = interaction.fields.getTextInputValue('template').trim() || '🎮 Salon de {user}';
    storage.setConfig(interaction.guild.id, { default_name_template: tpl });
    return refresh(interaction);
  }
}

module.exports = { handleTempvocInteraction, handleTempvocModal };
