'use strict';

const { ActivityType } = require('discord.js');
const E  = require('../../utils/embeds');
const { db } = require('../../database');

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_status_rotation (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT    NOT NULL DEFAULT 'PLAYING',
    name          TEXT    NOT NULL,
    url           TEXT
  );
`);

const STMT_ADD    = db.prepare('INSERT INTO bot_status_rotation (activity_type, name, url) VALUES (?, ?, ?)');
const STMT_REMOVE = db.prepare('DELETE FROM bot_status_rotation WHERE id = ?');
const STMT_LIST   = db.prepare('SELECT * FROM bot_status_rotation ORDER BY id');
const STMT_CLEAR  = db.prepare('DELETE FROM bot_status_rotation');

const TYPE_MAP = {
  playing  : ActivityType.Playing,
  watching : ActivityType.Watching,
  listening: ActivityType.Listening,
  streaming: ActivityType.Streaming,
  competing: ActivityType.Competing,
};

// Interval stored on client to survive reloads within session
function startRotation(client, intervalMs) {
  if (client._statusRotatorInterval) clearInterval(client._statusRotatorInterval);
  const statuses = STMT_LIST.all();
  if (!statuses.length) return false;
  let idx = 0;
  const apply = () => {
    const s    = statuses[idx % statuses.length];
    const type = TYPE_MAP[s.activity_type.toLowerCase()] ?? ActivityType.Playing;
    const opts = { name: s.name, type };
    if (type === ActivityType.Streaming && s.url) opts.url = s.url;
    client.user.setActivity(opts);
    idx++;
  };
  apply();
  client._statusRotatorInterval = setInterval(apply, intervalMs);
  return true;
}

module.exports = {
  name       : 'statutrotator',
  aliases    : ['rotator'],
  description: 'Fait tourner plusieurs statuts automatiquement.',
  usage      : ';statutrotator <add|remove|list|start|stop|clear> [args]',
  cooldown   : 3,
  guildOnly  : false,
  ownerOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    try {
      const sub = args[0]?.toLowerCase();

      // ── list ──────────────────────────────────────────────────────────────
      if (sub === 'list') {
        const rows = STMT_LIST.all();
        if (!rows.length) return message.channel.send({ embeds: [E.info('Rotateur', 'Aucun statut enregistré.')] });
        const lines = rows.map(r => `\`${r.id}\` [${r.activity_type}] **${r.name}**${r.url ? ` — ${r.url}` : ''}`).join('\n');
        return message.channel.send({ embeds: [E.base().setTitle(`Statuts en rotation (${rows.length})`).setDescription(lines)] });
      }

      // ── add <type> <texte> [url] ──────────────────────────────────────────
      if (sub === 'add') {
        const type = args[1]?.toLowerCase();
        if (!type || !TYPE_MAP[type]) {
          return message.reply({ embeds: [E.error('Type invalide', 'Types : `playing` `watching` `listening` `streaming` `competing`')] });
        }
        const rest  = args.slice(2);
        const url   = (type === 'streaming' && rest[rest.length - 1]?.startsWith('http')) ? rest.pop() : null;
        const name  = rest.join(' ').slice(0, 128);
        if (!name) return message.reply({ embeds: [E.usage(';', 'statutrotator add <type> <texte> [url]')] });
        STMT_ADD.run(type.toUpperCase(), name, url);
        return message.channel.send({ embeds: [E.success('Statut ajouté', `[${type}] **${name}** ajouté à la rotation.`)] });
      }

      // ── remove <id> ───────────────────────────────────────────────────────
      if (sub === 'remove') {
        const id = parseInt(args[1], 10);
        if (!id) return message.reply({ embeds: [E.usage(';', 'statutrotator remove <id>')] });
        const result = STMT_REMOVE.run(id);
        if (!result.changes) return message.reply({ embeds: [E.error('Non trouvé', `Aucun statut avec l'id \`${id}\`.`)] });
        return message.channel.send({ embeds: [E.success('Statut retiré', `Statut \`${id}\` supprimé.`)] });
      }

      // ── clear ─────────────────────────────────────────────────────────────
      if (sub === 'clear') {
        STMT_CLEAR.run();
        if (client._statusRotatorInterval) {
          clearInterval(client._statusRotatorInterval);
          delete client._statusRotatorInterval;
        }
        return message.channel.send({ embeds: [E.success('Rotation vidée', 'Tous les statuts ont été supprimés.')] });
      }

      // ── start [secondes] ─────────────────────────────────────────────────
      if (sub === 'start') {
        const secs = Math.max(10, parseInt(args[1], 10) || 30);
        const ok   = startRotation(client, secs * 1000);
        if (!ok) return message.reply({ embeds: [E.error('Liste vide', 'Ajoute des statuts avant de démarrer la rotation.')] });
        return message.channel.send({ embeds: [E.success('Rotation démarrée', `Changement toutes les **${secs}s**.`)] });
      }

      // ── stop ──────────────────────────────────────────────────────────────
      if (sub === 'stop') {
        if (!client._statusRotatorInterval) {
          return message.reply({ embeds: [E.warning('Rotation inactive', 'Aucune rotation en cours.')] });
        }
        clearInterval(client._statusRotatorInterval);
        delete client._statusRotatorInterval;
        client.user.setActivity(null);
        return message.channel.send({ embeds: [E.success('Rotation arrêtée', 'Le statut automatique a été coupé.')] });
      }

      return message.reply({ embeds: [E.usage(';', 'statutrotator <add|remove|list|start|stop|clear>')] });
    } catch (err) {
      return message.channel.send({ embeds: [E.error('Erreur', err.message)] });
    }
  },
};
