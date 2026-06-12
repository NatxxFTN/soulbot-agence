'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

let parseDuration;
try { parseDuration = require('ms'); } catch { parseDuration = () => null; }

const MAX_TIMER_MS = 60 * 60 * 1000; // 1h max

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
  name       : 'timer',
  aliases    : ['minuteur'],
  description: 'Minuteur visuel avec décompte (max 1h).',
  usage      : ';timer <durée> [titre]',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const dur = args[0];
    const title = args.slice(1).join(' ').slice(0, 100) || 'Timer';
    const ms = parseDuration(dur);
    if (!ms || ms < 5_000 || ms > MAX_TIMER_MS) {
      return replyPanel(message, `${e('btn_error')} **Durée invalide**`, 'Min 5s, max 1h. Format : `30s`, `5m`, `1h`.');
    }

    const endsAt = Math.floor((Date.now() + ms) / 1000);

    const buildPanel = (remaining) => {
      const filled = Math.max(0, Math.min(20, Math.round(((ms - remaining) / ms) * 20)));
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      return panel(
        `${e('ani_loading')} **${title}**`,
        `Fin : <t:${endsAt}:R>\n\n\`${bar}\`\n\nRestant : **${Math.ceil(remaining / 1000)}s**`,
        `Lancé par ${message.author.tag}`,
      );
    };

    const msg = await message.reply({
      components: [buildPanel(ms)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    const startTs = Date.now();
    const tick = setInterval(async () => {
      const elapsed = Date.now() - startTs;
      const remaining = ms - elapsed;
      if (remaining <= 0) {
        clearInterval(tick);
        return msg.edit({
          components: [panel(`${e('btn_success')} **${title} — Terminé !**`, `<@${message.author.id}> ton timer est fini !`)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        }).catch(() => {});
      }
      msg.edit({ components: [buildPanel(remaining)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }, 5000);
  },
};
