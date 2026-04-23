'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelSelectMenuBuilder, StringSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const storage = require('../../core/tempvoc-storage');

function renderTempvocPanel(guild) {
  const cfg = storage.getConfig(guild.id) || {
    hub_channel_id: null, category_id: null,
    default_name_template: '🎮 Salon de {user}',
    default_user_limit: 0, delete_when_empty: 1, transfer_on_leave: 1, enabled: 1,
  };

  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ani_diamond')} **Salons vocaux temporaires** ${e('ani_diamond')}`,
  ));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const statusIcon = cfg.enabled ? '🟢' : '🔴';
  const statusTxt  = cfg.enabled ? '**Actif**' : '**Inactif**';
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${statusIcon} Statut : ${statusTxt}\n` +
    `${e('ui_speaker')} Hub : ${cfg.hub_channel_id ? `<#${cfg.hub_channel_id}>` : '*non défini*'}\n` +
    `${e('ui_folder')} Catégorie : ${cfg.category_id ? `<#${cfg.category_id}>` : '*défaut (celle du hub)*'}\n` +
    `${e('btn_edit')} Template : \`${cfg.default_name_template}\`\n` +
    `${e('ui_user')} Limite users : **${cfg.default_user_limit || 'illimité'}**\n` +
    `${e('btn_trash')} Auto-delete si vide : ${cfg.delete_when_empty ? '🟢' : '🔴'}\n` +
    `${e('ui_user')} Transfert auto owner : ${cfg.transfer_on_leave ? '🟢' : '🔴'}`,
  ));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Hub channel selector
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ui_speaker')} **Salon hub** (déclencheur)`,
  ));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('tempvoc:hub')
        .setPlaceholder('Choisis le salon vocal hub')
        .addChannelTypes(ChannelType.GuildVoice)
        .setMinValues(1).setMaxValues(1),
    ),
  );

  // Category selector
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ui_folder')} **Catégorie parent** (où créer les salons temp)`,
  ));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('tempvoc:category')
        .setPlaceholder('Catégorie (optionnel — sinon hérite du hub)')
        .addChannelTypes(ChannelType.GuildCategory)
        .setMinValues(0).setMaxValues(1),
    ),
  );

  // User limit select
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('tempvoc:limit')
        .setPlaceholder(`Limite users actuelle : ${cfg.default_user_limit || 'illimité'}`)
        .addOptions([
          { label: 'Illimité',  value: '0'  },
          { label: '2 users',   value: '2'  },
          { label: '5 users',   value: '5'  },
          { label: '10 users',  value: '10' },
          { label: '20 users',  value: '20' },
          { label: '50 users',  value: '50' },
          { label: '99 users',  value: '99' },
        ]),
    ),
  );

  // Toggles + template button
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tempvoc:template').setLabel('Template nom').setEmoji(forButton('btn_edit')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tempvoc:toggle_delete').setLabel(cfg.delete_when_empty ? 'Auto-delete: ON' : 'Auto-delete: OFF').setStyle(cfg.delete_when_empty ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tempvoc:toggle_transfer').setLabel(cfg.transfer_on_leave ? 'Transfert: ON' : 'Transfert: OFF').setStyle(cfg.transfer_on_leave ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tempvoc:toggle_enabled').setLabel(cfg.enabled ? 'Désactiver système' : 'Activer système').setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    ),
  );

  const active = storage.listActive(guild.id);
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tempvoc:list').setLabel(`${active.length} salons actifs`).setEmoji(forButton('ui_folder')).setStyle(ButtonStyle.Primary),
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_tip')} Les utilisateurs gèrent leur salon via \`;vc <action>\` — tape \`;tempvoccmd\` pour la liste.`,
  ));

  return container;
}

module.exports = { renderTempvocPanel };
