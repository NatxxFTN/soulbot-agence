'use strict';

const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_GET = db.prepare('SELECT * FROM raidmode_config WHERE guild_id = ?');
const STMT_UPSERT = db.prepare(`
  INSERT INTO raidmode_config (guild_id, active, join_threshold, join_window_sec, action, enabled_by, enabled_at, detection_threshold, detection_window_sec)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(guild_id) DO UPDATE SET
    active = excluded.active,
    enabled_by = excluded.enabled_by,
    enabled_at = excluded.enabled_at,
    detection_threshold = excluded.detection_threshold,
    detection_window_sec = excluded.detection_window_sec
`);

module.exports = {
  name       : 'antiraid',
  aliases    : ['araid', 'antiraidpack'],
  description: 'Anti-raid : kick auto si > N joins en X secondes.',
  usage      : ';antiraid <on|off|status>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const sub = (args[0] || 'status').toLowerCase();
    const guildId = message.guild.id;

    if (sub === 'status') {
      const row = STMT_GET.get(guildId);
      if (!row) return message.reply({ embeds: [E.info('Antiraid status', 'Non configuré. `;antiraid on` pour activer.')] });
      const threshold = row.detection_threshold || 10;
      const window = row.detection_window_sec || 30;
      return message.reply({
        embeds: [
          E.base()
            .setTitle('🛡️ Antiraid status')
            .addFields(
              { name: 'État',     value: row.active ? '🟢 Actif' : '🔴 Désactivé', inline: true },
              { name: 'Seuil',    value: `${threshold} joins`,                      inline: true },
              { name: 'Fenêtre',  value: `${window} sec`,                           inline: true },
              { name: 'Action',   value: row.action || 'kick',                      inline: true },
              { name: 'Activé par', value: row.enabled_by ? `<@${row.enabled_by}>` : '—', inline: true },
            ),
        ],
      });
    }

    if (sub === 'on' || sub === 'off') {
      const active = sub === 'on' ? 1 : 0;
      const cur = STMT_GET.get(guildId) || {};
      STMT_UPSERT.run(
        guildId, active,
        cur.join_threshold || 10,
        cur.join_window_sec || 30,
        cur.action || 'kick',
        message.author.id, Math.floor(Date.now() / 1000),
        cur.detection_threshold || 10,
        cur.detection_window_sec || 30,
      );
      return message.reply({
        embeds: [E.success(`Antiraid ${active ? 'activé' : 'désactivé'}`)
          .setDescription(active ? 'Surveillance des joins active. Détection : > 10 joins / 30s → kick auto.' : 'Détection désactivée.')],
      });
    }

    return message.reply({ embeds: [E.error('Usage', '`;antiraid <on|off|status>`')] });
  },
};
