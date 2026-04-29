'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET = db.prepare('SELECT * FROM greeting_config WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO greeting_config (guild_id, leave_channel_id, leave_message, leave_enabled, updated_at)
  VALUES (?, ?, ?, ?, unixepoch())
  ON CONFLICT(guild_id) DO UPDATE SET
    leave_channel_id = COALESCE(excluded.leave_channel_id, greeting_config.leave_channel_id),
    leave_message    = COALESCE(excluded.leave_message, greeting_config.leave_message),
    leave_enabled    = COALESCE(excluded.leave_enabled, greeting_config.leave_enabled),
    updated_at       = unixepoch()
`);

module.exports = {
  name       : 'goodbye',
  aliases    : ['adieu', 'leave'],
  description: 'Configure le message de départ auto.',
  usage      : ';goodbye <on|off|test|set|status> [#salon ou message]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const sub = (args[0] || 'status').toLowerCase();
    const guild = message.guild;
    const cfg = STMT_GET.get(guild.id);

    if (sub === 'status') {
      return message.reply({
        embeds: [E.base().setTitle('👋 Goodbye status')
          .addFields(
            { name: 'État',    value: cfg?.leave_enabled ? '🟢 Actif' : '🔴 Désactivé', inline: true },
            { name: 'Salon',   value: cfg?.leave_channel_id ? `<#${cfg.leave_channel_id}>` : '_(non défini)_', inline: true },
            { name: 'Message', value: `\`\`\`${cfg?.leave_message || '{username} a quitté.'}\`\`\`` },
          )],
      });
    }

    if (sub === 'on' || sub === 'off') {
      STMT_UPSERT.run(guild.id, null, null, sub === 'on' ? 1 : 0);
      return message.reply({ embeds: [E.success(`Goodbye ${sub === 'on' ? 'activé' : 'désactivé'}`)] });
    }

    if (sub === 'set') {
      const channel = message.mentions.channels.first();
      let txt = args.slice(1).join(' ');
      if (channel) txt = txt.replace(/<#\d+>/, '').trim();
      if (!txt && !channel) return message.reply({ embeds: [E.error('Usage', '`;goodbye set [#salon] <message>`')] });
      STMT_UPSERT.run(guild.id, channel?.id || null, txt || null, null);
      return message.reply({ embeds: [E.success('Goodbye configuré')
        .setDescription((channel ? `Salon : ${channel}\n` : '') + (txt ? `Message : \`${txt.slice(0, 200)}\`` : ''))]});
    }

    if (sub === 'test') {
      const tpl = cfg?.leave_message || '{username} a quitté **{server}**.';
      const rendered = tpl
        .replace(/\{user\}/g, `<@${message.author.id}>`)
        .replace(/\{username\}/g, message.author.username)
        .replace(/\{server\}/g, guild.name)
        .replace(/\{membercount\}/g, String(guild.memberCount));
      const ch = guild.channels.cache.get(cfg?.leave_channel_id) || message.channel;
      return ch.send({ embeds: [E.info('🧪 Test goodbye', rendered)] });
    }

    return message.reply({ embeds: [E.error('Usage', '`;goodbye <on|off|test|set|status>`')] });
  },
};
