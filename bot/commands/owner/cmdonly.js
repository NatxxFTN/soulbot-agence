'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_cmdonly (
    guild_id   TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL
  );
`);

const STMT_GET    = db.prepare('SELECT channel_id FROM guild_cmdonly WHERE guild_id = ?');
const STMT_SET    = db.prepare('INSERT OR REPLACE INTO guild_cmdonly (guild_id, channel_id) VALUES (?, ?)');
const STMT_REMOVE = db.prepare('DELETE FROM guild_cmdonly WHERE guild_id = ?');

module.exports = {
  name       : 'cmdonly',
  aliases    : [],
  description: 'Restreint les commandes du bot à un salon spécifique.',
  usage      : ';cmdonly <#salon|off>',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const sub = args[0]?.toLowerCase();

      if (!sub) {
        const row = STMT_GET.get(message.guild.id);
        if (!row) {
          return message.channel.send({
            embeds: [E.info('Salon de commandes', 'Aucune restriction — le bot répond partout.')],
          });
        }
        return message.channel.send({
          embeds: [E.base().setTitle('Salon de commandes').setDescription(`Salon actif : <#${row.channel_id}>`)],
        });
      }

      if (sub === 'off') {
        STMT_REMOVE.run(message.guild.id);
        return message.channel.send({
          embeds: [E.success('Restriction levée', 'Le bot répond à nouveau dans tous les salons.')],
        });
      }

      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply({ embeds: [E.usage(';', 'cmdonly <#salon|off>')] });
      }

      STMT_SET.run(message.guild.id, channel.id);
      return message.channel.send({
        embeds: [E.success('Salon de commandes défini', `Les commandes ne fonctionneront que dans <#${channel.id}>.`)],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
