'use strict';

// ── Reserved Command Names — protège contre écrasement de cmds natives ────────

const EXTRA_RESERVED = new Set([
  'help', 'aide', 'h', 'ping', 'stats', 'admin', 'bot', 'soulbot',
  'everyone', 'here', 'owner', 'buyer', 'ban', 'kick',
]);

function getReservedNames(client) {
  const reserved = new Set();
  client.commands?.forEach((cmd, name) => {
    reserved.add(name.toLowerCase());
    if (Array.isArray(cmd.aliases)) {
      for (const a of cmd.aliases) reserved.add(String(a).toLowerCase());
    }
  });
  for (const n of EXTRA_RESERVED) reserved.add(n);
  return reserved;
}

function isReservedName(client, name) {
  return getReservedNames(client).has(String(name).toLowerCase());
}

module.exports = { getReservedNames, isReservedName, EXTRA_RESERVED };
