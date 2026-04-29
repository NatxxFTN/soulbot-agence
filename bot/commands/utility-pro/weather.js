'use strict';

const E = require('../../utils/embeds');

const ICON = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
  Haze: '🌫️', Smoke: '🌫️', Dust: '🌪️', Sand: '🌪️', Ash: '🌋',
  Squall: '💨', Tornado: '🌪️',
};

module.exports = {
  name       : 'weather',
  aliases    : ['meteo'],
  description: 'Météo actuelle d\'une ville.',
  usage      : ';weather <ville>',
  cooldown   : 5,
  guildOnly  : false,

  async execute(message, args) {
    const city = args.join(' ').trim();
    if (!city) return message.reply({ embeds: [E.error('Usage', '`;weather <ville>`')] });

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return message.reply({ embeds: [E.error('Clé API manquante', 'Ajoute `OPENWEATHER_API_KEY` dans `.env` (gratuit sur openweathermap.org).')] });
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) {
        if (res.status === 404) return message.reply({ embeds: [E.error('Ville inconnue', `\`${city}\` introuvable.`)] });
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      const main = data.weather?.[0]?.main || 'Clear';
      const desc = data.weather?.[0]?.description || '?';

      return message.reply({
        embeds: [E.base()
          .setTitle(`${ICON[main] || '🌤️'} Météo · ${data.name}, ${data.sys?.country || '?'}`)
          .setDescription(`**${desc}** · _${main}_`)
          .addFields(
            { name: '🌡️ Temp', value: `${Math.round(data.main.temp)}°C (ressentie ${Math.round(data.main.feels_like)}°C)`, inline: true },
            { name: '💧 Humidité', value: `${data.main.humidity}%`, inline: true },
            { name: '💨 Vent', value: `${Math.round(data.wind.speed * 3.6)} km/h`, inline: true },
            { name: '👁️ Visibilité', value: `${(data.visibility / 1000).toFixed(1)} km`, inline: true },
            { name: '☁️ Nuages', value: `${data.clouds.all}%`, inline: true },
            { name: '🔻 Pression', value: `${data.main.pressure} hPa`, inline: true },
          )
          .setFooter({ text: 'OpenWeatherMap' })],
      });
    } catch (err) {
      return message.reply({ embeds: [E.error('Erreur API', err.message)] });
    }
  },
};
