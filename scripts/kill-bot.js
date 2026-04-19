'use strict';

/**
 * Tue toutes les instances node du bot avant démarrage.
 * Empêche l'accumulation de processus fantômes qui causent les doublons de réponse.
 * Exécuté automatiquement via npm hooks prestart / predev:bot.
 */

const { execSync } = require('child_process');
const os           = require('os');

const currentPid = process.pid;
const isWindows  = os.platform() === 'win32';

try {
  if (isWindows) {
    const output = execSync(
      'tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const pids = output
      .split('\n')
      .map(line => { const m = line.match(/"node\.exe","(\d+)"/); return m ? parseInt(m[1]) : null; })
      .filter(pid => pid && pid !== currentPid);

    if (pids.length > 0) {
      console.log(`🔪 Kill ${pids.length} instance(s) node fantôme(s)...`);
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
          console.log(`   ✅ PID ${pid} terminé`);
        } catch { /* déjà mort */ }
      }
      // Attendre 800ms que Discord libère les connexions WebSocket
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 800);
    } else {
      console.log('✅ Aucun processus node fantôme');
    }
  } else {
    // Linux / Mac
    try {
      execSync(`pkill -f "node.*bot/index\\.js" 2>/dev/null || true`, { shell: true });
      console.log('🔪 Instances bot tuées (Unix)');
      execSync('sleep 0.8', { shell: true });
    } catch {
      console.log('✅ Aucune instance bot à tuer');
    }
  }
} catch (err) {
  // Non-bloquant : si le kill échoue, on démarre quand même
  console.log('⚠️  Kill script non-bloquant:', err.message);
}
