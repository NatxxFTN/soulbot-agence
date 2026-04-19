'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_theme (
    guild_id TEXT PRIMARY KEY,
    color    TEXT NOT NULL DEFAULT '#F39C12'
  );
`);

const STMT_GET    = db.prepare('SELECT color FROM guild_theme WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO guild_theme (guild_id, color) VALUES (?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET color = excluded.color
`);
const STMT_DELETE = db.prepare('DELETE FROM guild_theme WHERE guild_id = ?');

const HEX_RE = /^#?([0-9A-Fa-f]{6})$/;

module.exports = {
  name       : 'theme',
  aliases    : [],
  description: 'Affiche ou modifie la couleur d\'embed du bot sur ce serveur.',
  usage      : ';theme | ;theme <#couleur> | ;theme reset',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const guildId = message.guild.id;

      if (!args.length) {
        const row   = STMT_GET.get(guildId);
        const color = row?.color ?? '#F39C12';
        return message.channel.send({
          embeds: [E.base().setTitle('Thème actuel').setDescription(`Couleur : \`${color}\``).setColor(color)],
        });
      }

      if (args[0].toLowerCase() === 'reset') {
        STMT_DELETE.run(guildId);
        return message.channel.send({ embeds: [E.success('Thème réinitialisé', 'La couleur est revenue à `#F39C12`.')] });
      }

      const match = HEX_RE.exec(args[0]);
      if (!match) return message.reply({ embeds: [E.error('Couleur invalide', 'Utilise un code hexadécimal valide (ex: `#F39C12`).')] });

      const color = `#${match[1].toUpperCase()}`;
      STMT_UPSERT.run(guildId, color);

      return message.channel.send({
        embeds: [E.base().setTitle('Thème mis à jour').setDescription(`Nouvelle couleur : \`${color}\``).setColor(color)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
