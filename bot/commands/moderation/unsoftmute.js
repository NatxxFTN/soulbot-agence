'use strict';

// ── ;unsoftmute — restaure les rôles d'origine d'un membre softmuté ──────────

const { PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/response-builder');
const { db } = require('../../database');
const storage = require('../../core/security-storage');

const _active = db.prepare(`
  SELECT * FROM softmute_history WHERE guild_id = ? AND user_id = ? AND ended_at IS NULL
  ORDER BY id DESC LIMIT 1
`);
const _close = db.prepare('UPDATE softmute_history SET ended_at = unixepoch() WHERE id = ?');

module.exports = {
  name       : 'unsoftmute',
  aliases    : ['usmute'],
  category   : 'moderation',
  description: 'Restaure les rôles d\'un membre softmuté.',
  usage      : ';unsoftmute @user',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [PermissionFlagsBits.ModerateMembers],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Permission **Modérer les membres** requise.')] });
    }

    const targetId = (args[0] ?? '').replace(/[<@!>]/g, '');
    if (!/^\d{15,20}$/.test(targetId)) {
      return message.reply({ embeds: [errorEmbed('Usage', this.usage)] });
    }

    const row = _active.get(message.guild.id, targetId);
    if (!row) {
      return message.reply({ embeds: [errorEmbed('Pas de softmute actif', 'Ce membre n\'est pas softmuté.')] });
    }

    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (member) {
      const previous = JSON.parse(row.previous_roles || '[]')
        .filter(id => message.guild.roles.cache.has(id)); // rôles supprimés entre-temps
      await member.roles.set(previous, `Unsoftmute par ${message.author.tag}`);
    }
    _close.run(row.id);
    storage.logAction(message.guild.id, targetId, 'softmute', 'restore', `Unsoftmute par ${message.author.tag}`, message.channel.id);

    await message.reply({
      embeds: [successEmbed('Softmute levé',
        member
          ? `<@${targetId}> a retrouvé ses **${JSON.parse(row.previous_roles || '[]').length}** rôle(s) d'origine.`
          : `Entrée clôturée — le membre a quitté le serveur (rôles restaurés à son retour impossible, entrée fermée).`)],
      allowedMentions: { parse: [] },
    });
  },
};
