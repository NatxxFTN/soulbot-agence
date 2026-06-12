'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

// Endpoint LibreTranslate public (sans clé). Source : libretranslate.com (peut être lent / down).
const LT_ENDPOINT = process.env.LIBRETRANSLATE_URL || 'https://translate.disroot.org/translate';

function panel(title, body, footer) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  if (footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(footer));
  }
  return container;
}

function replyPanel(message, title, body, footer) {
  return message.reply({
    components: [panel(title, body, footer)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

module.exports = {
  name       : 'translate',
  aliases    : ['tr', 'traduire'],
  description: 'Traduit un texte (auto-detect - FR ou EN).',
  usage      : ';translate <texte>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const text = args.join(' ').trim();
    if (!text) return replyPanel(message, `${e('btn_error')} **Usage**`, '`;translate <texte>`');
    if (text.length > 1000) return replyPanel(message, `${e('btn_error')} **Trop long**`, 'Max 1000 caractères.');

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
      return replyPanel(
        message,
        `${e('ani_world')} **Traduction**`,
        `**Source (${srcLang})**\n${text.slice(0, 1000)}\n\n` +
        `**Cible (${target})**\n${(data.translatedText || '_(vide)_').slice(0, 1000)}`,
        'LibreTranslate · gratuit',
      );
    } catch (err) {
      return replyPanel(message, `${e('btn_error')} **API indisponible**`, `LibreTranslate : ${err.message}`);
    }
  },
};
