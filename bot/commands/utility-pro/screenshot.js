'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'screenshot',
  aliases    : ['ss', 'capture'],
  description: 'Screenshot d\'un site web (via APIFlash).',
  usage      : ';screenshot <url>',
  cooldown   : 30,
  guildOnly  : false,

  async execute(message, args) {
    const url = args[0];
    if (!url) return message.reply({ embeds: [E.error('Usage', '`;screenshot <url>`')] });

    try { new URL(url); }
    catch { return message.reply({ embeds: [E.error('URL invalide', 'Format : https://example.com')] }); }

    const apiKey = process.env.APIFLASH_KEY;
    if (!apiKey) {
      return message.reply({
        embeds: [E.warning('APIFlash non configuré', 'Ajoute `APIFLASH_KEY` dans `.env` (gratuit, 100/mois sur apiflash.com).')
          .addFields({ name: 'URL fournie', value: url })],
      });
    }

    const apiUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodeURIComponent(url)}&format=jpeg&width=1280&height=800&fresh=false&quality=80`;

    return message.reply({
      embeds: [E.base()
        .setTitle('📸 Screenshot')
        .setDescription(`URL : \`${url}\``)
        .setImage(apiUrl)
        .setFooter({ text: 'APIFlash · cache 1h' })],
    });
  },
};
