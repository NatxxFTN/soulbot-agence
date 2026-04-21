'use strict';

const { renderHelpPanel } = require('../../ui/panels/help-panel');
const { findCommand }     = require('../../core/help-helper');

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
        return message.reply({ content: `✗ Commande \`${query}\` introuvable.` });
      }

      const badges  = cmd.ownerOnly ? '\n👑 **Owner only**' : '';
      const aliases = cmd.aliases.length > 0
        ? `\n**Aliases :** ${cmd.aliases.map(a => `\`${a}\``).join(', ')}`
        : '';

      return message.reply({
        content:
          `## \`${cmd.usage}\`\n` +
          `**Catégorie :** ${cmd.category}\n` +
          `**Description :** ${cmd.description}${aliases}${badges}`,
      });
    }

    // Panel dynamique Components V2
    try {
      return message.reply(renderHelpPanel());
    } catch (err) {
      console.error('[help]', err);
      return message.reply({ content: `✗ Erreur : ${err.message}` });
    }
  },
};
