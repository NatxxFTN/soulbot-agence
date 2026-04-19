'use strict';

const E = require('../../utils/embeds');
const { setUserLevel, getUserLevel }    = require('../../core/permissions');
const { LEVELS, levelName }             = require('../../core/permissions-levels');

const ALIASES_MAP = {
  admin     : LEVELS.ADMIN,
  mod       : LEVELS.MOD,
  modérateur: LEVELS.MOD,
  moderateur: LEVELS.MOD,
  user      : LEVELS.USER,
  utilisateur: LEVELS.USER,
  blacklist : LEVELS.BLACKLIST,
  bl        : LEVELS.BLACKLIST,
};

module.exports = {
  name       : 'addperm',
  aliases    : ['promote', 'setrank'],
  description: 'Attribue un niveau de permission à un utilisateur sur ce serveur.',
  usage      : ';addperm <@user> <admin|mod|user|blacklist>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [E.usage(';', 'addperm <@user> <admin|mod|user|blacklist>')] });
      if (target.bot) return message.reply({ embeds: [E.error('Action impossible', 'Tu ne peux pas modifier les permissions d\'un bot.')] });
      if (target.id === message.author.id) return message.reply({ embeds: [E.error('Action impossible', 'Tu ne peux pas modifier ton propre niveau.')] });

      const levelKey = args[1]?.toLowerCase();
      if (!levelKey || !(levelKey in ALIASES_MAP)) {
        return message.reply({ embeds: [E.error('Niveau invalide', 'Niveaux disponibles : `admin` · `mod` · `user` · `blacklist`')] });
      }

      const level    = ALIASES_MAP[levelKey];
      const oldLevel = getUserLevel(target.id, message.guild.id);

      setUserLevel(target.id, message.guild.id, level, message.author.id);

      return message.channel.send({
        embeds: [
          E.success('Permission mise à jour')
            .addFields(
              { name: 'Utilisateur',  value: `${target}`,             inline: true },
              { name: 'Ancien niveau', value: levelName(oldLevel),     inline: true },
              { name: 'Nouveau niveau', value: levelName(level),       inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
