'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// 3-PACKS HANDLERS — boutons & listeners pour les commandes Engagement
//   • pollv2:vote:<index>  → vote sondage
//   • gwv2:join            → join giveaway v2
//   • suggv2:up | down     → vote suggestion v2
//   • messageReactionAdd/Remove → reactionrole
//   • guildMemberAdd → autorole + welcome (en + des listeners existants)
//   • guildMemberRemove → goodbye
// ═══════════════════════════════════════════════════════════════════════════

const { MessageFlags } = require('discord.js');
const { db } = require('../database');

// ─── Poll vote handler ──────────────────────────────────────────────────────

const STMT_POLL_BY_MSG = db.prepare('SELECT * FROM polls WHERE message_id = ? AND active = 1');
const STMT_POLL_VOTE = db.prepare(`
  INSERT INTO poll_votes (poll_id, user_id, option_index)
  VALUES (?, ?, ?)
  ON CONFLICT(poll_id, user_id) DO UPDATE SET option_index = excluded.option_index
`);
const STMT_POLL_COUNTS = db.prepare('SELECT option_index, COUNT(*) AS n FROM poll_votes WHERE poll_id = ? GROUP BY option_index');

async function handlePollVote(interaction, params) {
  try {
    const optionIndex = parseInt(params[1], 10);
    const poll = STMT_POLL_BY_MSG.get(interaction.message.id);
    if (!poll) {
      return interaction.reply({ content: '✗ Sondage fermé ou introuvable.', flags: MessageFlags.Ephemeral });
    }
    STMT_POLL_VOTE.run(poll.id, interaction.user.id, optionIndex);

    const votes = STMT_POLL_COUNTS.all(poll.id);
    const total = votes.reduce((s, v) => s + v.n, 0);
    const opts = JSON.parse(poll.options);
    const lines = opts.map((o, i) => {
      const v = votes.find(x => x.option_index === i)?.n || 0;
      const pct = total > 0 ? Math.round((v / total) * 100) : 0;
      return `${o.emoji} **${o.label}** — ${v} (${pct}%)`;
    });

    const embed = {
      title: `📊 ${poll.question}`,
      description: `${lines.join('\n')}\n\n_Total : ${total} vote(s)_`,
      color: 0xFF0000,
      footer: { text: `Lancé par ${poll.creator_id}` },
    };

    await interaction.message.edit({ embeds: [embed] }).catch(() => {});
    return interaction.reply({ content: `✓ Vote enregistré : ${opts[optionIndex].label}`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[pollv2 handler]', err);
    return interaction.reply({ content: '✗ Erreur vote.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

// ─── Giveaway v2 join handler ───────────────────────────────────────────────

const STMT_GW_BY_MSG = db.prepare('SELECT * FROM giveaways WHERE message_id = ? AND ended = 0');
const STMT_GW_JOIN = db.prepare('INSERT OR IGNORE INTO giveaway_participants (giveaway_id, user_id) VALUES (?, ?)');
const STMT_GW_COUNT = db.prepare('SELECT COUNT(*) AS n FROM giveaway_participants WHERE giveaway_id = ?');

async function handleGwJoin(interaction) {
  try {
    const gw = STMT_GW_BY_MSG.get(interaction.message.id);
    if (!gw) {
      return interaction.reply({ content: '✗ Giveaway terminé ou introuvable.', flags: MessageFlags.Ephemeral });
    }
    const res = STMT_GW_JOIN.run(gw.id, interaction.user.id);
    const { n } = STMT_GW_COUNT.get(gw.id);
    const msg = res.changes > 0 ? `✓ Tu participes ! (${n} participants)` : `ℹ️ Tu participes déjà (${n} participants).`;
    return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[gwv2 handler]', err);
    return interaction.reply({ content: '✗ Erreur.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

// ─── Suggestion v2 vote handler ─────────────────────────────────────────────

const STMT_SUGG_BY_MSG = db.prepare('SELECT * FROM suggestionv2 WHERE message_id = ?');
const STMT_SUGG_VOTE = db.prepare(`
  INSERT INTO suggestionv2_votes (suggestion_id, user_id, vote)
  VALUES (?, ?, ?)
  ON CONFLICT(suggestion_id, user_id) DO UPDATE SET vote = excluded.vote
`);
const STMT_SUGG_COUNTS = db.prepare(`
  SELECT
    SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS up,
    SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down
  FROM suggestionv2_votes WHERE suggestion_id = ?
`);

async function handleSuggVote(interaction, params) {
  try {
    const dir = params[0]; // 'up' | 'down'
    const sugg = STMT_SUGG_BY_MSG.get(interaction.message.id);
    if (!sugg) {
      return interaction.reply({ content: '✗ Suggestion introuvable.', flags: MessageFlags.Ephemeral });
    }
    STMT_SUGG_VOTE.run(sugg.id, interaction.user.id, dir === 'up' ? 1 : -1);
    const counts = STMT_SUGG_COUNTS.get(sugg.id);
    const up = counts?.up || 0;
    const down = counts?.down || 0;

    const components = interaction.message.components.map(row => ({
      type: row.type,
      components: row.components.map(b => ({
        type: b.type,
        custom_id: b.customId,
        style: b.style,
        label: b.customId === 'suggv2:up' ? `👍 Pour (${up})` : b.customId === 'suggv2:down' ? `👎 Contre (${down})` : b.label,
      })),
    }));

    await interaction.message.edit({ components }).catch(() => {});
    return interaction.reply({ content: `✓ Vote ${dir === 'up' ? '👍' : '👎'} enregistré.`, flags: MessageFlags.Ephemeral });
  } catch (err) {
    console.error('[suggv2 handler]', err);
    return interaction.reply({ content: '✗ Erreur.', flags: MessageFlags.Ephemeral }).catch(() => {});
  }
}

// ─── Reaction role listeners ────────────────────────────────────────────────

const STMT_RR_LIST = db.prepare('SELECT role_id FROM guild_reaction_roles WHERE message_id = ? AND emoji = ?');

async function handleReactionAdd(reaction, user, action) {
  if (user.bot) return;
  if (!reaction.message.guild) return;
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
  const rows = STMT_RR_LIST.all(reaction.message.id, emoji);
  if (!rows.length) return;
  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  for (const row of rows) {
    try {
      if (action === 'add') await member.roles.add(row.role_id, '[reactionrole]');
      else await member.roles.remove(row.role_id, '[reactionrole]');
    } catch { /* ignore */ }
  }
}

// ─── Autorole + welcome on guildMemberAdd ───────────────────────────────────

const STMT_AUTOROLES = db.prepare('SELECT role_id FROM guild_autoroles WHERE guild_id = ?');
const STMT_GREETING = db.prepare('SELECT * FROM greeting_config WHERE guild_id = ?');

async function handleMemberAdd(member) {
  if (member.user.bot) return;

  // Autorole
  const roles = STMT_AUTOROLES.all(member.guild.id);
  for (const r of roles) {
    try { await member.roles.add(r.role_id, '[autorole]'); } catch { /* ignore */ }
  }

  // Welcome (si pas déjà géré par les listeners existants)
  const cfg = STMT_GREETING.get(member.guild.id);
  if (cfg?.join_enabled && cfg.join_channel_id && cfg.join_message) {
    const channel = member.guild.channels.cache.get(cfg.join_channel_id);
    if (channel?.isTextBased?.()) {
      const txt = cfg.join_message
        .replace(/\{user\}/g, `<@${member.id}>`)
        .replace(/\{username\}/g, member.user.username)
        .replace(/\{server\}/g, member.guild.name)
        .replace(/\{membercount\}/g, String(member.guild.memberCount));
      channel.send({ content: txt }).catch(() => {});
    }
  }
}

async function handleMemberRemove(member) {
  if (member.user?.bot) return;
  const cfg = STMT_GREETING.get(member.guild.id);
  if (cfg?.leave_enabled && cfg.leave_channel_id && cfg.leave_message) {
    const channel = member.guild.channels.cache.get(cfg.leave_channel_id);
    if (channel?.isTextBased?.()) {
      const txt = cfg.leave_message
        .replace(/\{user\}/g, `<@${member.id}>`)
        .replace(/\{username\}/g, member.user?.username || 'Inconnu')
        .replace(/\{server\}/g, member.guild.name)
        .replace(/\{membercount\}/g, String(member.guild.memberCount));
      channel.send({ content: txt }).catch(() => {});
    }
  }
}

// ─── Antiraid joins detector ────────────────────────────────────────────────

const STMT_ANTIRAID_CFG = db.prepare('SELECT * FROM raidmode_config WHERE guild_id = ? AND active = 1');
const STMT_AR_INSERT = db.prepare('INSERT OR REPLACE INTO antiraid_recent_joins (guild_id, user_id, joined_at) VALUES (?, ?, ?)');
const STMT_AR_RECENT = db.prepare('SELECT COUNT(*) AS n FROM antiraid_recent_joins WHERE guild_id = ? AND joined_at >= ?');
const STMT_AR_CLEANUP = db.prepare('DELETE FROM antiraid_recent_joins WHERE joined_at < ?');

async function handleAntiraid(member) {
  if (member.user.bot) return;
  const cfg = STMT_ANTIRAID_CFG.get(member.guild.id);
  if (!cfg) return;

  const now = Math.floor(Date.now() / 1000);
  const window = cfg.detection_window_sec || 30;
  STMT_AR_INSERT.run(member.guild.id, member.id, now);

  const since = now - window;
  const { n } = STMT_AR_RECENT.get(member.guild.id, since);
  const threshold = cfg.detection_threshold || 10;

  if (n >= threshold) {
    try {
      if (cfg.action === 'ban') await member.ban({ reason: '[antiraid] Detection threshold' });
      else await member.kick('[antiraid] Detection threshold');
    } catch { /* perms */ }
  }

  // Cleanup
  if (Math.random() < 0.1) STMT_AR_CLEANUP.run(now - 600);
}

// ─── XP gain on message ─────────────────────────────────────────────────────

const STMT_XP_GET = db.prepare('SELECT xp, level, last_msg FROM guild_xp WHERE guild_id = ? AND user_id = ?');
const STMT_XP_UPSERT = db.prepare(`
  INSERT INTO guild_xp (guild_id, user_id, xp, level, last_msg)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = excluded.xp, level = excluded.level, last_msg = excluded.last_msg
`);

const XP_COOLDOWN_SEC = 60;

function levelFromXp(xp) {
  return Math.max(0, Math.floor(Math.sqrt(xp / 100)));
}

async function handleXpGain(message) {
  if (!message.guild || message.author.bot) return;
  const now = Math.floor(Date.now() / 1000);
  const row = STMT_XP_GET.get(message.guild.id, message.author.id) || { xp: 0, level: 0, last_msg: 0 };
  if (now - row.last_msg < XP_COOLDOWN_SEC) return;

  const gain = 5 + Math.floor(Math.random() * 11); // 5-15
  const newXp = row.xp + gain;
  const newLevel = levelFromXp(newXp);
  STMT_XP_UPSERT.run(message.guild.id, message.author.id, newXp, newLevel, now);
}

// ─── Register ───────────────────────────────────────────────────────────────

function register(client) {
  // Boutons
  client.buttonHandlers.set('pollv2', handlePollVote);
  client.buttonHandlers.set('gwv2', handleGwJoin);
  client.buttonHandlers.set('suggv2', handleSuggVote);

  // Listeners
  client.on('messageReactionAdd', (r, u) => handleReactionAdd(r, u, 'add').catch(() => {}));
  client.on('messageReactionRemove', (r, u) => handleReactionAdd(r, u, 'remove').catch(() => {}));
  client.on('guildMemberAdd', (m) => {
    handleMemberAdd(m).catch(() => {});
    handleAntiraid(m).catch(() => {});
  });
  client.on('guildMemberRemove', (m) => handleMemberRemove(m).catch(() => {}));
  client.on('messageCreate', (m) => handleXpGain(m).catch(() => {}));

  console.log('[3packs] handlers registered (poll/gw/sugg + reaction roles + autorole + antiraid + xp)');
}

module.exports = { register };
