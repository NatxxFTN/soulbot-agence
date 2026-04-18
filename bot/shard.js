'use strict';

// POURQUOI shard.js existe séparément de index.js : le ShardingManager est
// un process parent qui forke index.js en N processus enfants. Les deux
// ne peuvent pas coexister dans le même fichier — le manager ne doit jamais
// charger le Client directement.
// Référence : ARCHITECT_LOGIC.md §2 — Sharding ready

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { ShardingManager } = require('discord.js');
const path  = require('path');
const logger = require('./utils/logger');

// POURQUOI totalShards: 'auto' : Discord calcule le nombre optimal selon le
// nombre de guildes. À moins de 2500 guildes, 1 shard suffit mais 'auto'
// garantit la compatibilité sans modifier ce fichier lors de la croissance.
const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
  token       : process.env.DISCORD_TOKEN,
  totalShards : 'auto',
  respawn     : true,       // relance un shard crashé automatiquement
});

manager.on('shardCreate', (shard) => {
  logger.bot('ShardingManager', `Shard #${shard.id} lancé`);

  shard.on('ready',       ()    => logger.info(`Shard#${shard.id}`, 'Ready'));
  shard.on('disconnect',  ()    => logger.warn(`Shard#${shard.id}`, 'Déconnecté'));
  shard.on('reconnecting',()    => logger.warn(`Shard#${shard.id}`, 'Reconnexion...'));
  shard.on('death',       (p)   => logger.error(`Shard#${shard.id}`, `Mort (code ${p.exitCode})`));
  shard.on('error',       (err) => logger.errorStack(`Shard#${shard.id}`, err));
});

// Utilitaire — récupère le nombre total de guildes sur tous les shards.
// POURQUOI l'exporter ici : les commandes owner (stats globales) ont besoin
// de ce total. Elles appellent cette fonction plutôt que client.guilds.cache.size
// qui ne voit que le shard local. Référence : ARCHITECT_LOGIC.md §2
async function getGuildCount() {
  const counts = await manager.fetchClientValues('guilds.cache.size');
  return counts.reduce((acc, n) => acc + n, 0);
}

manager.spawn().then(() => {
  logger.info('ShardingManager', 'Tous les shards sont lancés');
}).catch(err => {
  logger.errorStack('ShardingManager', err);
  process.exit(1);
});

module.exports = { getGuildCount };
