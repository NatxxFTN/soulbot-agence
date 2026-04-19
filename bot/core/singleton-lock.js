'use strict';

/**
 * Garantit qu'une seule instance du bot tourne à la fois.
 * Crée .bot.lock à la racine avec le PID courant.
 * Refuse de démarrer si un processus actif détecté.
 * Nettoie le lock proprement à chaque shutdown (exit/signal).
 */

const fs   = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, '../../.bot.lock');

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    let oldPid;
    try { oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10); } catch { oldPid = 0; }

    if (oldPid && oldPid !== process.pid) {
      let alive = false;
      try { process.kill(oldPid, 0); alive = true; } catch { /* processus mort */ }

      if (alive) {
        console.error(`\n❌ CONFLIT SINGLETON : une instance du bot est déjà active (PID ${oldPid}).`);
        console.error('   Pour la tuer :');
        console.error(`     Windows : taskkill /F /PID ${oldPid}`);
        console.error(`     Unix    : kill ${oldPid}`);
        console.error('   Ou utilise : npm run dev:bot (kill automatique)\n');
        process.exit(1);
      }

      // Lock obsolète (processus mort) → on nettoie silencieusement
      try { fs.unlinkSync(LOCK_FILE); } catch { /* ignoré */ }
      console.log(`   🧹 Lock obsolète supprimé (ancien PID ${oldPid})`);
    }
  }

  // Écrire le lock avec le PID courant
  fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf-8');

  // Nettoyage automatique à la fermeture (dans tous les cas)
  const releaseLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch { /* ignoré */ } };
  process.on('exit',    releaseLock);
  process.on('SIGINT',  releaseLock);
  process.on('SIGTERM', releaseLock);
  process.on('SIGHUP',  releaseLock);
}

module.exports = { acquireLock };
