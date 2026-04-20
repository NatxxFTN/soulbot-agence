'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCK_FILE = path.join(__dirname, '../../.bot.lock');

function isPidAlive(pid) {
  if (process.platform === 'win32') {
    // Sur Windows, process.kill(pid, 0) retourne EPERM même pour les PID morts
    // appartenant à un ancien process → faux positif. On utilise tasklist à la place.
    try {
      const out = execSync(
        `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 2000 }
      );
      return out.includes(`"${pid}"`);
    } catch {
      return false;
    }
  }
  // Unix : signal 0 = sonde sans kill
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code === 'EPERM'; }
}

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    let oldPid = 0;
    try { oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10); } catch { /* ignoré */ }

    if (oldPid && oldPid !== process.pid) {
      if (isPidAlive(oldPid)) {
        console.error(`\n❌ CONFLIT SINGLETON : une instance du bot est déjà active (PID ${oldPid}).`);
        console.error('   Pour la tuer :');
        console.error(`     Windows : taskkill /F /PID ${oldPid}`);
        console.error(`     Unix    : kill ${oldPid}`);
        console.error('   Ou utilise : npm run dev:bot (kill automatique)\n');
        process.exit(1);
      }
      // Process mort → lock obsolète, on nettoie
      try { fs.unlinkSync(LOCK_FILE); } catch { /* ignoré */ }
      console.log(`   🧹 Lock obsolète supprimé (ancien PID ${oldPid})`);
    }
  }

  fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf-8');

  const releaseLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch { /* ignoré */ } };
  process.on('exit',    releaseLock);
  process.on('SIGINT',  releaseLock);
  process.on('SIGTERM', releaseLock);
  process.on('SIGHUP',  releaseLock);
}

module.exports = { acquireLock };
