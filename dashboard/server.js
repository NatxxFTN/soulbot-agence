require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { getDB } = require('../bot/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET || 'discord-manager-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Non authentifié' });
};

// ===== AUTH ROUTES =====
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// ===== DASHBOARD API =====

// Overview stats
app.get('/api/stats', requireAuth, (req, res) => {
  const db = getDB();
  try {
    const guilds = db.prepare('SELECT COUNT(*) as count FROM guilds').get();
    const warns = db.prepare('SELECT COUNT(*) as count FROM warnings').get();
    const commands = db.prepare('SELECT COUNT(*) as count FROM command_logs').get();
    const modlogs = db.prepare('SELECT COUNT(*) as count FROM mod_logs').get();

    const recentCommands = db.prepare('SELECT * FROM command_logs ORDER BY created_at DESC LIMIT 10').all();
    const recentMod = db.prepare('SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT 10').all();

    const commandStats = db.prepare(`
      SELECT command, COUNT(*) as count FROM command_logs 
      GROUP BY command ORDER BY count DESC LIMIT 8
    `).all();

    res.json({
      guilds: guilds.count,
      warnings: warns.count,
      commands: commands.count,
      modActions: modlogs.count,
      recentCommands,
      recentMod,
      commandStats
    });
  } catch (err) {
    res.json({ guilds: 0, warnings: 0, commands: 0, modActions: 0, recentCommands: [], recentMod: [], commandStats: [] });
  }
});

// Guilds
app.get('/api/guilds', requireAuth, (req, res) => {
  const db = getDB();
  const guilds = db.prepare('SELECT * FROM guilds ORDER BY name').all();
  res.json(guilds);
});

app.get('/api/guilds/:id', requireAuth, (req, res) => {
  const db = getDB();
  const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(req.params.id);
  if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
  res.json(guild);
});

app.patch('/api/guilds/:id', requireAuth, (req, res) => {
  const db = getDB();
  const { prefix, welcome_channel, welcome_message, log_channel, auto_role, anti_spam, anti_links, anti_caps } = req.body;
  try {
    db.prepare(`UPDATE guilds SET prefix=?, welcome_channel=?, welcome_message=?, log_channel=?, auto_role=?, anti_spam=?, anti_links=?, anti_caps=? WHERE id=?`)
      .run(prefix, welcome_channel, welcome_message, log_channel, auto_role, anti_spam ? 1 : 0, anti_links ? 1 : 0, anti_caps ? 1 : 0, req.params.id);
    res.json({ success: true });
    io.emit('guild-updated', req.params.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderation logs
app.get('/api/mod-logs', requireAuth, (req, res) => {
  const db = getDB();
  const { guild_id, action, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM mod_logs WHERE 1=1';
  const params = [];
  if (guild_id) { query += ' AND guild_id = ?'; params.push(guild_id); }
  if (action) { query += ' AND action = ?'; params.push(action); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const logs = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM mod_logs' + (guild_id ? ' WHERE guild_id = ?' : '')).get(guild_id ? guild_id : undefined);
  res.json({ logs, total: total.count });
});

// Warnings
app.get('/api/warnings', requireAuth, (req, res) => {
  const db = getDB();
  const { guild_id, user_id, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM warnings WHERE 1=1';
  const params = [];
  if (guild_id) { query += ' AND guild_id = ?'; params.push(guild_id); }
  if (user_id) { query += ' AND user_id = ?'; params.push(user_id); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const warnings = db.prepare(query).all(...params);
  res.json(warnings);
});

app.delete('/api/warnings/:id', requireAuth, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM warnings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Command logs
app.get('/api/command-logs', requireAuth, (req, res) => {
  const db = getDB();
  const { guild_id, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM command_logs WHERE 1=1';
  const params = [];
  if (guild_id) { query += ' AND guild_id = ?'; params.push(guild_id); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// Custom commands
app.get('/api/custom-commands', requireAuth, (req, res) => {
  const db = getDB();
  const { guild_id } = req.query;
  const cmds = guild_id
    ? db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(guild_id)
    : db.prepare('SELECT * FROM custom_commands').all();
  res.json(cmds);
});

app.post('/api/custom-commands', requireAuth, (req, res) => {
  const db = getDB();
  const { guild_id, trigger, response } = req.body;
  if (!guild_id || !trigger || !response) return res.status(400).json({ error: 'Champs manquants' });
  try {
    db.prepare('INSERT OR REPLACE INTO custom_commands (guild_id, trigger, response) VALUES (?, ?, ?)').run(guild_id, trigger.toLowerCase(), response);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/custom-commands/:id', requireAuth, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM custom_commands WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Demo data seeder
app.post('/api/seed-demo', requireAuth, (req, res) => {
  const db = getDB();
  try {
    db.prepare("INSERT OR IGNORE INTO guilds (id, name, icon, prefix) VALUES ('123456789', 'Mon Super Serveur', null, '!')").run();
    db.prepare("INSERT OR IGNORE INTO guilds (id, name, icon, prefix) VALUES ('987654321', 'Gaming Zone', null, '?')").run();

    const actions = ['BAN', 'KICK', 'WARN', 'MUTE', 'CLEAR'];
    const users = [['111', 'Alpha#0001'], ['222', 'Beta#0002'], ['333', 'Gamma#0003']];
    const mods = [['444', 'ModA#0001'], ['555', 'ModB#0002']];

    for (let i = 0; i < 20; i++) {
      const u = users[i % users.length];
      const m = mods[i % mods.length];
      db.prepare("INSERT INTO mod_logs (guild_id, action, user_id, user_tag, moderator_id, moderator_tag, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run('123456789', actions[i % actions.length], u[0], u[1], m[0], m[1], 'Demo raison #' + i, Math.floor(Date.now()/1000) - i * 3600);
    }

    const cmds = ['ban', 'kick', 'help', 'ping', 'warn', 'userinfo', '8ball', 'clear'];
    for (let i = 0; i < 30; i++) {
      const u = users[i % users.length];
      db.prepare("INSERT INTO command_logs (guild_id, user_id, user_tag, command, created_at) VALUES (?, ?, ?, ?, ?)")
        .run('123456789', u[0], u[1], cmds[i % cmds.length], Math.floor(Date.now()/1000) - i * 1200);
    }

    for (let i = 0; i < 10; i++) {
      const u = users[i % users.length];
      const m = mods[i % mods.length];
      db.prepare("INSERT INTO warnings (guild_id, user_id, user_tag, moderator_id, moderator_tag, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run('123456789', u[0], u[1], m[0], m[1], 'Comportement inapproprié #' + i, Math.floor(Date.now()/1000) - i * 7200);
    }

    res.json({ success: true, message: 'Données de démonstration créées!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io for real-time
io.on('connection', (socket) => {
  socket.on('subscribe-guild', (guildId) => socket.join(guildId));
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`\x1b[32m[Dashboard] Running at http://localhost:${PORT}\x1b[0m`);
  if (process.send) process.send(`Dashboard ready at http://localhost:${PORT}`);
});

module.exports = { io };
