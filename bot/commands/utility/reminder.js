'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle,
  ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/reminder-storage');
const { parseReminderTime } = require('../../core/reminder-scheduler');

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

module.exports = {
  name       : 'reminder',
  aliases    : ['remind', 'rappel'],
  category   : 'utility',
  description: 'Crée un rappel (simple : ;reminder <temps> <message> — panel : ;reminder).',
  usage      : ';reminder [temps] [message]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  async execute(message, args, _client) {
    // Mode simple avec args : ;reminder dans 2h Ne pas oublier
    if (args.length >= 2) {
      // Cherche "dans X unité" au début
      const m = args.join(' ').match(/^(?:dans\s+)?(\d+\s*(?:s|sec|second[es]?|min|minute[s]?|h|heure[s]?|j|jour[s]?|semaine[s]?|mois|an[s]?))\s+(.+)$/i);
      let timePart, content;
      if (m) {
        timePart = m[1];
        content = m[2].trim();
      } else {
        // Fallback : args[0]+[1] = temps, reste = contenu
        timePart = `${args[0]} ${args[1]}`;
        content = args.slice(2).join(' ').trim();
      }

      const ts = parseReminderTime(timePart);
      if (!ts) {
        return plain(message, `${e('btn_error')} Temps invalide. Exemples : \`dans 30min\`, \`dans 2h\`, \`dans 3j\`.`);
      }
      if (!content) {
        return plain(message, `${e('btn_error')} Contenu du rappel manquant.`);
      }
      if (content.length > 1500) {
        return plain(message, `${e('btn_error')} Message trop long (max 1500 caractères).`);
      }

      const id = storage.createReminder({
        guild_id: message.guild.id,
        channel_id: message.channel.id,
        message_content: content,
        trigger_at: ts,
        created_by: message.author.id,
      });
      if (!id) return plain(message, `${e('btn_error')} Erreur lors de la création.`);

      return plain(message,
        `${e('btn_success')} Rappel **#${id}** programmé <t:${Math.floor(ts / 1000)}:R>.`,
      );
    }

    // Mode panel (modal)
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_utility')} **Créer un rappel**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Clique sur le bouton pour ouvrir le formulaire de création.\n` +
      `Syntaxe simple : \`;reminder dans 2h Ne pas oublier le build\``,
    ));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('reminder:open_create')
        .setLabel('Créer un rappel')
        .setStyle(ButtonStyle.Primary),
    );
    ct.addActionRowComponents(row);

    return message.reply({
      components: [ct, row],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
