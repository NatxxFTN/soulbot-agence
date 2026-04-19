'use strict';

const E = require('../../utils/embeds');
const { removeUserLevel, getUserLevel } = require('../../core/permissions');
const { LEVELS, levelName }             = require('../../core/permissions-levels');

module.exports = {
  name       : 'removeperm',
  aliases    : ['demote', 'rmperm'],
  description: 'Retire le niveau de permission custom d\'un utilisateur (retour USER par défaut).',
  usage      : ';removeperm <@user>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [E.usage(';', 'removeperm <@user>')] });

      const currentLevel = getUserLevel(target.id, message.guild.id);
      if (currentLevel === LEVELS.OWNER) {
        return message.reply({ embeds: [E.error('Action impossible', 'Impossible de modifier le niveau d\'un Owner du bot.')] });
      }
      if (currentLevel === LEVELS.USER) {
        return message.reply({ embeds: [E.warning('Déjà au niveau par défaut', `${target} est déjà au niveau **${levelName(LEVELS.USER)}**.`)] });
      }

      removeUserLevel(target.id, message.guild.id);

      return message.channel.send({
        embeds: [
          E.success('Permission retirée')
            .addFields(
              { name: 'Utilisateur',   value: `${target}`,                inline: true },
              { name: 'Niveau retiré', value: levelName(currentLevel),    inline: true },
              { name: 'Retour à',      value: levelName(LEVELS.USER),     inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
