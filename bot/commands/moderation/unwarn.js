'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET    = db.prepare('SELECT * FROM warnings WHERE id = ? AND guild_id = ?');
const STMT_DELETE = db.prepare('DELETE FROM warnings WHERE id = ? AND guild_id = ?');
const STMT_LOG    = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const STMT_LIST = db.prepare('SELECT id, user_tag, reason, created_at FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10');

module.exports = {
  name       : 'unwarn',
  aliases    : ['uw', 'delwarn'],
  description: 'Supprimer un avertissement spécifique par son ID.',
  usage      : ';unwarn <ID>  ou  ;unwarn @membre (liste les 10 derniers)',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    // ;unwarn @membre → lister les warns pour trouver l'ID
    const target = message.mentions.members.first();
    if (target) {
      const rows = STMT_LIST.all(message.guild.id, target.id);
      if (!rows.length) {
        return message.channel.send({ embeds: [E.info('Aucun avertissement', `${target} n\'a aucun avertissement sur ce serveur.`)] });
      }
      const lines = rows.map(r => `\`ID ${r.id}\` — ${r.reason} *(${new Date(r.created_at * 1000).toLocaleDateString('fr-FR')})*`).join('\n');
      return message.channel.send({
        embeds: [
          E.base()
            .setTitle(`Avertissements — ${target.user.tag}`)
            .setDescription(lines)
            .setFooter({ text: 'Utilise ;unwarn <ID> pour supprimer un warn précis.' }),
        ],
      });
    }

    const id = parseInt(args[0], 10);
    if (isNaN(id)) {
      return message.reply({ embeds: [E.error('ID invalide', 'Fournis l\'ID numérique de l\'avertissement ou mentionne un membre pour voir la liste.')] });
    }

    const warn = STMT_GET.get(id, message.guild.id);
    if (!warn) {
      return message.reply({ embeds: [E.error('Introuvable', `Aucun avertissement #${id} trouvé sur ce serveur.`)] });
    }

    STMT_DELETE.run(id, message.guild.id);
    STMT_LOG.run(message.guild.id, 'UNWARN', warn.user_id, warn.user_tag, message.author.id, message.author.tag, `Warn #${id} supprimé`);

    return message.channel.send({
      embeds: [
        E.success('Avertissement supprimé')
          .addFields(
            { name: 'ID',         value: `${id}`,           inline: true },
            { name: 'Membre',     value: warn.user_tag,      inline: true },
            { name: 'Modérateur', value: message.author.tag, inline: true },
            { name: 'Raison originale', value: warn.reason },
          ),
      ],
    });
  },
};
