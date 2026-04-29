'use strict';

const { ChannelType } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_DEL = db.prepare('DELETE FROM lockdown_timed WHERE guild_id = ? AND channel_id = ?');

module.exports = {
  name       : 'unlock',
  aliases    : ['unlockch', 'deverrouille'],
  description: 'Déverrouille un salon précédemment lock.',
  usage      : ';unlock <#salon>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageChannels'],

  async execute(message) {
    const channel = message.mentions.channels.first() || message.channel;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return message.reply({ embeds: [E.error('Type invalide', 'Seuls les salons textuels.')] });
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null,
      }, { reason: `[unlock by ${message.author.tag}]` });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur perms', err.message)] });
    }

    try { STMT_DEL.run(message.guild.id, channel.id); } catch {}

    await channel.send({
      embeds: [E.success('🔓 Salon déverrouillé', `Déverrouillé par ${message.author}.`)],
    }).catch(() => {});

    return message.reply({ embeds: [E.success('Unlock OK', `${channel} déverrouillé.`)] });
  },
};
