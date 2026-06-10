'use strict';

const { renderHelpPanel } = require('../../ui/panels/help-panel');
const { findCommand }     = require('../../core/help-helper');
const { errorEmbed, primaryEmbed } = require('../../utils/response-builder');
const { e } = require('../../core/emojis');

module.exports = {
  name       : 'help',
  aliases    : ['aide', 'h', 'commands'],
  category   : 'utility',
  description: 'Affiche la liste des commandes par catégorie.',
  usage      : ';help [commande]',

  async execute(message, args) {
    // Recherche directe d'une commande spécifique
    if (args[0]) {
      const query = args[0].toLowerCase().replace(/^;/, '');
      const cmd   = findCommand(query);

      if (!cmd) {
        return message.reply({
          embeds: [errorEmbed('Commande introuvable', `La commande \`${query}\` n'existe pas.`)],
          allowedMentions: { repliedUser: false },
        });
      }

      const badges  = cmd.ownerOnly ? `\n${e('cat_owner')} **Owner only**` : '';
      const aliases = cmd.aliases.length > 0
        ? `\n**Aliases :** ${cmd.aliases.map(a => `\`${a}\``).join(', ')}`
        : '';

      return message.reply({
        embeds: [
          primaryEmbed(
            `\`${cmd.usage}\``,
            `**Catégorie :** ${cmd.category}\n` +
            `**Description :** ${cmd.description}${aliases}${badges}`,
          ),
        ],
        allowedMentions: { repliedUser: false },
      });
    }

    // Panel dynamique — accueil avec avatar du bot
    try {
      const botAvatarURL = message.client.user.displayAvatarURL({ size: 256, extension: 'png' });
      return message.reply(renderHelpPanel(null, 1, botAvatarURL));
    } catch (err) {
      console.error('[help]', err);
      return message.reply({
        embeds: [errorEmbed('Erreur', err.message)],
        allowedMentions: { repliedUser: false },
      });
    }
  },
};
