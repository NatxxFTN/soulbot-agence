'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

let parseDuration;
try { parseDuration = require('ms'); } catch { parseDuration = () => null; }

const STMT_LOCK = db.prepare(`
  INSERT INTO lockdown_timed (guild_id, channel_id, expires_at, locked_by)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(guild_id, channel_id) DO UPDATE SET expires_at = excluded.expires_at, locked_by = excluded.locked_by
`);

module.exports = {
  name       : 'lockdown',
  aliases    : ['lockch', 'verrouille'],
  description: 'Verrouille un salon (optionnellement avec durée).',
  usage      : ';lockdown <#salon> [durée]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageChannels'],

  async execute(message, args) {
    const channel = message.mentions.channels.first() || message.channel;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      return message.reply({ embeds: [E.error('Type invalide', 'Seuls les salons textuels.')] });
    }

    const duration = args.find(a => /^\d+[smhd]$/.test(a));
    const durationMs = duration ? parseDuration(duration) : null;

    try {
      await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
      }, { reason: `[lockdown by ${message.author.tag}]` });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur perms', err.message)] });
    }

    if (durationMs && durationMs > 0) {
      const expiresAt = Math.floor((Date.now() + durationMs) / 1000);
      try { STMT_LOCK.run(message.guild.id, channel.id, expiresAt, message.author.id); } catch {}
    }

    await channel.send({
      embeds: [E.warning('🔒 Salon verrouillé', `Verrouillé par ${message.author}` + (duration ? `\nAuto-unlock dans **${duration}**.` : ''))],
    }).catch(() => {});

    return message.reply({ embeds: [E.success('Lockdown actif', `${channel} verrouillé${duration ? ` (${duration})` : ''}.`)] });
  },
};
