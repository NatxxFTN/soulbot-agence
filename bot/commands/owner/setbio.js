'use strict';

const { MessageFlags } = require('discord.js');
const { e } = require('../../core/emojis');
const logger = require('../../utils/logger');

module.exports = {
  name       : 'setbio',
  aliases    : ['setdescription', 'aboutme'],
  category   : 'owner',
  description: 'Modifie la bio du bot (About Me).',
  usage      : ';setbio <texte>',
  ownerOnly  : true,
  guildOnly  : false,

  async execute(message, args) {
    const bio = args.join(' ').trim();
    if (!bio || bio.length < 2) {
      return message.reply(`${e('btn_error')} Usage : \`;setbio <texte>\``);
    }
    if (bio.length > 400) {
      return message.reply(`${e('btn_error')} La bio ne peut pas dépasser **400 caractères** (t'as ${bio.length}).`);
    }

    try {
      await message.client.application.edit({ description: bio });
      logger.info('SetBio', `Bio modifiée par ${message.author.tag}: "${bio}"`);
      return message.reply(`${e('btn_success')} Bio du bot mise à jour avec succès !\n\`\`\`${bio}\`\`\``);
    } catch (err) {
      logger.error('SetBio', err.message);
      return message.reply(`${e('btn_error')} Erreur : \`${err.message}\``);
    }
  },
};
