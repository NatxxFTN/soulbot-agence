'use strict';

/* ── Init Lucide icons ──────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
});

/* ── Auth guard ─────────────────────────────────────────────────────────────── */
fetch('/api/auth/check')
  .then(r => r.json())
  .then(d => { if (!d.authenticated) window.location.href = '/login.html'; })
  .catch(() => {});

/* ── User info ──────────────────────────────────────────────────────────────── */
fetch('/api/me')
  .then(r => r.json())
  .then(d => {
    const nameEl   = document.getElementById('userNameEl');
    const avatarEl = document.getElementById('userAvatarEl');
    const welcomeEl = document.getElementById('welcomeName');
    if (!d || d.error) return;
    const displayName = d.username || 'Nathan';
    if (nameEl)    nameEl.textContent   = displayName;
    if (welcomeEl) welcomeEl.textContent = displayName;
    if (avatarEl) {
      if (d.avatar && d.id) {
        const img = document.createElement('img');
        img.src = `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64`;
        img.alt = displayName;
        avatarEl.innerHTML = '';
        avatarEl.appendChild(img);
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }
  })
  .catch(() => {});

/* ── Sidebar navigation ─────────────────────────────────────────────────────── */
const navItems = document.querySelectorAll('.nav-item[data-section]');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('pageTitle');
const breadcrumbSub = document.getElementById('breadcrumbSub');

const sectionMeta = {
  overview : { title: 'Vue d\'ensemble', crumb: 'Aperçu' },
  guilds   : { title: 'Serveurs',        crumb: 'Tous les serveurs' },
  commands : { title: 'Commandes',       crumb: 'Historique' },
  'mod-logs': { title: 'Mod logs',       crumb: 'Modération' },
  warnings : { title: 'Avertissements',  crumb: 'Liste' },
};

function showSection(id) {
  sections.forEach(s => s.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('section-' + id);
  if (sec) sec.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-section="${id}"]`);
  if (nav) nav.classList.add('active');
  const meta = sectionMeta[id] || { title: id, crumb: id };
  if (pageTitle) pageTitle.textContent   = meta.title;
  if (breadcrumbSub) breadcrumbSub.textContent = meta.crumb;
  // Load section data on first show
  if (!loadedSections.has(id)) {
    loadedSections.add(id);
    loadSection(id);
  }
}

const loadedSections = new Set(['overview']);

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    showSection(item.dataset.section);
    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
  });
});

/* ── Sidebar toggle (desktop collapse) ─────────────────────────────────────── */
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
});

/* ── Mobile sidebar ─────────────────────────────────────────────────────────── */
document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('open');
});

/* ── Refresh button ─────────────────────────────────────────────────────────── */
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    loadStats();
    loadedSections.forEach(id => loadSection(id));
    refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => { refreshBtn.style.transform = ''; }, 500);
  });
}

/* ── Stats loader ───────────────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const [statsRes, logsStats] = await Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/logs/stats').then(r => r.json()),
    ]);

    setVal('stat-guilds',   statsRes.guilds      ?? '—');
    setVal('stat-commands', logsStats.totalCommands ?? '—');
    setVal('stat-24h',      logsStats.last24h      ?? '—');
    setVal('stat-errors',   logsStats.totalErrors  ?? '—');
    setVal('guildCountBadge', statsRes.guilds ?? '—');
    setVal('guildsTotal',   statsRes.guilds ?? '—');

    // Top commands
    if (statsRes.commandStats?.length) {
      renderTopCmds(statsRes.commandStats);
    }

    // Recent commands
    if (statsRes.recentCommands?.length) {
      renderRecentCmds(statsRes.recentCommands);
    }

    // Chart data (build from recentCommands + last24h)
    buildChart(statsRes.recentCommands || []);
  } catch (e) {
    console.error('[dashboard] loadStats error:', e);
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof val === 'number' ? val.toLocaleString('fr-FR') : val;
}

/* ── Top commands ────────────────────────────────────────────────────────────── */
function renderTopCmds(cmds) {
  const list = document.getElementById('topCmdList');
  if (!list) return;
  const max = cmds[0]?.count || 1;
  list.innerHTML = cmds.slice(0, 8).map((c, i) => `
    <li class="cmd-list-item">
      <span class="cmd-rank">${i + 1}</span>
      <span class="cmd-name">;${esc(c.command || c.command_name || '?')}</span>
      <div class="cmd-bar-wrap">
        <div class="cmd-bar-fill" style="width:${Math.round((c.count / max) * 100)}%"></div>
      </div>
      <span class="cmd-count">${c.count}</span>
    </li>
  `).join('');
}

/* ── Recent commands table ───────────────────────────────────────────────────── */
function renderRecentCmds(logs) {
  const tbody = document.getElementById('recentCmdBody');
  if (!tbody) return;
  tbody.innerHTML = logs.slice(0, 10).map(l => `
    <tr>
      <td><code style="color:var(--accent);font-family:var(--font-mono);font-size:11px">;${esc(l.command_name || '?')}</code></td>
      <td style="color:var(--text-2)">${esc(l.guild_name || '—')}</td>
      <td style="color:var(--text-3)">${fmtTime(l.timestamp)}</td>
      <td>${l.success !== 0
        ? '<span class="badge badge-success">OK</span>'
        : '<span class="badge badge-danger">Erreur</span>'}</td>
    </tr>
  `).join('');
}

/* ── Chart.js activity chart ─────────────────────────────────────────────────── */
let chartInstance = null;

function buildChart(recentLogs) {
  const canvas = document.getElementById('activityChart');
  if (!canvas || !window.Chart) return;

  // Build last-7-days buckets from recentLogs
  const now = Date.now();
  const days = 7;
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86400000);
    return {
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      ts: d.setHours(0,0,0,0),
      count: 0,
    };
  });
  recentLogs.forEach(log => {
    const dayStart = new Date(log.timestamp).setHours(0,0,0,0);
    const bucket = buckets.find(b => b.ts === dayStart);
    if (bucket) bucket.count++;
  });

  const labels = buckets.map(b => b.label);
  const data   = buckets.map(b => b.count);

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0, 'rgba(243,156,18,0.25)');
  grad.addColorStop(1, 'rgba(243,156,18,0.0)');

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#F39C12',
        backgroundColor: grad,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#F39C12',
        pointBorderColor: '#0A0A0C',
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,20,24,0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.65)',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} commande${ctx.parsed.y !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 } },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 }, stepSize: 1 },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ── Chart chips (7d / 24h) ──────────────────────────────────────────────────── */
document.querySelectorAll('[data-chart]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chart]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // TODO: fetch different data range
    loadStats();
  });
});

/* ── Section loaders ─────────────────────────────────────────────────────────── */
function loadSection(id) {
  switch (id) {
    case 'guilds':    loadGuilds();    break;
    case 'commands':  loadCmdHistory(); break;
    case 'mod-logs':  loadModLogs();   break;
    case 'warnings':  loadWarnings();  break;
  }
}

async function loadGuilds() {
  const grid = document.getElementById('guildsGrid');
  if (!grid) return;
  try {
    const data = await fetch('/api/guilds').then(r => r.json());
    if (!Array.isArray(data) || !data.length) {
      grid.innerHTML = '<div class="guilds-empty">Aucun serveur actif.</div>';
      return;
    }
    grid.innerHTML = data.map(g => `
      <div class="guild-card">
        <div class="guild-name">${esc(g.guild_name || g.guild_id)}</div>
        <div class="guild-id">${g.guild_id}</div>
        <div class="guild-stats">
          <div>
            <span class="guild-stat-val">${(g.events_count ?? 0).toLocaleString('fr-FR')}</span>
            <span class="guild-stat-label">Événements</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    grid.innerHTML = '<div class="guilds-empty">Erreur de chargement.</div>';
  }
}

