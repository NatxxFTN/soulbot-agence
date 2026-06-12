'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const math = require('mathjs');
const { e } = require('../../core/emojis');

// Limited mathjs scope (no eval/import/etc.)
const limitedMath = math.create(math.all);
limitedMath.import({
  import     : () => { throw new Error('disabled'); },
  createUnit : () => { throw new Error('disabled'); },
  evaluate   : () => { throw new Error('use parser'); },
  parse      : () => { throw new Error('use parser'); },
  simplify   : () => { throw new Error('disabled'); },
  derivative : () => { throw new Error('disabled'); },
}, { override: true });

const parser = limitedMath.parser();

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
  name       : 'calc',
  aliases    : ['calcul', 'math'],
  description: 'Calculatrice.',
  usage      : ';calc <expression>',
  cooldown   : 3,
  guildOnly  : false,

  async execute(message, args) {
    const expr = args.join(' ').trim();
    if (!expr) return replyPanel(message, `${e('btn_error')} **Usage**`, '`;calc 2+2*5`');
    if (expr.length > 200) return replyPanel(message, `${e('btn_error')} **Trop long**`, 'Max 200 caractères.');

    try {
      parser.clear();
      const result = parser.evaluate(expr);
      const out = typeof result === 'object' ? math.format(result, { precision: 10 }) : String(result);
      return replyPanel(
        message,
        `${e('cat_utility')} **Calculatrice**`,
        `**Expression**\n\`${expr}\`\n\n**Résultat**\n**${out}**`,
      );
    } catch (err) {
      return replyPanel(message, `${e('btn_error')} **Expression invalide**`, err.message);
    }
  },
};
