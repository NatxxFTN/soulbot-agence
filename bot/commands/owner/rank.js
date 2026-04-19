'use strict';

const E = require('../../utils/embeds');
const { getUserLevel, listGuildLevels } = require('../../core/permissions');
const { levelName }                     = require('../../core/permissions-levels');

module.exports = {
  name       : 'rank',
  aliases    : ['myperm', 'niveau'],
  description: 'Affiche le niveau de permission d\'un utilisateur sur ce serveur.',
  usage      : ';rank [@user]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    try {
      // ;rank list — liste tous les niveaux custom du serveur (owner seulement)
      if (args[0]?.toLowerCase() === 'list') {
        const rows = listGuildLevels(message.guild.id);
        if (!rows.length) {
          return message.channel.send({ embeds: [E.info('Niveaux', 'Aucun niveau custom défini sur ce serveur.')] });
        }
        const lines = rows.map(r => `<@${r.user_id}> — **${levelName(r.permission_level)}** *(par <@${r.granted_by}>)*`).join('\n');
        return message.channel.send({
          embeds: [E.base().setTitle(`Niveaux custom du serveur (${rows.length})`).setDescription(lines)],
        });
      }

      const target = message.mentions.users.first() ?? message.author;
      const level  = getUserLevel(target.id, message.guild.id);

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle('Niveau de permission')
            .addFields(
              { name: 'Utilisateur', value: `${target}`,       inline: true },
              { name: 'Niveau',      value: levelName(level),  inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
