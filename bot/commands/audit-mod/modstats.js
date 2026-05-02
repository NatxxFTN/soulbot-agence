'use strict';

const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const VALID_PERIODS = ['24h', '7d', '30d', 'all'];

module.exports = {
  name       : 'modstats',
  aliases    : ['modlb'],
  description: 'Statistiques de modération sur la période (24h/7d/30d/all).',
  usage      : ';modstats [24h|7d|30d|all]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['KickMembers'],

  async execute(message, args) {
    const period = VALID_PERIODS.includes(args[0]) ? args[0] : '7d';
    const stats  = audit.getModStats(message.guild.id, period);

    const topMods = stats.topMods.length
      ? stats.topMods.map((m, i) => `${i + 1}. <@${m.moderator_id}> — **${m.count}** action${m.count > 1 ? 's' : ''}`).join('\n')
      : '*Aucune activité.*';

    const topActions = stats.topActions.length
      ? stats.topActions.map((a, i) => `${i + 1}. **${a.type}** — ${a.count}`).join('\n')
      : '*Aucune action.*';

    let evolution = '*Pas assez de données.*';
    if (stats.daily.length) {
      const max = Math.max(...stats.daily.map(d => d.count));
      const lines = stats.daily.slice(-14).map(d => {
        const date = new Date(d.day_bucket * 86400_000).toISOString().slice(5, 10);
        const filled = max ? Math.round((d.count / max) * 16) : 0;
        const bar = '█'.repeat(filled) + '░'.repeat(16 - filled);
        return `\`${date}\` ${bar} ${d.count}`;
      });
      evolution = lines.join('\n');
    }

    const body = `**Période** : \`${period}\` · *(autres : ${VALID_PERIODS.filter(p => p !== period).join(', ')})*\n`
      + '---\n'
      + '#### 🏆 Top 5 modérateurs\n' + topMods
      + '\n---\n'
      + '#### 🎯 Top 5 actions\n' + topActions
      + '\n---\n'
      + '#### 📈 Évolution journalière (14 derniers jours)\n' + evolution;

    return message.reply(P.infoPanel('📊 Stats modération', body));
  },
};
