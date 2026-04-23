'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/custom-commands-storage');

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
  name       : 'customremove',
  aliases    : ['cremove', 'customdelete', 'cdelete'],
  category   : 'configuration',
  description: 'Supprime une commande custom.',
  usage      : ';customremove <nom>',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const guildId = message.guild.id;

    if (!ac.hasAccess(guildId, message.author.id)) {
      return reply(message, `${e('btn_error')} **Accès refusé** — Niveau Owner+ requis.`);
    }

    const name = (args[0] || '').toLowerCase();
    if (!name) {
      return reply(message,
        `${e('btn_error')} **Syntaxe invalide**\n${e('cat_information')} Usage : \`;customremove <nom>\``,
      );
    }

    const cmd = storage.getCommand(guildId, name);
    if (!cmd) {
      return reply(message, `${e('btn_error')} \`;${name}\` n'existe pas sur ce serveur.`);
    }

    storage.deleteCommand(guildId, name);
    const total = storage.countCommands(guildId);

    const container = new ContainerBuilder().setAccentColor(0xFF0000);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('btn_trash')} **Commande supprimée**`),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('ui_edit')} \`;${cmd.name}\`\n` +
        `${e('ui_user')} Créée par <@${cmd.created_by}>\n` +
        `${e('cat_giveaway')} ${cmd.uses_count} utilisation(s)`,
      ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('cat_information')} Total commandes restantes : **${total}/${storage.MAX_PER_GUILD}**`,
      ),
    );

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
