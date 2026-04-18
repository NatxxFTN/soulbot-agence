'use strict';

const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS autobackup_config (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    enabled     INTEGER NOT NULL DEFAULT 0,
    interval_h  INTEGER NOT NULL DEFAULT 24,
    max_copies  INTEGER NOT NULL DEFAULT 7,
    last_run    INTEGER
  );
  INSERT OR IGNORE INTO autobackup_config (id) VALUES (1);
`);

const STMT_GET = db.prepare('SELECT * FROM autobackup_config WHERE id = 1');
const STMT_SET = db.prepare(`
  UPDATE autobackup_config
  SET enabled = ?, interval_h = ?, max_copies = ?
  WHERE id = 1
`);

module.exports = {
  name       : 'autobackup',
  aliases    : [],
  description: 'Configure les sauvegardes automatiques de la base de données.',
  usage      : ';autobackup <on|off> [intervalle_h] [nb_copies]',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args) {
    try {
      const sub = args[0]?.toLowerCase();
      const cfg = STMT_GET.get();

      if (!sub || sub === 'status') {
        const lastRun = cfg.last_run
          ? `<t:${cfg.last_run}:R>`
          : 'jamais';
        return message.channel.send({
          embeds: [
            E.base()
              .setTitle('Sauvegarde automatique')
              .addFields(
                { name: 'État',         value: cfg.enabled ? '✓ Activé' : '✗ Désactivé', inline: true },
                { name: 'Intervalle',   value: `${cfg.interval_h}h`,                      inline: true },
                { name: 'Copies max',   value: `${cfg.max_copies}`,                       inline: true },
                { name: 'Dernière run', value: lastRun,                                    inline: true },
              ),
          ],
        });
      }

      if (!['on', 'off'].includes(sub)) {
        return message.reply({ embeds: [E.usage(';', 'autobackup <on|off> [intervalle_h] [nb_copies]')] });
      }

      const enabled    = sub === 'on' ? 1 : 0;
      const intervalH  = Math.max(1, parseInt(args[1]) || cfg.interval_h);
      const maxCopies  = Math.max(1, parseInt(args[2]) || cfg.max_copies);

      STMT_SET.run(enabled, intervalH, maxCopies);

      return message.channel.send({
        embeds: [
          E.success(
            `Sauvegarde automatique ${enabled ? 'activée' : 'désactivée'}`,
            enabled
              ? `Toutes les **${intervalH}h** · **${maxCopies}** copies conservées`
              : 'Les sauvegardes automatiques sont suspendues.',
          ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
