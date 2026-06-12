'use strict';

const {
  AttachmentBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const QR = require('qrcode');

function panel(title, body, mediaUrl) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  if (mediaUrl) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(mediaUrl).setDescription('QR Code généré'),
      ),
    );
  }
  return container;
}

function replyPanel(message, title, body, extra = {}) {
  const { mediaUrl, ...messageOptions } = extra;
  return message.reply({
    components: [panel(title, body, mediaUrl)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    ...messageOptions,
  });
}

module.exports = {
  name       : 'qrcode',
  aliases    : ['qr'],
  description: 'Génère un QR code à partir d\'un texte/URL.',
  usage      : ';qrcode <texte>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const text = args.join(' ').trim();
    if (!text) return replyPanel(message, `${e('btn_error')} **Usage**`, '`;qrcode <texte>`');
    if (text.length > 2000) return replyPanel(message, `${e('btn_error')} **Trop long**`, 'Max 2000 caractères.');

    try {
      const buf = await QR.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2,
        color: { dark: '#0A0A0A', light: '#FFFFFF' },
      });
      const file = new AttachmentBuilder(buf, { name: 'qrcode.png' });
      return replyPanel(message, `${e('btn_success')} **QR Code généré**`, `Contenu : \`${text.slice(0, 200)}\``, {
        mediaUrl: 'attachment://qrcode.png',
        files: [file],
      });
    } catch (err) {
      return replyPanel(message, `${e('btn_error')} **Erreur génération**`, err.message);
    }
  },
};
