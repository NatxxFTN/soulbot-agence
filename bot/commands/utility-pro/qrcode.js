'use strict';

const { AttachmentBuilder } = require('discord.js');
const E = require('../../utils/embeds');
const QR = require('qrcode');

module.exports = {
  name       : 'qrcode',
  aliases    : ['qr'],
  description: 'Génère un QR code à partir d\'un texte/URL.',
  usage      : ';qrcode <texte>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const text = args.join(' ').trim();
    if (!text) return message.reply({ embeds: [E.error('Usage', '`;qrcode <texte>`')] });
    if (text.length > 2000) return message.reply({ embeds: [E.error('Trop long', 'Max 2000 caractères.')] });

    try {
      const buf = await QR.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2,
        color: { dark: '#0A0A0A', light: '#FFFFFF' },
      });
      const file = new AttachmentBuilder(buf, { name: 'qrcode.png' });
      return message.reply({
        embeds: [E.success('QR Code généré')
          .setDescription(`Contenu : \`${text.slice(0, 200)}\``)
          .setImage('attachment://qrcode.png')],
        files: [file],
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur génération', err.message)] });
    }
  },
};
