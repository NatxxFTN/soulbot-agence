'use strict';

const { ChannelType } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET = db.prepare('SELECT * FROM greeting_config WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO greeting_config (guild_id, join_channel_id, join_message, join_enabled, updated_at)
  VALUES (?, ?, ?, ?, unixepoch())
  ON CONFLICT(guild_id) DO UPDATE SET
    join_channel_id = COALESCE(excluded.join_channel_id, greeting_config.join_channel_id),
    join_message    = COALESCE(excluded.join_message, greeting_config.join_message),
    join_enabled    = COALESCE(excluded.join_enabled, greeting_config.join_enabled),
    updated_at      = unixepoch()
`);

function applyPlaceholders(template, member, guild) {
  return template
    .replace(/\{user\}/g, `<@${member.id}>`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g, guild.name)
    .replace(/\{membercount\}/g, String(guild.memberCount));
}

module.exports = {
  name       : 'welcome',
  aliases    : ['bienvenue'],
  description: 'Configure le message de bienvenue auto.',
  usage      : ';welcome <on|off|test|set|status> [#salon ou message]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const sub = (args[0] || 'status').toLowerCase();
    const guild = message.guild;
    const cfg = STMT_GET.get(guild.id);

    if (sub === 'status') {
      return message.reply({
        embeds: [E.base().setTitle('🚪 Welcome status')
          .addFields(
            { name: 'État',    value: cfg?.join_enabled ? '🟢 Actif' : '🔴 Désactivé', inline: true },
            { name: 'Salon',   value: cfg?.join_channel_id ? `<#${cfg.join_channel_id}>` : '_(non défini)_', inline: true },
            { name: 'Message', value: `\`\`\`${cfg?.join_message || 'Bienvenue {user} !'}\`\`\`` },
            { name: 'Placeholders', value: '`{user}`, `{username}`, `{server}`, `{membercount}`' },
          )],
      });
    }

    if (sub === 'on' || sub === 'off') {
      const enabled = sub === 'on' ? 1 : 0;
      STMT_UPSERT.run(guild.id, null, null, enabled);
      return message.reply({ embeds: [E.success(`Welcome ${enabled ? 'activé' : 'désactivé'}`)] });
    }

    if (sub === 'set') {
      // Format : ;welcome set [#salon] <message>
      const channel = message.mentions.channels.first();
      let txt = args.slice(1).join(' ');
      if (channel) txt = txt.replace(/<#\d+>/, '').trim();
      if (!txt && !channel) return message.reply({ embeds: [E.error('Usage', '`;welcome set [#salon] <message>`')] });

      STMT_UPSERT.run(guild.id, channel?.id || null, txt || null, null);
      return message.reply({ embeds: [E.success('Welcome configuré')
        .setDescription((channel ? `Salon : ${channel}\n` : '') + (txt ? `Message : \`${txt.slice(0, 200)}\`` : ''))]});
    }

    if (sub === 'test') {
      const tpl = cfg?.join_message || 'Bienvenue {user} sur **{server}** !';
      const channel = guild.channels.cache.get(cfg?.join_channel_id) || message.channel;
      const rendered = applyPlaceholders(tpl, message.member, guild);
      return channel.send({ embeds: [E.info('🧪 Test welcome', rendered)] });
    }

    return message.reply({ embeds: [E.error('Usage', '`;welcome <on|off|test|set|status>`')] });
  },
};
