'use strict';

const { db } = require('../../database');
const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const STMT_ACTIVE_WARNS = db.prepare(
  'SELECT COUNT(DISTINCT user_id) AS users, COUNT(*) AS total FROM warnings WHERE guild_id = ?',
);
const STMT_ACTIVE_QUAR = db.prepare(
  'SELECT COUNT(*) AS count FROM guild_quarantine WHERE guild_id = ?',
);
const STMT_LOCKED_ROLES = db.prepare(
  'SELECT COUNT(*) AS count FROM guild_role_locks WHERE guild_id = ?',
);
const STMT_RECENT_ACTIONS = db.prepare(`
  SELECT action_type, COUNT(*) AS count
    FROM guild_mod_actions
   WHERE guild_id = ? AND created_at >= ?
   GROUP BY action_type
   ORDER BY count DESC
`);

module.exports = {
  name       : 'moddashboard',
  aliases    : ['moddash'],
  description: 'Tableau de bord temps réel des sanctions et de l\'activité modération.',
  usage      : ';moddashboard',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['KickMembers'],

  async execute(message) {
    const guildId = message.guild.id;
    const now = Math.floor(Date.now() / 1000);
    const since24h = now - 86400;
    const since7d  = now - 7 * 86400;

    const warns = STMT_ACTIVE_WARNS.get(guildId);
    const quar  = STMT_ACTIVE_QUAR.get(guildId);
    const locks = STMT_LOCKED_ROLES.get(guildId);

    const recent24h = STMT_RECENT_ACTIONS.all(guildId, since24h);
    const stats7d   = audit.getModStats(guildId, '7d');

    const activeBlock = `**Avertissements actifs** : ${warns.total} (${warns.users} membres)\n`
      + `**Quarantaines en cours** : ${quar.count}\n`
      + `**Rôles lockés** : ${locks.count}`;

    const activity24h = recent24h.length
      ? recent24h.map(r => `• **${r.type}** — ${r.count}`).join('\n')
      : '*Aucune action sur 24h.*';

    const topMods = stats7d.topMods.length
      ? stats7d.topMods.slice(0, 3).map((m, i) => `${i + 1}. <@${m.moderator_id}> — ${m.count}`).join('\n')
      : '*Aucune activité.*';

    const total24h = recent24h.reduce((a, b) => a + b.count, 0);

    const body = `**Serveur** : ${message.guild.name} · *snapshot <t:${now}:T>*\n`
      + '---\n'
      + '#### 🛡️ Sanctions actives\n' + activeBlock
      + '\n---\n'
      + `#### 📊 Activité 24h (${total24h} action${total24h > 1 ? 's' : ''})\n`
      + activity24h
      + '\n---\n'
      + '#### 🏆 Top mods (7 derniers jours)\n' + topMods
      + '\n---\n'
      + '#### ⚡ Actions rapides\n'
      + '• `;warn @membre <raison>` — avertissement\n'
      + '• `;mute @membre <durée>` — silence\n'
      + '• `;kick @membre <raison>` — expulsion\n'
      + '• `;quarantine @membre <raison>` — isolation\n'
      + '• `;modstats <période>` — stats détaillées\n'
      + '\n*Pour rafraîchir : retape `;moddashboard`*';

    return message.reply(P.infoPanel('🛡️ Mod Dashboard', body));
  },
};
