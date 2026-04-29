'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT INTO massban_logs (guild_id, banned_by, banned_ids, reason, success, failed) VALUES (?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'massban',
  aliases    : ['banmass', 'multiban'],
  description: 'Ban en masse plusieurs users (mention ou ID).',
  usage      : ';massban <user1 user2 user3...> [-r raison]',
  cooldown   : 30,
  guildOnly  : true,
  permissions: ['BanMembers'],

  async execute(message, args) {
    if (!args.length) {
      return message.reply({ embeds: [E.error('Usage', '`;massban <@user1 @user2 ID...> [-r raison]`')] });
    }

    let reason = 'Mass ban';
    const rIdx = args.findIndex(a => a === '-r');
    if (rIdx >= 0) {
      reason = args.slice(rIdx + 1).join(' ').slice(0, 512) || 'Mass ban';
      args.splice(rIdx);
    }

    const targets = [];
    for (const tok of args) {
      const id = (tok.match(/\d{17,20}/) || [])[0];
      if (id && !targets.includes(id)) targets.push(id);
    }
    if (!targets.length) {
      return message.reply({ embeds: [E.error('Aucun user', 'Mentions ou IDs introuvables.')] });
    }
    if (targets.length > 50) {
      return message.reply({ embeds: [E.error('Trop d\'users', 'Maximum 50 par massban.')] });
    }

    const me = message.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ embeds: [E.error('Permission bot', 'Je n\'ai pas BanMembers.')] });
    }

    const status = await message.reply({ embeds: [E.info('Massban en cours...', `0 / ${targets.length}`)] });

    let success = 0, failed = 0;
    const errs = [];
    for (let i = 0; i < targets.length; i++) {
      const id = targets[i];
      try {
        await message.guild.members.ban(id, { reason: `[massban by ${message.author.tag}] ${reason}` });
        success++;
      } catch (err) {
        failed++;
        errs.push(`<@${id}> : ${err.message}`);
      }
      if ((i + 1) % 5 === 0 || i === targets.length - 1) {
        await status.edit({ embeds: [E.info('Massban en cours...', `${i + 1} / ${targets.length} · ✅ ${success} · ❌ ${failed}`)] }).catch(() => {});
      }
      await new Promise(r => setTimeout(r, 250));
    }

    try { STMT_LOG.run(message.guild.id, message.author.id, targets.join(','), reason, success, failed); } catch {}

    return status.edit({
      embeds: [
        E.success('Massban terminé')
          .setDescription(`✅ **${success}** banni(s) · ❌ **${failed}** échec(s)`)
          .addFields(
            { name: 'Raison', value: reason },
            ...(errs.length ? [{ name: 'Erreurs (5 max)', value: errs.slice(0, 5).join('\n') }] : []),
          ),
      ],
    });
  },
};
