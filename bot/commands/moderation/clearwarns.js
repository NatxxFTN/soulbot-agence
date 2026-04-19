'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_COUNT  = db.prepare('SELECT COUNT(*) AS count FROM warnings WHERE guild_id = ? AND user_id = ?');
const STMT_DELETE = db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?');
const STMT_LOG    = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'clearwarns',
  aliases    : ['cw', 'clearwarn'],
  description: 'Effacer les avertissements d\'un membre (ou tous les membres).',
  usage      : ';clearwarns @membre  ou  ;clearwarns all',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message, args) {
    const isAll = args[0]?.toLowerCase() === 'all';
    const target = message.mentions.members.first();

    if (!isAll && !target) {
      return message.reply({ embeds: [E.error('Cible manquante', 'Mentionne un membre ou utilise `all` pour tout effacer.')] });
    }

    let count;
    if (isAll) {
      const row = db.prepare('SELECT COUNT(*) AS count FROM warnings WHERE guild_id = ?').get(message.guild.id);
      count = row.count;
    } else {
      count = STMT_COUNT.get(message.guild.id, target.id).count;
    }

    if (count === 0) {
      const who = isAll ? 'ce serveur' : target.toString();
      return message.reply({ embeds: [E.info('Aucun avertissement', `Aucun avertissement trouvé pour ${who}.`)] });
    }

    const label = isAll ? 'TOUS les membres' : target.user.tag;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cw_confirm').setLabel(`Effacer ${count} warn(s) — ${label}`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cw_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );

    const prompt = await message.channel.send({
      embeds: [E.warning('Confirmation requise', `Tu es sur le point d'effacer **${count}** avertissement(s) pour **${label}**.\nCette action est irréversible.`)],
      components: [row],
    });

    const collector = prompt.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time  : 30_000,
      max   : 1,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'cw_cancel') {
        await interaction.update({ embeds: [E.info('Annulé', 'Suppression des avertissements annulée.')], components: [] });
        return;
      }

      if (isAll) {
        db.prepare('DELETE FROM warnings WHERE guild_id = ?').run(message.guild.id);
        STMT_LOG.run(message.guild.id, 'CLEARWARNS_ALL', null, null, message.author.id, message.author.tag, `${count} warns effacés`);
      } else {
        STMT_DELETE.run(message.guild.id, target.id);
        STMT_LOG.run(message.guild.id, 'CLEARWARNS', target.id, target.user.tag, message.author.id, message.author.tag, `${count} warns effacés`);
      }

      await interaction.update({
        embeds: [
          E.success('Avertissements effacés')
            .addFields(
              { name: 'Cible',       value: label,             inline: true },
              { name: 'Supprimés',   value: `${count}`,        inline: true },
              { name: 'Modérateur',  value: message.author.tag, inline: true },
            ),
        ],
        components: [],
      });
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await prompt.edit({ embeds: [E.warning('Temps écoulé', 'Confirmation non reçue — action annulée.')], components: [] }).catch(() => {});
      }
    });
  },
};
