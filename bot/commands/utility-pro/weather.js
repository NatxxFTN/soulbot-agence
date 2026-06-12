'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

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
  name       : 'weather',
  aliases    : ['meteo'],
  description: 'Météo actuelle d\'une ville.',
  usage      : ';weather <ville>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const city = args.join(' ').trim();
    if (!city) return replyPanel(message, `${e('btn_error')} **Usage**`, '`;weather <ville>`');

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return replyPanel(message, `${e('btn_error')} **Clé API manquante**`, 'Ajoute `OPENWEATHER_API_KEY` dans `.env` (gratuit sur openweathermap.org).');
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) {
        if (res.status === 404) return replyPanel(message, `${e('btn_error')} **Ville inconnue**`, `\`${city}\` introuvable.`);
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      const main = data.weather?.[0]?.main || 'Clear';
      const desc = data.weather?.[0]?.description || '?';

      return replyPanel(
        message,
        `${e('ani_world')} **Météo · ${data.name}, ${data.sys?.country || '?'}**`,
        `**${desc}** · _${main}_\n\n` +
        `**Temp**\n${Math.round(data.main.temp)}°C (ressentie ${Math.round(data.main.feels_like)}°C)\n\n` +
        `**Humidité**\n${data.main.humidity}%\n\n` +
        `**Vent**\n${Math.round(data.wind.speed * 3.6)} km/h\n\n` +
        `**Visibilité**\n${(data.visibility / 1000).toFixed(1)} km\n\n` +
        `**Nuages**\n${data.clouds.all}%\n\n` +
        `**Pression**\n${data.main.pressure} hPa`,
        'OpenWeatherMap',
      );
    } catch (err) {
      return replyPanel(message, `${e('btn_error')} **Erreur API**`, err.message);
    }
  },
};
