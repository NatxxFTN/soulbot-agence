'use strict';

const E = require('../../utils/embeds');

const NAMED_COLORS = {
  rouge: '#FF0000', bleu: '#0000FF', vert: '#00FF00', jaune: '#FFFF00',
  noir: '#000000', blanc: '#FFFFFF', orange: '#FFA500', violet: '#800080',
  rose: '#FFC0CB', cyan: '#00FFFF', gris: '#808080', marron: '#8B4513',
  red: '#FF0000', blue: '#0000FF', green: '#00FF00', yellow: '#FFFF00',
  black: '#000000', white: '#FFFFFF', purple: '#800080', pink: '#FFC0CB',
  gray: '#808080', grey: '#808080',
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255), g = Math.round(f(8) * 255), b = Math.round(f(4) * 255);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

module.exports = {
  name       : 'color',
  aliases    : ['couleur', 'col'],
  description: 'Aperçu couleur + palette assortie.',
  usage      : ';color <hex|rgb|name>',
  cooldown   : 3,
  guildOnly  : false,

  async execute(message, args) {
    const input = args.join(' ').trim().toLowerCase();
    if (!input) return message.reply({ embeds: [E.error('Usage', '`;color <#FF0000 | rgb(255,0,0) | rouge>`')] });

    let hex = null;
    if (NAMED_COLORS[input]) hex = NAMED_COLORS[input];
    else if (/^#?[0-9a-f]{6}$/i.test(input)) hex = '#' + input.replace('#', '').toUpperCase();
    else {
      const m = input.match(/(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/);
      if (m) {
        const r = +m[1], g = +m[2], b = +m[3];
        if (r > 255 || g > 255 || b > 255) return message.reply({ embeds: [E.error('RGB invalide', 'Valeurs 0-255.')] });
        hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      }
    }
    if (!hex) return message.reply({ embeds: [E.error('Format inconnu', 'Utilise hex, RGB ou un nom commun.')] });

    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);

    // Palette : complémentaire + 2 analogues
    const complement = hslToHex((h + 180) % 360, s, l);
    const analog1 = hslToHex((h + 30) % 360, s, l);
    const analog2 = hslToHex((h - 30 + 360) % 360, s, l);

    const colorInt = parseInt(hex.replace('#', ''), 16);
    const previewUrl = `https://singlecolorimage.com/get/${hex.replace('#', '')}/200x200`;

    return message.reply({
      embeds: [E.base()
        .setColor(colorInt)
        .setTitle(`🎨 ${hex}`)
        .setThumbnail(previewUrl)
        .addFields(
          { name: 'HEX', value: `\`${hex}\``, inline: true },
          { name: 'RGB', value: `\`rgb(${r}, ${g}, ${b})\``, inline: true },
          { name: 'HSL', value: `\`hsl(${h}, ${s}%, ${l}%)\``, inline: true },
          { name: 'Palette assortie', value: `Complémentaire : \`${complement}\`\nAnalogues : \`${analog1}\` · \`${analog2}\`` },
        )],
    });
  },
};
