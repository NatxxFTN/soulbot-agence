'use strict';

const E = require('../../utils/embeds');

// Endpoint LibreTranslate public (sans clé). Source : libretranslate.com (peut être lent / down).
const LT_ENDPOINT = process.env.LIBRETRANSLATE_URL || 'https://translate.disroot.org/translate';

const FLAG = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹', ja: '🇯🇵', zh: '🇨🇳', ru: '🇷🇺', ar: '🇸🇦', nl: '🇳🇱' };

module.exports = {
  name       : 'translate',
  aliases    : ['tr', 'traduire'],
  description: 'Traduit un texte (auto-detect → FR ou EN).',
  usage      : ';translate <texte>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const text = args.join(' ').trim();
    if (!text) return message.reply({ embeds: [E.error('Usage', '`;translate <texte>`')] });
    if (text.length > 1000) return message.reply({ embeds: [E.error('Trop long', 'Max 1000 caractères.')] });

    try {
      const res = await fetch(LT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'auto', target: 'fr', format: 'text' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let target = 'fr';
      if (data.detectedLanguage?.language === 'fr') {
        // Re-traduction en EN si source = FR
        const r2 = await fetch(LT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: 'fr', target: 'en', format: 'text' }),
          signal: AbortSignal.timeout(10_000),
        });
        if (r2.ok) {
          const d2 = await r2.json();
          data.translatedText = d2.translatedText;
          target = 'en';
        }
      }

      const srcLang = data.detectedLanguage?.language || '?';
      return message.reply({
        embeds: [E.base()
          .setTitle('🌍 Traduction')
          .addFields(
            { name: `${FLAG[srcLang] || '🏳️'} Source (${srcLang})`, value: text.slice(0, 1000) },
            { name: `${FLAG[target] || '🏳️'} Cible (${target})`,    value: (data.translatedText || '_(vide)_').slice(0, 1000) },
          )
          .setFooter({ text: 'LibreTranslate · gratuit' })],
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('API indisponible', `LibreTranslate : ${err.message}`)] });
    }
  },
};
