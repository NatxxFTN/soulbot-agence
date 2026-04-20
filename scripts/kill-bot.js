'use strict';

/**
 * Tue uniquement les instances node qui font tourner bot/index.js.
 * Ne touche PAS aux autres processus node (Claude Code, dashboard, etc.)
 */

const { execSync } = require('child_process');
const os = require('os');
const currentPid = process.pid;

try {
  if (os.platform() === 'win32') {
    // wmic permet de filtrer par CommandLine — on cible bot/index.js uniquement
    const out = execSync(
      'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }
    );

    const botPids = [];
    for (const line of out.split('\n')) {
      if (!line.includes('bot/index.js') && !line.includes('bot\\index.js')) continue;
      const m = line.match(/(\d{4,6})\s*$/);
      if (m) {
        const pid = parseInt(m[1].trim(), 10);
        if (pid && pid !== currentPid) botPids.push(pid);
      }
    }

    if (botPids.length > 0) {
      console.log(`🔪 Kill ${botPids.length} instance(s) bot...`);
      for (const pid of botPids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
          console.log(`   ✅ PID ${pid} terminé`);
        } catch { /* déjà mort */ }
      }
      // Attendre que Discord libère la connexion WebSocket
      const end = Date.now() + 1000;
      while (Date.now() < end) {}
    } else {
      console.log('✅ Aucune instance bot active');
    }
  } else {
    try {
      execSync('pkill -f "node.*bot/index\\.js" 2>/dev/null || true', { shell: true });
      execSync('sleep 1', { shell: true });
      console.log('🔪 Instances bot tuées (Unix)');
    } catch {
      console.log('✅ Aucune instance bot à tuer');
    }
  }
} catch (err) {
  console.log('⚠️  Kill script non-bloquant:', err.message);
}
