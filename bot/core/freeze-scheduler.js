'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// FREEZE SCHEDULER — auto-unfreeze à l'expiration
// ═══════════════════════════════════════════════════════════════════════════

const storage = require('./freeze-storage');
const { PermissionsBitField } = require('discord.js');

async function restoreGuild(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) { storage.clearFreeze(guildId); return; }

  const snaps = storage.getSnapshots(guildId);
  const everyoneId = guild.roles.everyone.id;

  for (const snap of snaps) {
    const ch = await guild.channels.fetch(snap.channel_id).catch(() => null);
    if (!ch || !ch.permissionOverwrites) continue;
    try {
      if (snap.had_override) {
        await ch.permissionOverwrites.edit(everyoneId, {
          SendMessages: snap.allow && BigInt(snap.allow) & PermissionsBitField.Flags.SendMessages ? true
            : snap.deny && BigInt(snap.deny) & PermissionsBitField.Flags.SendMessages ? false
            : null,
        }, { reason: '[freeze] restauration automatique' }).catch(() => {});
      } else {
        // Pas d'override auparavant → on retire SendMessages de l'override
        await ch.permissionOverwrites.edit(everyoneId, { SendMessages: null },
          { reason: '[freeze] restauration automatique' }).catch(() => {});
      }
    } catch { /* ignore un salon */ }
  }

  storage.clearFreeze(guildId);
}

async function tick(client) {
  const expired = storage.getExpiredFreezes();
  for (const f of expired) {
    await restoreGuild(client, f.guild_id).catch(() => {});
  }
}

function startFreezeScheduler(client) {
  console.log('[freeze-scheduler] Démarré (tick 60s)');
  setInterval(() => { tick(client).catch(() => {}); }, 60_000);
  setTimeout(() => { tick(client).catch(() => {}); }, 15_000);
}

module.exports = { startFreezeScheduler, restoreGuild };
