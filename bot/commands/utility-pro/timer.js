'use strict';

const E = require('../../utils/embeds');

let parseDuration;
try { parseDuration = require('ms'); } catch { parseDuration = () => null; }

const MAX_TIMER_MS = 60 * 60 * 1000; // 1h max

module.exports = {
  name       : 'timer',
  aliases    : ['minuteur', 'compteur'],
  description: 'Minuteur visuel avec décompte (max 1h).',
  usage      : ';timer <durée> [titre]',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const dur = args[0];
    const title = args.slice(1).join(' ').slice(0, 100) || 'Timer';
    const ms = parseDuration(dur);
    if (!ms || ms < 5_000 || ms > MAX_TIMER_MS) {
      return message.reply({ embeds: [E.error('Durée invalide', 'Min 5s, max 1h. Format : `30s`, `5m`, `1h`.')] });
    }

    const endsAt = Math.floor((Date.now() + ms) / 1000);

    const buildEmbed = (remaining) => {
      const filled = Math.max(0, Math.min(20, Math.round(((ms - remaining) / ms) * 20)));
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      return E.base()
        .setTitle(`⏱️ ${title}`)
        .setDescription(`Fin : <t:${endsAt}:R>\n\n\`${bar}\`\n\nRestant : **${Math.ceil(remaining / 1000)}s**`)
        .setFooter({ text: `Lancé par ${message.author.tag}` });
    };

    const msg = await message.reply({ embeds: [buildEmbed(ms)] });

    const startTs = Date.now();
    const tick = setInterval(async () => {
      const elapsed = Date.now() - startTs;
      const remaining = ms - elapsed;
      if (remaining <= 0) {
        clearInterval(tick);
        return msg.edit({
          embeds: [E.success(`⏰ ${title} — Terminé !`)
            .setDescription(`<@${message.author.id}> ton timer est fini !`)],
        }).catch(() => {});
      }
      msg.edit({ embeds: [buildEmbed(remaining)] }).catch(() => {});
    }, 5000);
  },
};
