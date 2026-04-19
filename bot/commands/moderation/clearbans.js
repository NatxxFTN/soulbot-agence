'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'clearbans',
  aliases    : ['cb', 'unbanall'],
  description: 'Débannir tous les membres bannis du serveur.',
  usage      : ';clearbans',
  cooldown   : 10,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: ['BanMembers', 'Administrator'],

  async execute(message) {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission de gérer les bans.')] });
    }

    let bans;
    try {
      bans = await message.guild.bans.fetch();
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', `Impossible de récupérer la liste des bans : ${err.message}`)] });
    }

    if (!bans.size) {
      return message.reply({ embeds: [E.info('Aucun ban', 'Aucun membre banni sur ce serveur.')] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cb_confirm').setLabel(`Débannir ${bans.size} membre(s)`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cb_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );

    const prompt = await message.channel.send({
      embeds: [E.warning('Confirmation requise', `Tu es sur le point de débannir **${bans.size}** membre(s).\nCette action est irréversible.`)],
      components: [row],
    });

    const collector = prompt.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time  : 30_000,
      max   : 1,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'cb_cancel') {
        await interaction.update({ embeds: [E.info('Annulé', 'Débannissement annulé.')], components: [] });
        return;
      }

      await interaction.update({ embeds: [E.info('En cours…', `Débannissement de ${bans.size} membre(s)…`)], components: [] });

      let success = 0;
      let failed  = 0;
      for (const [userId, ban] of bans) {
        try {
          await message.guild.members.unban(userId, `Mass unban par ${message.author.tag}`);
          STMT_LOG.run(message.guild.id, 'UNBAN', userId, ban.user.tag, message.author.id, message.author.tag, 'Mass unban');
          success++;
        } catch {
          failed++;
        }
      }

      await interaction.editReply({
        embeds: [
          E.success('Débannissement terminé')
            .addFields(
              { name: 'Réussis',    value: `${success}`, inline: true },
              { name: 'Échoués',    value: `${failed}`,  inline: true },
              { name: 'Modérateur', value: message.author.tag, inline: true },
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
