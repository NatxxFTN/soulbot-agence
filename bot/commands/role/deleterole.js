'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
  errorEmbed, warningEmbed, toEmbedReply, statusV2Panel,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'deleterole',
  aliases    : ['drole', 'delrole', 'roledelete'],
  description: 'Supprimer un rôle du serveur (avec confirmation).',
  usage      : ';deleterole @rôle',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message) {
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Permission manquante',
        description: 'Je n\'ai pas la permission de gérer les rôles.',
        category: 'Admin',
      })));
    }

    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description: '`;deleterole @rôle` — mentionne le rôle à supprimer.',
        category: 'Admin',
      })));
    }

    if (role.managed) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Rôle managé',
        description: 'Ce rôle est géré par une intégration (bot, boost, etc.) et ne peut pas être supprimé.',
        category: 'Admin',
      })));
    }

    if (role.id === message.guild.id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Rôle protégé',
        description: 'Impossible de supprimer le rôle @everyone.',
        category: 'Admin',
      })));
    }

    const botMember = message.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Hiérarchie insuffisante',
        description: 'Ce rôle est supérieur ou égal au mien — impossible de le supprimer.',
        category: 'Admin',
      })));
    }

    if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Hiérarchie insuffisante',
        description: 'Ce rôle est supérieur ou égal au tien — seuls les rôles plus bas peuvent être supprimés.',
        category: 'Admin',
      })));
    }

    const memberCount = role.members.size;

    // Panel V2 de confirmation
    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'btn_flag',
      title    : `Supprimer le rôle ${role.name}`,
      subtitle : `Demande de confirmation par **${message.author.tag}**`,
    });

    container.addTextDisplayComponents(
      text(`> ⚠️ **Action irréversible.** La suppression est définitive.`),
    );
    container.addSeparatorComponents(separator('Small'));

    const hex = role.color ? `#${role.color.toString(16).padStart(6, '0').toUpperCase()}` : '—';
    container.addTextDisplayComponents(
      text(
        `## Ce qui va se passer\n` +
        `• **Rôle :** ${role.toString()} (\`${role.id}\`)\n` +
        `• **Couleur :** \`${hex}\`\n` +
        `• **Position :** \`${role.position}\`\n` +
        `• **Membres concernés :** **${memberCount}**`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`role:delete:confirm:${role.id}`)
        .setLabel(`Supprimer ${role.name}`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`role:delete:cancel:${role.id}`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary),
    );
    container.addActionRowComponents(row);

    container.addTextDisplayComponents(text(`-# Timeout 30s · Soulbot • Admin • Roles v1.0`));

    const prompt = await message.reply(toV2Payload(container));

    const collector = prompt.createMessageComponentCollector({
      filter: i => i.user.id === message.author.id,
      time  : 30_000,
      max   : 1,
    });

    collector.on('collect', async interaction => {
      const [, , action] = interaction.customId.split(':');

      if (action === 'cancel') {
        return interaction.update(statusV2Panel({
          status: 'info',
          title: 'Annulé',
          description: 'Suppression annulée.',
          category: 'Admin',
        }));
      }

      try {
        await role.delete(`Supprimé par ${message.author.tag} via ;deleterole`);
      } catch (err) {
        return interaction.update(statusV2Panel({
          status: 'error',
          title: 'Erreur API',
          description: `Impossible de supprimer le rôle : ${err.message}`,
          category: 'Admin',
        }));
      }

      return interaction.update(statusV2Panel({
        status: 'success',
        title: 'Rôle supprimé',
        description: `Le rôle **${role.name}** a été supprimé avec succès.`,
        fields: [
          { name: 'Nom',     value: role.name },
          { name: 'ID',      value: `\`${role.id}\`` },
          { name: 'Membres', value: `${memberCount}` },
          { name: 'Par',     value: message.author.tag },
        ],
        category: 'Admin',
      }));
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await prompt.edit(statusV2Panel({
          status: 'warning',
          title: 'Temps écoulé',
          description: 'Confirmation non reçue — suppression annulée.',
          category: 'Admin',
        })).catch(() => {});
      }
    });
  },
};
