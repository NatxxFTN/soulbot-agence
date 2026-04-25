'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'guildMemberAdd',

  async execute(member) {
    if (member.user.bot) return;

    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

    await L.log(member.guild, 'member_join', {
      description: `${member} a rejoint le serveur.`,
      fields: [
        { name: 'Utilisateur', value: `${member.user.tag} (\`${member.id}\`)`,               inline: true },
        { name: 'Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Âge compte',  value: `${accountAgeDays} jour(s)`,                           inline: true },
        { name: 'Membres',     value: `${member.guild.memberCount}`,                         inline: true },
      ],
      summary: `${member.user.tag} a rejoint (${accountAgeDays}j)`,
    });
  },
};