async function loadCmdHistory() {
  const tbody = document.getElementById('cmdHistBody');
  if (!tbody) return;
  try {
    const data = await fetch('/api/logs/recent?limit=200').then(r => r.json());
    const cmds = data.filter(l => l.category === 'command');
    if (!cmds.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Aucune commande enregistrée.</td></tr>';
      return;
    }
    tbody.innerHTML = cmds.slice(0, 100).map(l => `
      <tr>
        <td><code style="color:var(--accent);font-family:var(--font-mono);font-size:11px">;${esc(l.command_name || '?')}</code></td>
        <td>${esc(l.guild_name || '—')}</td>
        <td>${esc(l.user_name || '—')}</td>
        <td>${l.duration_ms != null ? `${l.duration_ms}ms` : '—'}</td>
        <td>${l.success !== 0
          ? '<span class="badge badge-success">OK</span>'
          : '<span class="badge badge-danger">Erreur</span>'}</td>
        <td style="color:var(--text-3);white-space:nowrap">${fmtDate(l.timestamp)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erreur de chargement.</td></tr>';
  }
}

document.getElementById('cmdFilterInput')?.addEventListener('input', function () {
  const q = this.value.toLowerCase();
  document.querySelectorAll('#cmdHistBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

async function loadModLogs() {
  const tbody = document.getElementById('modLogsBody');
  if (!tbody) return;
  try {
    const data = await fetch('/api/mod-logs?limit=100').then(r => r.json());
    const logs = data.logs || [];
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Aucun log de modération.</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td><span class="badge badge-warn">${esc(l.action || '—')}</span></td>
        <td>${esc(l.target_id || '—')}</td>
        <td>${esc(l.moderator_id || '—')}</td>
        <td>${esc(l.guild_id || '—')}</td>
        <td style="color:var(--text-2)">${esc(l.reason || '—')}</td>
        <td style="color:var(--text-3);white-space:nowrap">${fmtDate(l.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erreur de chargement.</td></tr>';
  }
}

async function loadWarnings() {
  const tbody = document.getElementById('warningsBody');
  if (!tbody) return;
  try {
    const data = await fetch('/api/warnings?limit=100').then(r => r.json());
    if (!Array.isArray(data) || !data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Aucun avertissement.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(w => `
      <tr>
        <td>${esc(w.user_id || '—')}</td>
        <td>${esc(w.guild_id || '—')}</td>
        <td style="color:var(--text-2)">${esc(w.reason || '—')}</td>
        <td>${esc(w.moderator_id || '—')}</td>
        <td style="color:var(--text-3);white-space:nowrap">${fmtDate(w.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Erreur de chargement.</td></tr>';
  }
}

/* ── Live log stream ─────────────────────────────────────────────────────────── */
const socket      = io();
const liveStream  = document.getElementById('liveStream');
const liveBadge   = document.getElementById('liveBadge');
let liveFilter    = '';
let streamCount   = 0;

document.querySelectorAll('.log-filter-chips .chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.log-filter-chips .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    liveFilter = btn.dataset.level || '';
  });
});

