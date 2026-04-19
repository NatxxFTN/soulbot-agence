'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { db } = require('../../database');

const STMT_LOG = db.prepare(
  'INSERT OR IGNORE INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

module.exports = {
  name       : 'clearmutes',
  aliases    : ['cm', 'unmutall'],
  description: 'Lever le timeout de tous les membres mutés.',
  usage      : ';clearmutes',
  cooldown   : 10,
  guildOnly  : true,
  permissions: ['ModerateMembers'],

  async execute(message) {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [E.error('Permission manquante', 'Je n\'ai pas la permission ModerateMembers.')] });
    }

    let members;
    try {
      members = await message.guild.members.fetch();
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', `Impossible de charger les membres : ${err.message}`)] });
    }

    const muted = members.filter(m => m.isCommunicationDisabled());

    if (!muted.size) {
      return message.reply({ embeds: [E.info('Aucun mute actif', 'Aucun membre en timeout actuellement.')] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cm_confirm').setLabel(`Démuter ${muted.size} membre(s)`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cm_cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
    );

    const prompt = await message.channel.send({
      embeds: [E.warning('Confirmation requise', `Tu es sur le point de lever le timeout de **${muted.size}** membre(s).`)],
      components: [row],
    });

    const collector = prompt.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time  : 30_000,
      max   : 1,
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'cm_cancel') {
        await interaction.update({ embeds: [E.info('Annulé', 'Opération annulée.')], components: [] });
        return;
      }

      await interaction.update({ embeds: [E.info('En cours…', `Levée du timeout pour ${muted.size} membre(s)…`)], components: [] });

      let success = 0;
      let failed  = 0;
      for (const [, member] of muted) {
        try {
          await member.timeout(null, `Mass unmute par ${message.author.tag}`);
          STMT_LOG.run(message.guild.id, 'UNMUTE', member.id, member.user.tag, message.author.id, message.author.tag, 'Mass unmute');
          success++;
        } catch {
          failed++;
        }
      }

      await interaction.editReply({
        embeds: [
          E.success('Timeouts levés')
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
