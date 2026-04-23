'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/custom-commands-storage');
const { isReservedName } = require('../../core/reserved-command-names');

function reply(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags     : MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  });
}

module.exports = {
  name       : 'customadd',
  aliases    : ['cadd'],
  category   : 'configuration',
  description: 'Crée une nouvelle commande custom (texte ou variables).',
  usage      : ';customadd <nom> <réponse>',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args, client) {
    const guildId = message.guild.id;

    if (!ac.hasAccess(guildId, message.author.id)) {
      return reply(message,
        `${e('btn_error')} **Accès refusé**\n${e('ui_lock')} Niveau requis : Owner+`,
      );
    }

    const name     = (args[0] || '').toLowerCase();
    const response = args.slice(1).join(' ');

    if (!name || !response) {
      return reply(message,
        `${e('btn_error')} **Syntaxe invalide**\n` +
        `${e('cat_information')} Usage : \`;customadd <nom> <réponse>\`\n` +
        `${e('btn_tip')} Exemple : \`;customadd règles **Règles** :\\n1. Respect\\n2. ...\``,
      );
    }

    if (!storage.validateName(name)) {
      return reply(message,
        `${e('btn_error')} **Nom invalide**\n` +
        `${e('cat_information')} 2-32 caractères, uniquement \`[a-z 0-9 _ -]\``,
      );
    }

    if (isReservedName(client, name)) {
      return reply(message,
        `${e('btn_error')} **Nom réservé**\n` +
        `${e('ui_lock')} \`;${name}\` est une commande native du bot.`,
      );
    }

    if (storage.getCommand(guildId, name)) {
      return reply(message,
        `${e('btn_error')} \`;${name}\` existe déjà. Utilise \`;customedit\` pour la modifier.`,
      );
    }

    try {
      storage.createCommand(guildId, name, 'text', { text: response }, message.author.id);
    } catch (err) {
      return reply(message, `${e('btn_error')} ${err.message}`);
    }

    const total = storage.countCommands(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Commande custom créée** ${e('ani_diamond')}`),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_success')} \`;${name}\` est maintenant active.\n` +
        `${e('ui_user')} Créée par <@${message.author.id}>\n` +
        `${e('ui_folder')} ${response.length} caractère(s)`,
      ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('cat_information')} Total commandes custom : **${total}/${storage.MAX_PER_GUILD}**\n` +
        `${e('btn_tip')} Teste-la avec \`;${name}\``,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