socket.on('connect',    () => {
  if (liveBadge) { liveBadge.textContent = '● LIVE'; liveBadge.className = 'live-badge'; }
});
socket.on('disconnect', () => {
  if (liveBadge) { liveBadge.textContent = '● OFFLINE'; liveBadge.className = 'live-badge off'; }
});
socket.on('logs:initial', logs => { logs.forEach(log => appendStreamRow(log)); });
socket.on('log:new', log => {
  appendStreamRow(log);
  // Rafraîchir les stats toutes les 5 commandes pour ne pas surcharger
  if (log.level === 'command') { streamCount++; if (streamCount % 5 === 0) loadStats(); }
});

function appendStreamRow(log) {
  if (liveFilter && log.level !== liveFilter) return;
  const empty = liveStream?.querySelector('.stream-empty');
  if (empty) empty.remove();

  const badgeClass = {
    command: 'badge-command',
    error  : 'badge-danger',
    warn   : 'badge-warn',
    info   : 'badge-info',
    debug  : 'badge-muted',
  }[log.level] || 'badge-muted';

  const row = document.createElement('div');
  row.className = 'stream-row';
  const cmdPart = log.command_name ? `<span class="stream-cmd">;${esc(log.command_name)}</span>` : '';
  row.innerHTML = `
    <span class="stream-time">${fmtTime(log.timestamp)}</span>
    <span class="stream-level badge ${badgeClass}">${esc(log.level)}</span>
    <span class="stream-msg">${cmdPart}${esc(log.message)}</span>
  `;
  if (liveStream) {
    liveStream.insertBefore(row, liveStream.firstChild);
    if (liveStream.children.length > 100) liveStream.removeChild(liveStream.lastChild);
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('fr-FR', { hour12: false });
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour12: false });
}

/* ── Initial load ────────────────────────────────────────────────────────────── */
loadStats();
setInterval(loadStats, 30000);
