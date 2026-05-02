'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const V3 = require('../../core/logs-v3-helper');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'logsset',
  aliases    : ['logset', 'setlogs', 'logschannel'],
  description: 'Définir le salon par défaut qui recevra les logs (fallback pour events non routés).',
  usage      : ';logsset #salon',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message) {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description: '`;logsset #salon` — mentionne un salon textuel.',
        category: 'Logs V3',
      })));
    }

    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Type invalide',
        description: 'Le salon doit être textuel ou d\'annonces.',
        category: 'Logs V3',
      })));
    }

    const me = message.guild.members.me;
    const perms = channel.permissionsFor(me);
    if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Permissions insuffisantes',
        description: `Je dois pouvoir **voir**, **écrire** et **envoyer des embeds** dans ${channel}.`,
        category: 'Logs V3',
      })));
    }

    const wasUnconfigured = !V3.getConfig(message.guild.id).default_channel_id;
    V3.setDefaultChannel(message.guild.id, channel.id, message.author.id);
    V3.setGlobalEnabled(message.guild.id, true, message.author.id);

    if (wasUnconfigured) {
      // Active tous les events sauf message_create
      for (const eventType of Object.keys(V3.EVENT_TYPES)) {
        const enabled = eventType !== 'message_create';
        V3.toggleEvent(message.guild.id, eventType, enabled);
      }
    }

    return message.reply(toEmbedReply(successEmbed({
      title       : 'Salon de logs par défaut défini',
      description : `Les logs non routés seront envoyés dans ${channel}.\n\n*Pour un setup complet auto (catégorie + 9 salons + routing), tape \`;logssetup\`.*`,
      fields      : [
        { name: '📍 Salon',  value: channel.toString(),                                           inline: true },
        { name: '📊 Events', value: `${Object.keys(V3.EVENT_TYPES).length} disponibles`,         inline: true },
        { name: '👤 Par',    value: message.author.tag,                                          inline: true },
      ],
      user        : message.author,
      category    : 'Logs V3',
    })));
  },
};
