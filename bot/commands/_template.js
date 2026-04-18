'use strict';

// ─── Template universel Soulbot ──────────────────────────────────────────────
// Copier ce fichier, renommer, remplir les TODO.
// Chaque fichier = une commande. Ne pas exporter plusieurs commandes par fichier.
// Le CommandHandler lit cmd.name et cmd.execute à la racine de module.exports.

const E = require('../../utils/embeds');
// const { db } = require('../../database'); // Décommenter si requêtes DB nécessaires

module.exports = {
  // ── Identité ────────────────────────────────────────────────────────────────
  name       : 'TODO_nom',            // minuscules, pas d'espace
  aliases    : [],                    // ex: ['alias1', 'alias2']
  description: 'TODO_description',   // ≤ 100 chars — affiché dans ;help
  usage      : ';TODO_nom [args]',    // syntaxe complète
  cooldown   : 3,                     // secondes

  // ── Guards ──────────────────────────────────────────────────────────────────
  guildOnly  : true,                  // false si utilisable en DM
  ownerOnly  : false,                 // true uniquement pour commandes owner bot
  permissions: [],                    // ex: ['Administrator'], ['ManageMessages']
  // Valeurs valides : https://discord.js.org/docs/packages/discord.js/main/PermissionFlagsBits:Variable

  // ── Exécution ───────────────────────────────────────────────────────────────
  async execute(message, args, client) {
    // Exemple validation args :
    // if (!args[0]) {
    //   return message.reply({ embeds: [E.error('Argument manquant', 'Usage : `;TODO_nom <arg>`')] });
    // }

    // Exemple réponse succès :
    return message.channel.send({
      embeds: [E.success('TODO_titre', 'TODO_description_succès')],
    });
  },
};
