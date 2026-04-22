'use strict';

const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const { setConfig } = require('../../core/ticket-helper');
const { e, forButton } = require('../../core/emojis');

module.exports = {
  name       : 'quickticket',
  aliases    : ['qticket', 'qt'],
  description: 'Configuration rapide du système de tickets + envoi du panel.',
  usage      : ';quickticket [@rôle_staff]',
  cooldown   : 10,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu dois être administrateur.')] });
    }

    const staffRole = message.mentions.roles.first() ?? null;

    try {
      const category = await message.guild.channels.create({
        name: '🎫 Tickets',
        type: ChannelType.GuildCategory,
      });

      const logsChannel = await message.guild.channels.create({
        name  : 'ticket-logs',
        type  : ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: message.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : []),
        ],
      });

      setConfig(message.guild.id, {
        category_id    : category.id,
        log_channel_id : logsChannel.id,
        staff_role_id  : staffRole?.id ?? null,
        panel_channel_id: message.channel.id,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open')
          .setLabel('Ouvrir un ticket')
          .setEmoji(forButton('cat_ticket'))
          .setStyle(ButtonStyle.Primary),
      );

      const panel = await message.channel.send({
        embeds: [
          E.base()
            .setTitle(`${e('cat_ticket')} Support`)
            .setDescription('Clique sur le bouton ci-dessous pour ouvrir un ticket.\nUn membre du staff te répondra dès que possible.'),
        ],
        components: [row],
      });

      setConfig(message.guild.id, { panel_message_id: panel.id });

      return message.reply({
        embeds: [
          E.success('Tickets configurés')
            .addFields(
              { name: 'Catégorie', value: category.toString(),   inline: true },
              { name: 'Logs',      value: logsChannel.toString(), inline: true },
              { name: 'Staff',     value: staffRole?.toString() ?? '*non défini*', inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
