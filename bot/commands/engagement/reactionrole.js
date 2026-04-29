'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_INSERT = db.prepare(
  'INSERT INTO guild_reaction_roles (guild_id, channel_id, message_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'reactionrole',
  aliases    : ['rr', 'rrole'],
  description: 'Rôle automatique via réaction sur un message.',
  usage      : ';reactionrole <#salon> <message_id> <@role> <emoji>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const channel = message.mentions.channels.first();
    const role = message.mentions.roles.first();
    const messageId = args.find(a => /^\d{17,20}$/.test(a));
    const emoji = args.find(a => !a.startsWith('<#') && !a.startsWith('<@&') && !/^\d{17,20}$/.test(a));

    if (!channel || !role || !messageId || !emoji) {
      return message.reply({ embeds: [E.error('Usage', '`;reactionrole <#salon> <message_id> <@role> <emoji>`')] });
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({ embeds: [E.error('Hiérarchie', 'Mon rôle doit être au-dessus.')] });
    }

    let target;
    try { target = await channel.messages.fetch(messageId); }
    catch { return message.reply({ embeds: [E.error('Message introuvable', 'Vérifie l\'ID.')] }); }

    try { await target.react(emoji); }
    catch (err) {
      return message.reply({ embeds: [E.error('Réaction impossible', `Emoji invalide ou inaccessible : ${err.message}`)] });
    }

    try {
      STMT_INSERT.run(message.guild.id, channel.id, messageId, emoji, role.id);
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur DB', err.message)] });
    }

    return message.reply({
      embeds: [E.success('Reaction role ajouté', `${emoji} sur [ce message](${target.url}) → ${role}`)],
    });
  },
};
