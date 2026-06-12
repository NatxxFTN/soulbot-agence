'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

function panel(title, body, footer, mediaUrl) {
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
        new MediaGalleryItemBuilder().setURL(mediaUrl).setDescription('Screenshot'),
      ),
    );
  }
  if (footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));
  }
  return container;
}

function replyPanel(message, title, body, footer, mediaUrl) {
  return message.reply({
    components: [panel(title, body, footer, mediaUrl)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

module.exports = {
  name       : 'screenshot',
  aliases    : ['ss', 'capture'],
  description: 'Screenshot d\'un site web (via APIFlash).',
  usage      : ';screenshot <url>',
  cooldown   : 30,
  guildOnly  : false,

  async execute(message, args) {
    const url = args[0];
    if (!url) return replyPanel(message, `${e('btn_error')} **Usage**`, '`;screenshot <url>`');

    try { new URL(url); }
    catch { return replyPanel(message, `${e('btn_error')} **URL invalide**`, 'Format : https://example.com'); }

    const apiKey = process.env.APIFLASH_KEY;
    if (!apiKey) {
      return replyPanel(
        message,
        `${e('btn_tip')} **APIFlash non configuré**`,
        'Ajoute `APIFLASH_KEY` dans `.env` (gratuit, 100/mois sur apiflash.com).\n\n' +
        `**URL fournie**\n${url}`,
      );
    }

    const apiUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodeURIComponent(url)}&format=jpeg&width=1280&height=800&fresh=false&quality=80`;

    return replyPanel(message, '**Screenshot**', `URL : \`${url}\``, 'APIFlash · cache 1h', apiUrl);
  },
};
