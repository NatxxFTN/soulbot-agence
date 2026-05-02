'use strict';

const P = require('../../core/audit-mod-panels');

module.exports = {
  name       : 'searchuser',
  aliases    : ['finduser', 'su'],
  description: 'Recherche multi-critères de membres (name/ID/role/joinXd).',
  usage      : ';searchuser <critère> [pN]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['KickMembers'],

  async execute(message, args) {
    if (!args.length) {
      return message.reply(P.warningPanel(
        'Critère manquant',
        'Usage : `;searchuser <critère> [pN]`\n' +
        'Exemples :\n' +
        '• `;searchuser nathan` — par nom\n' +
        '• `;searchuser id:123456789012345678` — par ID\n' +
        '• `;searchuser join<7d` — rejoints il y a moins de 7 jours\n' +
        '• `;searchuser join>30d` — rejoints il y a plus de 30 jours\n' +
        '• `;searchuser role:@VIP` — par rôle',
      ));
    }

    let page = 1;
    const last = args[args.length - 1];
    if (/^p\d+$/i.test(last)) {
      page = parseInt(last.slice(1), 10);
      args.pop();
    }

    const query = args.join(' ').trim();
    const guild = message.guild;

    let members;
    try {
      members = await guild.members.fetch();
    } catch {
      return message.reply(P.dangerPanel('Erreur', 'Impossible de récupérer la liste des membres.'));
    }

    let filtered;
    let label = query;

    if (query.startsWith('id:') || /^\d{15,}$/.test(query)) {
      const id = query.startsWith('id:') ? query.slice(3) : query;
      const m = members.get(id);
      filtered = m ? [m] : [];
    } else if (query.startsWith('role:')) {
      const raw = query.slice(5).replace(/[<@&>]/g, '').trim();
      const role = guild.roles.cache.get(raw)
        || guild.roles.cache.find(r => r.name.toLowerCase().includes(raw.toLowerCase()));
      if (!role) {
        return message.reply(P.warningPanel('Rôle introuvable', `Aucun rôle ne correspond à \`${raw}\`.`));
      }
      filtered = [...members.filter(m => m.roles.cache.has(role.id)).values()];
      label = `role:${role.name}`;
    } else if (/^join([<>])(\d+)d$/i.test(query)) {
      const m = query.match(/^join([<>])(\d+)d$/i);
      const op = m[1];
      const days = parseInt(m[2], 10);
      const threshold = Date.now() - days * 86400_000;
      filtered = [...members.filter(mb => {
        if (!mb.joinedTimestamp) return false;
        return op === '<' ? mb.joinedTimestamp >= threshold : mb.joinedTimestamp <= threshold;
      }).values()];
    } else {
      const q = (query.toLowerCase().startsWith('name:') ? query.slice(5) : query).toLowerCase();
      filtered = [...members.filter(mb =>
        mb.user.username.toLowerCase().includes(q)
        || (mb.displayName || '').toLowerCase().includes(q)
        || mb.user.tag.toLowerCase().includes(q),
      ).values()];
    }

    const items = filtered
      .sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0))
      .map(mb => {
        const joined = mb.joinedTimestamp ? `<t:${Math.floor(mb.joinedTimestamp / 1000)}:R>` : '—';
        return `• **${mb.user.tag}** · \`${mb.id}\` · joined ${joined}`;
      });

    return message.reply(P.paginatedList(
      `🔎 Recherche : \`${label}\``,
      items,
      page,
      10,
      P.COLORS.info,
      `*Page suivante : \`;searchuser ${label} p${page + 1}\`*`,
    ));
  },
};
