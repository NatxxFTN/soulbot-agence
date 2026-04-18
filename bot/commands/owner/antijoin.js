'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS antijoin_config (
    guild_id    TEXT    PRIMARY KEY,
    enabled     INTEGER NOT NULL DEFAULT 0,
    threshold   INTEGER NOT NULL DEFAULT 5,
    interval_s  INTEGER NOT NULL DEFAULT 10,
    action      TEXT    NOT NULL DEFAULT 'kick'
  );
`);

const STMT_GET    = db.prepare('SELECT * FROM antijoin_config WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO antijoin_config (guild_id, enabled, threshold, interval_s, action)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    enabled    = excluded.enabled,
    threshold  = excluded.threshold,
    interval_s = excluded.interval_s,
    action     = excluded.action
`);

module.exports = {
  name       : 'antijoin',
  aliases    : [],
  description: 'Configure la protection anti-jointures massives (anti-raid).',
  usage      : ';antijoin <on|off> [seuil] [intervalle_s] [kick|ban]',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const sub = args[0]?.toLowerCase();

      if (!sub || sub === 'status') {
        const cfg = STMT_GET.get(message.guild.id);
        if (!cfg) {
          return message.channel.send({
            embeds: [E.info('Anti-jointures', 'Protection non configurée sur ce serveur.')],
          });
        }
        return message.channel.send({
          embeds: [
            E.base()
              .setTitle('Anti-jointures — Configuration')
              .addFields(
                { name: 'État',       value: cfg.enabled ? '✓ Activé' : '✗ Désactivé', inline: true },
                { name: 'Seuil',      value: `${cfg.threshold} joins`,                  inline: true },
                { name: 'Intervalle', value: `${cfg.interval_s}s`,                      inline: true },
                { name: 'Action',     value: cfg.action,                                inline: true },
              ),
          ],
        });
      }

      if (!['on', 'off'].includes(sub)) {
        return message.reply({ embeds: [E.usage(';', 'antijoin <on|off> [seuil] [intervalle_s] [kick|ban]')] });
      }

      const enabled    = sub === 'on' ? 1 : 0;
      const threshold  = parseInt(args[1]) || 5;
      const intervalS  = parseInt(args[2]) || 10;
      const action     = ['kick', 'ban'].includes(args[3]) ? args[3] : 'kick';

      STMT_UPSERT.run(message.guild.id, enabled, threshold, intervalS, action);

      return message.channel.send({
        embeds: [
          E.success(
            `Anti-jointures ${enabled ? 'activé' : 'désactivé'}`,
            enabled
              ? `Seuil : **${threshold} joins** en **${intervalS}s** → action : **${action}**`
              : 'La protection est maintenant désactivée.',
          ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
