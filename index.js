require('dotenv').config();
const { fork } = require('child_process');
const path = require('path');

console.log('\x1b[35m');
console.log('╔══════════════════════════════════════╗');
console.log('║      DISCORD MANAGER  v1.0.0         ║');
console.log('║   Bot + Dashboard starting up...     ║');
console.log('╚══════════════════════════════════════╝');
console.log('\x1b[0m');

// Start Dashboard
const dashboard = fork(path.join(__dirname, 'dashboard/server.js'));
dashboard.on('message', (msg) => console.log('[Dashboard]', msg));
dashboard.on('error', (err) => console.error('[Dashboard Error]', err));

// Start Bot (only if token exists)
if (process.env.DISCORD_TOKEN) {
  const bot = fork(path.join(__dirname, 'bot/index.js'));
  bot.on('message', (msg) => console.log('[Bot]', msg));
  bot.on('error', (err) => console.error('[Bot Error]', err));
} else {
  console.log('\x1b[33m[⚠] No DISCORD_TOKEN found. Bot not started. Dashboard only mode.\x1b[0m');
  console.log('\x1b[33m[⚠] Add your token to .env to enable the bot.\x1b[0m\n');
}

console.log('\x1b[32m[✓] Dashboard available at: http://localhost:3000\x1b[0m\n');
