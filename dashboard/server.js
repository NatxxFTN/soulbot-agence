'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const session  = require('express-session');
const cors     = require('cors');
const path     = require('path');
const { db }   = require('../bot/database');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const PORT     = process.env.DASHBOARD_PORT || process.env.PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET || 'soulbot-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 3600 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
}));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  // API calls get 401
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Non authentifié' });
  res.redirect('/login.html');
}

// ── Password auth ─────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    req.session.authenticated = true;
    req.session.authMethod    = 'password';
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
  res.json({
    authenticated: !!req.session.authenticated,
    userId: req.session.userId || null,
    userName: req.session.userName || null,
  });
});

// ── Discord OAuth2 (activé seulement si CLIENT_ID configuré) ─────────────────
const DISCORD_CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DASHBOARD_URL         = process.env.DASHBOARD_URL || `http://localhost:${PORT}`;
const REDIRECT_URI          = `${DASHBOARD_URL}/auth/callback`;

if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
  app.get('/auth/discord', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?` +
      `client_id=${DISCORD_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code&scope=identify`;
    res.redirect(url);
  });

  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/login.html?error=nocode');

    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method : 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body   : new URLSearchParams({
          client_id    : DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type   : 'authorization_code',
          code,
          redirect_uri : REDIRECT_URI,
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) return res.redirect('/login.html?error=token');

      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userRes.json();

      const OWNER_IDS = (process.env.BOT_OWNERS || process.env.OWNER_IDS || '').split(',').map(s => s.trim());
      if (!OWNER_IDS.includes(user.id)) {
        return res.status(403).send('Accès refusé : Owner bot uniquement.');
      }

      req.session.authenticated = true;
      req.session.authMethod    = 'oauth2';
      req.session.userId        = user.id;
      req.session.userName      = user.username;
      req.session.avatar        = user.avatar;
      res.redirect('/');
    } catch (err) {
      console.error('[OAuth2]', err.message);
      res.redirect('/login.html?error=1');
    }
  });
}

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// ── API existantes (guilds, mod-logs, warnings, command-logs) ─────────────────
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    // Stats legacy (tables anciennes) + bot_logs
    const guilds       = tryGet('SELECT COUNT(*) as c FROM guild_settings', 0, 'c');
    const warns        = tryGet('SELECT COUNT(*) as c FROM warnings', 0, 'c');
    const modActions   = tryGet('SELECT COUNT(*) as c FROM mod_logs', 0, 'c');
    const totalCmds    = tryGet("SELECT COUNT(*) as c FROM bot_logs WHERE category='command'", 0, 'c');
    const totalErrors  = tryGet("SELECT COUNT(*) as c FROM bot_logs WHERE level='error'", 0, 'c');
    const last24h      = tryGet(
      'SELECT COUNT(*) as c FROM bot_logs WHERE timestamp > ' + (Date.now() - 86400000), 0, 'c'
    );

    const commandStats = tryAll(`
      SELECT command_name as command, COUNT(*) as count FROM bot_logs
      WHERE category='command' GROUP BY command_name ORDER BY count DESC LIMIT 8
    `);

    const recentCommands = tryAll(
      'SELECT * FROM bot_logs WHERE category=\'command\' ORDER BY timestamp DESC LIMIT 10'
    );
    const recentMod = tryAll(
      'SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT 10'
    );

    res.json({
      guilds, warnings: warns, commands: totalCmds, modActions,
      totalErrors, last24h,
      recentCommands, recentMod, commandStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/guilds', requireAuth, (req, res) => {
  res.json(tryAll('SELECT * FROM guild_settings ORDER BY guild_id'));
});

app.patch('/api/guilds/:id', requireAuth, (req, res) => {
  const { prefix } = req.body;
  try {
    db.prepare('UPDATE guild_settings SET prefix=? WHERE guild_id=?').run(prefix, req.params.id);
    res.json({ success: true });
    io.emit('guild-updated', req.params.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mod-logs', requireAuth, (req, res) => {
  const { guild_id, limit = 50, offset = 0 } = req.query;
  const logs = guild_id
    ? tryAll('SELECT * FROM mod_logs WHERE guild_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?', guild_id, Number(limit), Number(offset))
    : tryAll('SELECT * FROM mod_logs ORDER BY created_at DESC LIMIT ? OFFSET ?', Number(limit), Number(offset));
  const total = tryGet(guild_id ? 'SELECT COUNT(*) as c FROM mod_logs WHERE guild_id=?' : 'SELECT COUNT(*) as c FROM mod_logs', guild_id ? guild_id : undefined, 'c');
  res.json({ logs, total });
});

app.get('/api/warnings', requireAuth, (req, res) => {
  const { guild_id, user_id, limit = 50, offset = 0 } = req.query;
  let q = 'SELECT * FROM warnings WHERE 1=1';
  const p = [];
  if (guild_id) { q += ' AND guild_id=?'; p.push(guild_id); }
  if (user_id)  { q += ' AND user_id=?';  p.push(user_id); }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  p.push(Number(limit), Number(offset));
  res.json(tryAll(q, ...p));
});

// ── API bot_logs (nouvelles) ──────────────────────────────────────────────────
app.get('/api/logs/recent', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json(tryAll('SELECT * FROM bot_logs ORDER BY timestamp DESC LIMIT ?', limit));
});

app.get('/api/logs/since/:ts', requireAuth, (req, res) => {
  const ts = parseInt(req.params.ts) || 0;
  res.json(tryAll('SELECT * FROM bot_logs WHERE timestamp > ? ORDER BY timestamp ASC', ts));
});

app.get('/api/logs/stats', requireAuth, (req, res) => {
  const totalCommands = tryGet("SELECT COUNT(*) as c FROM bot_logs WHERE category='command'", undefined, 'c');
  const totalErrors   = tryGet("SELECT COUNT(*) as c FROM bot_logs WHERE level='error'", undefined, 'c');
  const last24h       = tryGet('SELECT COUNT(*) as c FROM bot_logs WHERE timestamp > ?', Date.now() - 86400000, 'c');
  const uniqueGuilds  = tryGet('SELECT COUNT(DISTINCT guild_id) as c FROM bot_logs WHERE guild_id IS NOT NULL', undefined, 'c');
  res.json({ totalCommands, totalErrors, last24h, uniqueGuilds });
});

// ── Socket.io — polling DB → push live logs aux clients browser ───────────────
let lastLogId = (() => {
  try { return (db.prepare('SELECT MAX(id) as m FROM bot_logs').get()?.m) || 0; } catch { return 0; }
})();

setInterval(() => {
  if (!io.sockets.sockets.size) return;
  try {
    const newLogs = db.prepare(
      'SELECT * FROM bot_logs WHERE id > ? ORDER BY id ASC LIMIT 50'
    ).all(lastLogId);
    if (!newLogs.length) return;
    lastLogId = newLogs[newLogs.length - 1].id;
    newLogs.forEach(log => io.emit('log:new', log));
  } catch { /* DB peut ne pas être prête */ }
}, 2000);

io.on('connection', socket => {
  console.log(`[Dashboard] Client connecté : ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Dashboard] Client déconnecté : ${socket.id}`));
  socket.on('subscribe-guild', guildId => socket.join(guildId));
});

// ── Fallback SPA ──────────────────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/logs', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// ── Helpers DB safe ───────────────────────────────────────────────────────────
function tryAll(sql, ...params) {
  try { return db.prepare(sql).all(...params); } catch { return []; }
}
function tryGet(sql, param, field) {
  try {
    const row = param !== undefined ? db.prepare(sql).get(param) : db.prepare(sql).get();
    return row?.[field] ?? 0;
  } catch { return 0; }
}

server.listen(PORT, () => {
  console.log(`[Dashboard] http://localhost:${PORT}`);
  if (DISCORD_CLIENT_ID) console.log(`[Dashboard] OAuth2 activé — /auth/discord`);
  else console.log(`[Dashboard] OAuth2 désactivé — définir DISCORD_CLIENT_ID dans .env`);
});

module.exports = { io };
