'use strict';

const E = require('../../utils/embeds');
const { version } = require('../../../package.json');

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}j ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
}

module.exports = {
  name       : 'status',
  aliases    : ['botstatus', 'botinfo'],
  description: 'Affiche les statistiques techniques du bot.',
  usage      : ';status',
  cooldown   : 5,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const mem     = process.memoryUsage();
      const heapMB  = (mem.heapUsed / 1024 / 1024).toFixed(1);
      const rssMB   = (mem.rss / 1024 / 1024).toFixed(1);
      const uptime  = formatUptime(client.uptime ?? 0);
      const guilds  = client.guilds.cache.size;
      const users   = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount ?? 0), 0);
      const cmds    = client.commands.size;
      const ping    = client.ws.ping;

      return message.channel.send({
        embeds: [
          E.base()
            .setTitle('Statut du bot')
            .addFields(
              { name: '🏓 Latence',       value: `${ping}ms`,    inline: true },
              { name: '⏱️ Uptime',         value: uptime,         inline: true },
              { name: '📦 Version',        value: `v${version}`,  inline: true },
              { name: '🌐 Serveurs',       value: `${guilds}`,    inline: true },
              { name: '👥 Utilisateurs',   value: `${users}`,     inline: true },
              { name: '⌨️ Commandes',      value: `${cmds}`,      inline: true },
              { name: '🧠 Heap mémoire',   value: `${heapMB} MB`, inline: true },
              { name: '💾 RSS mémoire',    value: `${rssMB} MB`,  inline: true },
              { name: '🟢 Node.js',        value: process.version, inline: true },
            ),
        ],
      });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
