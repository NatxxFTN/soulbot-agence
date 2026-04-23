'use strict';

const E = require('../../utils/embeds');
const { e } = require('../../core/emojis');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

module.exports = {
  name       : 'bot',
  aliases    : ['botinfo', 'about'],
  description: 'Affiche les statistiques et informations détaillées du bot.',
  usage      : ';bot',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
      const memUsage     = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
      const uptime       = formatUptime(client.uptime);
      const ping         = Math.round(client.ws.ping);

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle('Statistiques du bot')
            .addFields(
              { name: `${e('btn_home')} Serveurs`,   value: `${client.guilds.cache.size}`,    inline: true },
              { name: '👥 Membres',    value: `${totalMembers}`,                 inline: true },
              { name: '⚡ Commandes',  value: `${client.commands.size}`,         inline: true },
              { name: '📡 Ping',       value: `${ping}ms`,                       inline: true },
              { name: '💾 RAM',        value: `${memUsage} MB`,                  inline: true },
              { name: '⏱ Uptime',     value: uptime,                             inline: true },
              { name: `${e('cat_utility')} Node.js`,   value: process.version,                   inline: true },
              { name: '📦 discord.js', value: require('discord.js').version,    inline: true },
              { name: '🆔 ID',         value: `\`${client.user.id}\``,           inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
