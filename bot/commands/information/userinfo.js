'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name      : 'userinfo',
  aliases   : ['ui', 'whois'],
  description: 'Informations sur un utilisateur du serveur.',
  usage     : ';userinfo [@utilisateur]',
  cooldown  : 5,
  guildOnly : true,

  async execute(message, args) {
    const target = message.mentions.members.first() ?? message.member;
    const user   = target.user;
    const roles  = target.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .join(' ') || 'Aucun';

    const embed = E.base()
      .setTitle(`${user.username}${user.discriminator !== '0' ? '#' + user.discriminator : ''}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID',           value: user.id,                                                      inline: true  },
        { name: 'Bot',          value: user.bot ? 'Oui' : 'Non',                                     inline: true  },
        { name: 'Compte créé',  value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,          inline: true  },
        { name: 'A rejoint',    value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`,         inline: true  },
        { name: 'Surnom',       value: target.nickname ?? 'Aucun',                                   inline: true  },
        { name: 'Rôles',        value: roles.length > 1024 ? roles.slice(0, 1020) + '...' : roles,  inline: false },
      )
      .setFooter({ text: target.nickname ? `Surnom: ${target.nickname}` : 'Aucun surnom' });

    message.channel.send({ embeds: [embed] });
  },
};
