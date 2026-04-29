'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'shorten',
  aliases    : ['short', 'tinyurl'],
  description: 'Raccourcit une URL via TinyURL.',
  usage      : ';shorten <url>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const url = args[0];
    if (!url) return message.reply({ embeds: [E.error('Usage', '`;shorten <url>`')] });

    try { new URL(url); }
    catch { return message.reply({ embeds: [E.error('URL invalide', 'Format : https://example.com')] }); }

    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const short = (await res.text()).trim();
      if (!short.startsWith('http')) throw new Error('Réponse invalide');

      return message.reply({
        embeds: [E.success('🔗 URL raccourcie')
          .addFields(
            { name: 'Original', value: `\`${url.slice(0, 1000)}\`` },
            { name: 'Court',    value: short },
          )],
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', err.message)] });
    }
  },
};
