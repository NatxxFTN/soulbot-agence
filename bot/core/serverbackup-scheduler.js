'use strict';

const zlib = require('zlib');
const storage = require('./serverbackup-storage');

function serializeGuild(guild, includeMembers) {
  const channels = guild.channels.cache.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    parent_id: c.parentId || null,
    position: c.position ?? 0,
    permissionOverwrites: c.permissionOverwrites?.cache
      ? Array.from(c.permissionOverwrites.cache.values()).map(po => ({
          id: po.id,
          type: po.type,
          allow: po.allow?.bitfield?.toString?.() ?? String(po.allow || '0'),
          deny : po.deny?.bitfield?.toString?.()  ?? String(po.deny  || '0'),
        }))
      : [],
  }));

  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id)
    .map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions_bitfield: r.permissions?.bitfield?.toString?.() ?? String(r.permissions || '0'),
      position: r.position ?? 0,
    }));

  let members = null;
  if (includeMembers) {
    members = [];
    for (const m of guild.members.cache.values()) {
      if (m.user.bot) continue;
      members.push({
        id: m.id,
        tag: m.user.tag,
        joined_at: m.joinedTimestamp,
        roles: m.roles.cache.map(r => r.id).filter(id => id !== guild.id),
      });
    }
  }

  return {
    guild_name: guild.name,
    guild_id: guild.id,
    created_at: Date.now(),
    channels,
    roles,
    members,
  };
}

async function createBackup(guild, config, auto = false) {
  try {
    const includeMembers = !!(config && config.include_members);
    const payload = serializeGuild(guild, includeMembers);
    const json = JSON.stringify(payload);
    const gz = zlib.gzipSync(Buffer.from(json, 'utf8'));
    const name = `${auto ? 'auto' : 'manual'}_${Date.now()}`;

    const id = storage.createSnapshot({
      guild_id: guild.id,
      name,
      snapshot_data: gz,
      size_bytes: gz.length,
      members_count: payload.members?.length || 0,
      channels_count: payload.channels.length,
      roles_count: payload.roles.length,
      created_at: payload.created_at,
      auto: auto ? 1 : 0,
    });

    // Prune old
    const maxKeep = (config && parseInt(config.max_backups, 10)) || 5;
    storage.pruneOldSnapshots(guild.id, maxKeep);
    storage.updateLastBackup(guild.id, payload.created_at);

    return { id, name, size: gz.length, channels: payload.channels.length, roles: payload.roles.length };
  } catch (err) {
    console.error('[serverbackup] createBackup:', err);
    return null;
  }
}

function startServerbackupScheduler(client) {
  console.log('[serverbackup-scheduler] Démarré');
  const tick = async () => {
    try {
      const configs = storage.getAllEnabledConfigs();
      const now = Date.now();
      for (const cfg of configs) {
        const intervalMs = (cfg.interval_days || 7) * 24 * 60 * 60 * 1000;
        if (cfg.last_backup_at && (now - cfg.last_backup_at) < intervalMs) continue;

        const guild = client.guilds.cache.get(cfg.guild_id);
        if (!guild) continue;

        const res = await createBackup(guild, cfg, true);
        if (res && cfg.notify_channel) {
          try {
            const ch = await guild.channels.fetch(cfg.notify_channel).catch(() => null);
            if (ch) {
              await ch.send({
                content: `✓ Backup automatique effectué : **${res.name}** · ${res.channels} salons · ${res.roles} rôles · ${(res.size / 1024).toFixed(1)} KB`,
              }).catch(() => {});
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('[serverbackup-scheduler] tick:', err);
    }
  };

  // Premier check après 60s pour laisser le bot se stabiliser, puis toutes les heures
  setTimeout(tick, 60 * 1000);
  setInterval(tick, 60 * 60 * 1000);
}

module.exports = {
  startServerbackupScheduler,
  createBackup,
  serializeGuild,
};
