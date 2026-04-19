'use strict';

const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { db } = require('../database');

const STMT_GET_CONFIG  = db.prepare('SELECT * FROM ticket_config WHERE guild_id = ?');
const STMT_GET_TICKET  = db.prepare('SELECT * FROM tickets WHERE channel_id = ?');
const STMT_GET_BY_ID   = db.prepare('SELECT * FROM tickets WHERE id = ?');
const STMT_OPEN_LIST   = db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = 'open'");
const STMT_CLOSED_LIST = db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = 'closed'");

function getConfig(guildId) {
  return STMT_GET_CONFIG.get(guildId);
}

function setConfig(guildId, data) {
  const existing = getConfig(guildId);
  if (existing) {
    const sets   = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), guildId];
    db.prepare(`UPDATE ticket_config SET ${sets} WHERE guild_id = ?`).run(...values);
  } else {
    const keys   = ['guild_id', ...Object.keys(data)];
    const phs    = keys.map(() => '?').join(', ');
    const values = [guildId, ...Object.values(data)];
    db.prepare(`INSERT INTO ticket_config (${keys.join(', ')}) VALUES (${phs})`).run(...values);
  }
}

async function createTicket(guild, user, reason = null) {
  const config = getConfig(guild.id);
  if (!config?.category_id) throw new Error('Ticket non configuré. Utilise `;ticket` ou `;quickticket`.');

  const nextNumber = (config.ticket_counter || 0) + 1;
  db.prepare('UPDATE ticket_config SET ticket_counter = ? WHERE guild_id = ?').run(nextNumber, guild.id);

  const overrides = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  if (config.staff_role_id) {
    overrides.push({ id: config.staff_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const channel = await guild.channels.create({
    name  : `ticket-${String(nextNumber).padStart(4, '0')}`,
    type  : ChannelType.GuildText,
    parent: config.category_id,
    permissionOverwrites: overrides,
  });

  const result = db.prepare(
    "INSERT INTO tickets (guild_id, user_id, channel_id, ticket_number, status) VALUES (?, ?, ?, ?, 'open')"
  ).run(guild.id, user.id, channel.id, nextNumber);

  return { channel, ticketId: result.lastInsertRowid, number: nextNumber };
}

function getTicketByChannel(channelId) {
  return STMT_GET_TICKET.get(channelId);
}

function getOpenTickets(guildId) {
  return STMT_OPEN_LIST.all(guildId);
}

function getClosedTickets(guildId) {
  return STMT_CLOSED_LIST.all(guildId);
}

function closeTicket(ticketId, closedBy) {
  db.prepare("UPDATE tickets SET status = 'closed', closed_at = unixepoch(), closed_by = ? WHERE id = ?").run(closedBy, ticketId);
}

function reopenTicket(ticketId) {
  db.prepare("UPDATE tickets SET status = 'open', closed_at = NULL, closed_by = NULL WHERE id = ?").run(ticketId);
}

function markDeleted(ticketId) {
  db.prepare("UPDATE tickets SET status = 'deleted', deleted_at = unixepoch() WHERE id = ?").run(ticketId);
}

function claimTicket(ticketId, userId) {
  db.prepare('UPDATE tickets SET claimed_by = ? WHERE id = ?').run(userId, ticketId);
}

function renameTicket(ticketId, name) {
  // noop DB — seul Discord est source de vérité pour le nom du salon
  void ticketId; void name;
}

async function logAction(guild, config, content) {
  if (!config?.log_channel_id) return;
  const ch = guild.channels.cache.get(config.log_channel_id);
  if (ch) await ch.send(content).catch(() => {});
}

module.exports = {
  getConfig, setConfig,
  createTicket, getTicketByChannel,
  getOpenTickets, getClosedTickets,
  closeTicket, reopenTicket, markDeleted,
  claimTicket, renameTicket,
  logAction,
};
