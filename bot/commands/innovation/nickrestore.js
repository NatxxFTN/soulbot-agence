'use strict';

const { getHistory } = require('../../core/nickname-history-storage');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name        : 'nickrestore',
  aliases     : ['nickrst', 'nickback'],
  description : 'Restaure le pseudo précédent d\'un membre (historique 10 derniers)',
  usage       : ';nickrestore <@user> [index=1]',
  guildOnly   : true,
  permissions : ['ManageNicknames'],

  async execute(message, args) {
    const userRaw = args[0];
    if (!userRaw) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description: '`;nickrestore <@user> [index=1]`\n\n**Exemple :** `;nickrestore @user 2` restaure l\'avant-dernier.',
        category: 'Innovation',
      })));
    }

    const match = userRaw.match(/^<@!?(\d+)>$/) || userRaw.match(/^(\d{17,20})$/);
    if (!match) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Mention invalide',
        description: 'Mentionne l\'utilisateur ou fournis son ID.',
        category: 'Innovation',
      })));
    }
    const userId = match[1];

    const index = Math.max(1, parseInt(args[1], 10) || 1);

    const history = getHistory(message.guild.id, userId, 10);
    if (!history.length) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Aucun historique',
        description:
          'Aucun changement de pseudo enregistré pour cet utilisateur.\n\n' +
          '*Le logger ne s\'active qu\'à partir de la mise en place du système.*',
        category: 'Innovation',
      })));
    }

    if (index > history.length) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Index trop grand',
        description: `Historique disponible : **${history.length}** entrée(s).`,
        category: 'Innovation',
      })));
    }

    const targetEntry = history[index - 1];
    const nickToRestore = targetEntry.old_nick;

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Membre introuvable',
        description: 'Cet utilisateur n\'est plus sur le serveur.',
        category: 'Innovation',
      })));
    }

    try {
      await member.setNickname(nickToRestore, `[nickrestore] par ${message.author.tag} (index ${index})`);
    } catch (err) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Impossible de restaurer',
        description: `Discord a refusé : ${err.message}`,
        category: 'Innovation',
      })));
    }

    const preview = history.slice(0, 5).map((h, i) => {
      const arrow = (i + 1) === index ? '**→**' : '  ';
      return `${arrow} \`${i + 1}.\` ${h.old_nick || '*(aucun)*'} → ${h.new_nick || '*(aucun)*'} · <t:${Math.floor(h.changed_at / 1000)}:R>`;
    }).join('\n');

    return message.reply(toEmbedReply(successEmbed({
      title       : 'Pseudo restauré',
      description : `Pseudo restauré pour <@${userId}>.`,
      fields      : [
        { name: '🎭 Pseudo',   value: nickToRestore || '*(pseudo par défaut)*', inline: true },
        { name: '📊 Index',    value: `${index} / ${history.length}`,           inline: true },
        { name: '👤 Par',      value: message.author.tag,                        inline: true },
        { name: '📜 Historique', value: preview,                                inline: false },
      ],
      user        : message.author,
      category    : 'Innovation',
    })));
  },
};
