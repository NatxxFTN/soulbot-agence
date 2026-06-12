'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

function panel(title, body) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  return container;
}

function replyPanel(message, title, body) {
  return message.reply({
    components: [panel(title, body)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

module.exports = {
  name       : 'shorten',
  aliases    : ['short', 'tinyurl'],
  description: 'Raccourcit une URL via TinyURL.',
  usage      : ';shorten <url>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const url = args[0];
    if (!url) return replyPanel(message, `${e('btn_error')} **Usage**`, '`;shorten <url>`');

    try { new URL(url); }
    catch { return replyPanel(message, `${e('btn_error')} **URL invalide**`, 'Format : https://example.com'); }

    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const short = (await res.text()).trim();
      if (!short.startsWith('http')) throw new Error('Réponse invalide');

      return replyPanel(
        message,
        `${e('btn_success')} **URL raccourcie**`,
        `**Original**\n\`${url.slice(0, 1000)}\`\n\n**Court**\n${short}`,
      );
    } catch (err) {
      return replyPanel(message, `${e('btn_error')} **Erreur API**`, err.message);
    }
  },
};
