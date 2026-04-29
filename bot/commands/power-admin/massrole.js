'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'massrole',
  aliases    : ['rolemass'],
  description: 'Assigner/retirer un rôle en masse.',
  usage      : ';massrole <add|remove> <@role> <@user1 @user2...>',
  cooldown   : 30,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const action = (args[0] || '').toLowerCase();
    if (!['add', 'remove'].includes(action)) {
      return message.reply({ embeds: [E.error('Usage', '`;massrole <add|remove> <@role> <@user1 @user2...>`')] });
    }

    const role = message.mentions.roles.first();
    if (!role) return message.reply({ embeds: [E.error('Rôle manquant', 'Mentionne un rôle.')] });

    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({ embeds: [E.error('Hiérarchie', 'Mon rôle doit être au-dessus de ce rôle.')] });
    }

    const users = Array.from(message.mentions.members.values());
    if (!users.length) return message.reply({ embeds: [E.error('Users manquants', 'Mentionne au moins un user.')] });
    if (users.length > 50) return message.reply({ embeds: [E.error('Trop d\'users', 'Maximum 50.')] });

    const status = await message.reply({ embeds: [E.info('Massrole en cours...', `0 / ${users.length}`)] });

    let success = 0, failed = 0;
    for (let i = 0; i < users.length; i++) {
      const m = users[i];
      try {
        if (action === 'add') await m.roles.add(role, `[massrole by ${message.author.tag}]`);
        else await m.roles.remove(role, `[massrole by ${message.author.tag}]`);
        success++;
      } catch { failed++; }
      if ((i + 1) % 5 === 0 || i === users.length - 1) {
        await status.edit({ embeds: [E.info('Massrole en cours...', `${i + 1} / ${users.length} · ✅ ${success} · ❌ ${failed}`)] }).catch(() => {});
      }
      await new Promise(r => setTimeout(r, 200));
    }

    return status.edit({
      embeds: [
        E.success(`Massrole ${action === 'add' ? 'add' : 'remove'} terminé`)
          .setDescription(`Rôle : ${role}\n✅ **${success}** OK · ❌ **${failed}** échec(s)`),
      ],
    });
  },
};
