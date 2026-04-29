'use strict';

const { AttachmentBuilder } = require('discord.js');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'serverbackup',
  aliases    : ['srvbackup', 'sbackup'],
  description: 'Exporte la config serveur (rôles, salons, settings) en JSON.',
  usage      : ';serverbackup',
  cooldown   : 60,
  guildOnly  : true,
  permissions: ['Administrator'],

  async execute(message) {
    const guild = message.guild;
    const status = await message.reply({ embeds: [E.info('Backup en cours...', 'Sérialisation rôles + salons + settings.')] });

    const data = {
      meta: {
        guild_id  : guild.id,
        guild_name: guild.name,
        owner_id  : guild.ownerId,
        exported_at: new Date().toISOString(),
        exported_by: message.author.tag,
        version   : 'serverbackup-v1',
      },
      settings: {
        name             : guild.name,
        description      : guild.description || null,
        verificationLevel: guild.verificationLevel,
        afkChannelId     : guild.afkChannelId,
        systemChannelId  : guild.systemChannelId,
        rulesChannelId   : guild.rulesChannelId,
        publicUpdatesChannelId: guild.publicUpdatesChannelId,
        preferredLocale  : guild.preferredLocale,
        premiumTier      : guild.premiumTier,
        memberCount      : guild.memberCount,
      },
      roles: Array.from(guild.roles.cache.values())
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => ({
          id          : r.id,
          name        : r.name,
          color       : r.color,
          hex         : `#${r.color.toString(16).padStart(6, '0').toUpperCase()}`,
          position    : r.position,
          permissions : r.permissions.toArray(),
          mentionable : r.mentionable,
          hoist       : r.hoist,
          managed     : r.managed,
          memberCount : r.members.size,
        })),
      channels: Array.from(guild.channels.cache.values())
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(c => ({
          id        : c.id,
          name      : c.name,
          type      : c.type,
          parentId  : c.parentId,
          position  : c.position,
          topic     : c.topic || null,
          nsfw      : c.nsfw || false,
          rateLimit : c.rateLimitPerUser || 0,
          bitrate   : c.bitrate || null,
          userLimit : c.userLimit || null,
          permissionOverwrites: c.permissionOverwrites?.cache.map(po => ({
            id   : po.id,
            type : po.type,
            allow: po.allow.toArray(),
            deny : po.deny.toArray(),
          })) || [],
        })),
      categoriesCount: guild.channels.cache.filter(c => c.type === 4).size,
      rolesCount     : guild.roles.cache.size,
      channelsCount  : guild.channels.cache.size,
    };

    const json = JSON.stringify(data, null, 2);
    const buf = Buffer.from(json, 'utf8');
    const filename = `serverbackup-${guild.id}-${Date.now()}.json`;

    return status.edit({
      embeds: [
        E.success('Backup serveur prêt')
          .setDescription(`**${data.rolesCount}** rôles · **${data.channelsCount}** salons · **${(json.length / 1024).toFixed(1)} KB**`)
          .addFields({ name: 'Restore', value: '`;serverrestore` (avec attachment .json)' }),
      ],
      files: [new AttachmentBuilder(buf, { name: filename })],
    });
  },
};
