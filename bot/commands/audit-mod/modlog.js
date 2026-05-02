'use strict';

const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

module.exports = {
  name       : 'modlog',
  aliases    : ['userhistory', 'uh'],
  description: 'Historique modération complet d\'un membre (paginé).',
  usage      : ';modlog @membre [pN]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['KickMembers'],

  async execute(message, args) {
    const target = message.mentions.members.first()
      || (args[0] && /^\d{15,}$/.test(args[0]) ? await message.guild.members.fetch(args[0]).catch(() => null) : null);

    if (!target) {
      return message.reply(P.warningPanel(
        'Cible manquante',
        'Usage : `;modlog @membre [pN]`\nMentionne un membre ou passe son ID.',
      ));
    }

    let page = 1;
    const last = args[args.length - 1];
    if (/^p\d+$/i.test(last)) page = parseInt(last.slice(1), 10);

    const guildId = message.guild.id;
    const counts  = audit.getUserActionCounts(guildId, target.id);
    const history = audit.getUserHistory(guildId, target.id, 100);

    const totals = `**Avertissements** : ${counts.WARN}\n`
      + `**Mutes** : ${counts.MUTE}\n`
      + `**Kicks** : ${counts.KICK}\n`
      + `**Bans** : ${counts.BAN}\n`
      + `**Timeouts** : ${counts.TIMEOUT}\n`
      + `**Quarantaines** : ${counts.QUARANTINE}\n`
      + `**Autres** : ${counts.OTHER}`;

    const items = history.map(h => {
      const at  = `<t:${h.created_at}:f>`;
      const dur = h.duration_ms ? ` · ${Math.round(h.duration_ms / 1000)}s` : '';
      const reason = h.reason ? ` — ${h.reason.slice(0, 80)}` : '';
      return `• **${h.action_type}** ${at} · par <@${h.moderator_id}>${dur}${reason}`;
    });

    const total = items.length;
    const perPage = 10;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const cur = Math.max(1, Math.min(pages, page));
    const slice = items.slice((cur - 1) * perPage, cur * perPage);

    const body = `**Membre** : ${target.user.tag} · \`${target.id}\`\n`
      + '---\n'
      + '#### 📊 Totaux\n' + totals
      + '\n---\n'
      + `#### 📜 Historique (${total} entrée${total > 1 ? 's' : ''})\n`
      + (slice.length ? slice.join('\n') : '*Aucune action enregistrée.*')
      + `\n---\nPage **${cur}/${pages}**\n*Page suivante : \`;modlog @${target.user.username} p${cur + 1}\`*`;

    return message.reply(P.infoPanel(`📋 Historique modération`, body));
  },
};
