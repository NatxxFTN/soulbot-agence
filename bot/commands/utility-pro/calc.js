'use strict';

const E = require('../../utils/embeds');
const math = require('mathjs');

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

module.exports = {
  name       : 'calc',
  aliases    : ['calcul', 'math'],
  description: 'Calculatrice.',
  usage      : ';calc <expression>',
  cooldown   : 3,
  guildOnly  : false,

  async execute(message, args) {
    const expr = args.join(' ').trim();
    if (!expr) return message.reply({ embeds: [E.error('Usage', '`;calc 2+2*5`')] });
    if (expr.length > 200) return message.reply({ embeds: [E.error('Trop long', 'Max 200 caractères.')] });

    try {
      parser.clear();
      const result = parser.evaluate(expr);
      const out = typeof result === 'object' ? math.format(result, { precision: 10 }) : String(result);
      return message.reply({
        embeds: [E.base()
          .setTitle('🧮 Calculatrice')
          .addFields(
            { name: 'Expression', value: `\`${expr}\`` },
            { name: 'Résultat',   value: `**${out}**` },
          )],
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('Expression invalide', err.message)] });
    }
  },
};
