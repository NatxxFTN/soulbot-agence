'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');

const ARCHIVE_CATEGORY_NAME = '📁 Archives';

module.exports = {
  name       : 'archive',
  aliases    : ['archiver'],
  description: 'Archive un salon (read-only, déplacé dans 📁 Archives).',
  usage      : ';archive <#salon>',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['ManageChannels'],

  async execute(message) {
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply({ embeds: [E.error('Salon manquant', 'Mentionne un salon.')] });
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return message.reply({ embeds: [E.error('Type invalide', 'Seuls les salons textuels.')] });
    }

    const guild = message.guild;

    let archiveCat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === ARCHIVE_CATEGORY_NAME);
    if (!archiveCat) {
      try {
        archiveCat = await guild.channels.create({
          name: ARCHIVE_CATEGORY_NAME,
          type: ChannelType.GuildCategory,
          reason: `[archive by ${message.author.tag}]`,
        });
      } catch (err) {
        return message.reply({ embeds: [E.error('Erreur catégorie', err.message)] });
      }
    }

    const newName = channel.name.startsWith('archived-') ? channel.name : `archived-${channel.name}`;

    try {
      await channel.setName(newName, `[archive by ${message.author.tag}]`);
      await channel.setParent(archiveCat.id, { lockPermissions: false, reason: `[archive]` });
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
      }, { reason: '[archive]' });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur archivage', err.message)] });
    }

    return message.reply({
      embeds: [E.success('Salon archivé', `${channel} déplacé dans **${ARCHIVE_CATEGORY_NAME}** en read-only.`)],
    });
  },
};
