// =============================================
//   DISCORD MANAGER — DASHBOARD APP.JS
// =============================================

const API = {
  async get(url) {
    const r = await fetch(url);
    if (r.status === 401) { showLogin(); throw new Error('Unauthorized'); }
    return r.json();
  },
  async post(url, data) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  async patch(url, data) {
    const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json();
  },
  async delete(url) {
    const r = await fetch(url, { method: 'DELETE' });
    return r.json();
  }
};

// ===== STATE =====
let state = {
  currentPage: 'overview',
  guildFilter: '',
  modlogPage: 0,
  cmdlogPage: 0,
  guilds: []
};

// ===== INIT =====
async function init() {
  const auth = await API.get('/api/auth/check');
  if (auth.authenticated) {
    showApp();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

async function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  await loadGuilds();
  navigateTo('overview');
}

// ===== LOGIN =====
document.getElementById('login-btn').addEventListener('click', async () => {
  const pw = document.getElementById('password-input').value;
  const res = await API.post('/api/login', { password: pw });
  if (res.success) {
    showApp();
  } else {
    document.getElementById('password-input').style.borderColor = 'var(--red)';
    setTimeout(() => document.getElementById('password-input').style.borderColor = '', 1500);
  }
});

document.getElementById('password-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn').click();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await API.post('/api/logout', {});
  showLogin();
});

document.getElementById('demo-btn').addEventListener('click', async () => {
  // Need to login first with default password
  const pw = document.getElementById('password-input').value || 'admin123';
  const loginRes = await API.post('/api/login', { password: pw });
  if (loginRes.success) {
    const res = await API.post('/api/seed-demo', {});
    if (res.success) {
      document.getElementById('demo-btn').textContent = '✅ ' + res.message;
      setTimeout(() => showApp(), 800);
    }
  } else {
    document.getElementById('demo-btn').textContent = '❌ Connectez-vous d\'abord';
  }
});

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) navigateTo(page);
  });
});

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', (e) => {
    if (el.tagName === 'A' && el.closest('.card')) {
      e.preventDefault();
      navigateTo(el.dataset.page);
    }
  });
});

function navigateTo(page) {
  state.currentPage = page;

  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  const titles = {
    overview: 'Vue d\'ensemble',
    guilds: 'Serveurs',
    modlogs: 'Logs de modération',
    warnings: 'Avertissements',
    cmdlogs: 'Logs de commandes',
    customcmds: 'Commandes custom',
    settings: 'Configuration'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  loadPage(page);
}

async function loadPage(page) {
  switch (page) {
    case 'overview': await loadOverview(); break;
    case 'guilds': await loadGuildsPage(); break;
    case 'modlogs': await loadModLogs(); break;
    case 'warnings': await loadWarnings(); break;
    case 'cmdlogs': await loadCmdLogs(); break;
    case 'customcmds': await loadCustomCmds(); break;
    case 'settings': loadSettingsGuildSelector(); break;
  }
}

// ===== GUILD FILTER =====
async function loadGuilds() {
  state.guilds = await API.get('/api/guilds');
  const sel = document.getElementById('guild-filter');
  sel.innerHTML = '<option value="">Tous les serveurs</option>';
  state.guilds.forEach(g => {
    sel.innerHTML += `<option value="${g.id}">${g.name}</option>`;
  });

  document.getElementById('guild-filter').addEventListener('change', (e) => {
    state.guildFilter = e.target.value;
    state.modlogPage = 0;
    state.cmdlogPage = 0;
    if (['modlogs', 'warnings', 'cmdlogs', 'customcmds'].includes(state.currentPage)) {
      loadPage(state.currentPage);
    }
  });
}

// ===== REFRESH =====
document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  await loadPage(state.currentPage);
  setTimeout(() => btn.classList.remove('spinning'), 500);
});

// ===== OVERVIEW =====
async function loadOverview() {
  const stats = await API.get('/api/stats');

  document.getElementById('stat-guilds').textContent = stats.guilds;
  document.getElementById('stat-modactions').textContent = stats.modActions;
  document.getElementById('stat-warnings').textContent = stats.warnings;
  document.getElementById('stat-commands').textContent = stats.commands;

  // Update badges
  document.getElementById('badge-modlogs').textContent = stats.modActions;
  document.getElementById('badge-warnings').textContent = stats.warnings;

  // Recent mod actions
  const modList = document.getElementById('overview-modlogs');
  if (stats.recentMod.length === 0) {
    modList.innerHTML = '<div class="loading">Aucune action de modération.</div>';
  } else {
    modList.innerHTML = stats.recentMod.slice(0, 6).map(l => `
      <div class="mod-log-item">
        <span class="action-badge ${l.action.toLowerCase()}">${l.action}</span>
        <span class="mod-log-user">${l.user_tag || 'Inconnu'}</span>
        <span class="mod-log-reason">${l.reason || '—'}</span>
        <span class="mod-log-time">${timeAgo(l.created_at)}</span>
      </div>
    `).join('');
  }

  // Command chart
  renderCommandChart(stats.commandStats);

  // Recent commands table
  const tbody = document.getElementById('overview-cmdlogs');
  if (stats.recentCommands.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Aucune commande exécutée.</td></tr>';
  } else {
    tbody.innerHTML = stats.recentCommands.map(c => `
      <tr>
        <td><span class="user-tag">${c.user_tag}</span></td>
        <td><span class="action-badge default">${c.command}</span></td>
        <td>${c.guild_id || '—'}</td>
        <td><span class="timestamp">${timeAgo(c.created_at)}</span></td>
      </tr>
    `).join('');
  }
}

function renderCommandChart(data) {
  const container = document.getElementById('cmd-chart');
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="loading">Aucune donnée.</div>';
    return;
  }
  const max = Math.max(...data.map(d => d.count));
  container.innerHTML = data.map(d => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${d.command}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width: ${(d.count / max * 100).toFixed(1)}%"></div>
      </div>
      <div class="chart-bar-count">${d.count}</div>
    </div>
  `).join('');
}

// ===== GUILDS PAGE =====
async function loadGuildsPage() {
  const guilds = await API.get('/api/guilds');
  const grid = document.getElementById('guilds-grid');
  if (guilds.length === 0) {
    grid.innerHTML = '<div class="loading">Aucun serveur enregistré. Le bot doit rejoindre un serveur.</div>';
    return;
  }
  grid.innerHTML = guilds.map(g => {
    const initial = g.name ? g.name[0].toUpperCase() : '?';
    return `
    <div class="guild-card" onclick="navigateTo('settings'); setTimeout(() => selectSettingsGuild('${g.id}'), 100)">
      <div class="guild-card-header">
        <div class="guild-avatar">${initial}</div>
        <div>
          <div class="guild-name">${g.name}</div>
          <div class="guild-id">${g.id}</div>
        </div>
      </div>
      <div class="guild-stats">
        <div class="guild-stat">
          <div class="guild-stat-value">—</div>
          <div class="guild-stat-label">Membres</div>
        </div>
        <div class="guild-stat">
          <div class="guild-stat-value"><span class="guild-prefix">${g.prefix || '!'}</span></div>
          <div class="guild-stat-label">Préfixe</div>
        </div>
      </div>
      <div class="guild-card-footer">
        ${g.anti_spam ? '<span class="action-badge warn">Anti-spam</span>' : ''}
        ${g.anti_links ? '<span class="action-badge ban">Anti-liens</span>' : ''}
        ${g.anti_caps ? '<span class="action-badge default">Anti-caps</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

// ===== MOD LOGS =====
const MODLOG_LIMIT = 20;

async function loadModLogs() {
  const action = document.getElementById('modlog-action-filter').value;
  const params = new URLSearchParams({
    limit: MODLOG_LIMIT,
    offset: state.modlogPage * MODLOG_LIMIT,
    ...(state.guildFilter && { guild_id: state.guildFilter }),
    ...(action && { action })
  });
  const data = await API.get('/api/mod-logs?' + params);
  const tbody = document.getElementById('modlog-table');
  document.getElementById('modlog-info').textContent = `${data.total} résultat(s)`;
  document.getElementById('modlog-page').textContent = `Page ${state.modlogPage + 1}`;

  if (data.logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Aucun log de modération.</td></tr>';
    return;
  }
  tbody.innerHTML = data.logs.map(l => `
    <tr>
      <td><span class="action-badge ${l.action.toLowerCase()}">${l.action}</span></td>
      <td><span class="user-tag">${l.user_tag || l.user_id || '—'}</span></td>
      <td><span class="user-tag">${l.moderator_tag || l.moderator_id || '—'}</span></td>
      <td>${l.reason || '—'}</td>
      <td>${l.guild_id || '—'}</td>
      <td><span class="timestamp">${timeAgo(l.created_at)}</span></td>
    </tr>
  `).join('');
}

document.getElementById('modlog-action-filter').addEventListener('change', () => {
  state.modlogPage = 0;
  loadModLogs();
});
document.getElementById('modlog-prev').addEventListener('click', () => {
  if (state.modlogPage > 0) { state.modlogPage--; loadModLogs(); }
});
document.getElementById('modlog-next').addEventListener('click', () => {
  state.modlogPage++;
  loadModLogs();
});

// ===== WARNINGS =====
async function loadWarnings() {
  const userId = document.getElementById('warn-user-filter').value.trim();
  const params = new URLSearchParams({
    ...(state.guildFilter && { guild_id: state.guildFilter }),
    ...(userId && { user_id: userId })
  });
  const data = await API.get('/api/warnings?' + params);
  const tbody = document.getElementById('warn-table');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Aucun avertissement.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(w => `
    <tr>
      <td><span class="user-tag">${w.user_tag || w.user_id}</span></td>
      <td><span class="user-tag">${w.moderator_tag || w.moderator_id}</span></td>
      <td>${w.reason || '—'}</td>
      <td>${w.guild_id || '—'}</td>
      <td><span class="timestamp">${timeAgo(w.created_at)}</span></td>
      <td><button class="btn-danger" onclick="deleteWarning(${w.id}, this)">Supprimer</button></td>
    </tr>
  `).join('');
}

document.getElementById('warn-search-btn').addEventListener('click', loadWarnings);
document.getElementById('warn-user-filter').addEventListener('keydown', e => {
  if (e.key === 'Enter') loadWarnings();
});

async function deleteWarning(id, btn) {
  if (!confirm('Supprimer cet avertissement?')) return;
  await API.delete('/api/warnings/' + id);
  btn.closest('tr').remove();
}

// ===== CMD LOGS =====
const CMDLOG_LIMIT = 25;

async function loadCmdLogs() {
  const params = new URLSearchParams({
    limit: CMDLOG_LIMIT,
    offset: state.cmdlogPage * CMDLOG_LIMIT,
    ...(state.guildFilter && { guild_id: state.guildFilter })
  });
  const data = await API.get('/api/command-logs?' + params);
  const tbody = document.getElementById('cmdlog-table');
  document.getElementById('cmdlog-page').textContent = `Page ${state.cmdlogPage + 1}`;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Aucun log de commande.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><span class="user-tag">${c.user_tag || c.user_id}</span></td>
      <td><span class="action-badge default">${c.command}</span></td>
      <td><span class="user-tag" style="color:var(--text-dim)">${c.args || '—'}</span></td>
      <td>${c.channel_id || '—'}</td>
      <td>${c.guild_id || '—'}</td>
      <td><span class="timestamp">${timeAgo(c.created_at)}</span></td>
    </tr>
  `).join('');
}

document.getElementById('cmdlog-prev').addEventListener('click', () => {
  if (state.cmdlogPage > 0) { state.cmdlogPage--; loadCmdLogs(); }
});
document.getElementById('cmdlog-next').addEventListener('click', () => {
  state.cmdlogPage++;
  loadCmdLogs();
});

// ===== CUSTOM COMMANDS =====
async function loadCustomCmds() {
  const params = new URLSearchParams({
    ...(state.guildFilter && { guild_id: state.guildFilter })
  });
  const data = await API.get('/api/custom-commands?' + params);
  const tbody = document.getElementById('customcmd-table');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Aucune commande custom.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><span class="user-tag">${c.trigger}</span></td>
      <td>${c.response.substring(0, 60)}${c.response.length > 60 ? '...' : ''}</td>
      <td>${c.guild_id || '—'}</td>
      <td><span class="timestamp">${timeAgo(c.created_at)}</span></td>
      <td><button class="btn-danger" onclick="deleteCustomCmd(${c.id}, this)">Supprimer</button></td>
    </tr>
  `).join('');
}

document.getElementById('add-cmd-btn').addEventListener('click', () => {
  const form = document.getElementById('add-cmd-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  // Populate guild select
  const sel = document.getElementById('cmd-guild-select');
  sel.innerHTML = state.guilds.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
});

document.getElementById('cancel-cmd-btn').addEventListener('click', () => {
  document.getElementById('add-cmd-form').style.display = 'none';
});

document.getElementById('save-cmd-btn').addEventListener('click', async () => {
  const guild_id = document.getElementById('cmd-guild-select').value;
  const trigger = document.getElementById('cmd-trigger').value.trim();
  const response = document.getElementById('cmd-response').value.trim();
  if (!guild_id || !trigger || !response) return alert('Tous les champs sont requis.');
  const res = await API.post('/api/custom-commands', { guild_id, trigger, response });
  if (res.success) {
    document.getElementById('add-cmd-form').style.display = 'none';
    document.getElementById('cmd-trigger').value = '';
    document.getElementById('cmd-response').value = '';
    loadCustomCmds();
  }
});

async function deleteCustomCmd(id, btn) {
  if (!confirm('Supprimer cette commande custom?')) return;
  await API.delete('/api/custom-commands/' + id);
  btn.closest('tr').remove();
}

// ===== SETTINGS =====
function loadSettingsGuildSelector() {
  const sel = document.getElementById('settings-guild-select');
  sel.innerHTML = '<option value="">Choisir un serveur...</option>';
  state.guilds.forEach(g => {
    sel.innerHTML += `<option value="${g.id}">${g.name}</option>`;
  });
}

document.getElementById('settings-guild-select').addEventListener('change', (e) => {
  if (e.target.value) selectSettingsGuild(e.target.value);
  else document.getElementById('settings-form').style.display = 'none';
});

async function selectSettingsGuild(id) {
  document.getElementById('settings-guild-select').value = id;
  const guild = await API.get('/api/guilds/' + id);
  document.getElementById('settings-form').style.display = 'block';

  document.getElementById('s-prefix').value = guild.prefix || '!';
  document.getElementById('s-welcome-channel').value = guild.welcome_channel || '';
  document.getElementById('s-welcome-msg').value = guild.welcome_message || 'Welcome {user} to {server}!';
  document.getElementById('s-log-channel').value = guild.log_channel || '';
  document.getElementById('s-auto-role').value = guild.auto_role || '';
  document.getElementById('s-anti-spam').checked = !!guild.anti_spam;
  document.getElementById('s-anti-links').checked = !!guild.anti_links;
  document.getElementById('s-anti-caps').checked = !!guild.anti_caps;
}

document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const id = document.getElementById('settings-guild-select').value;
  if (!id) return;

  const data = {
    prefix: document.getElementById('s-prefix').value || '!',
    welcome_channel: document.getElementById('s-welcome-channel').value,
    welcome_message: document.getElementById('s-welcome-msg').value,
    log_channel: document.getElementById('s-log-channel').value,
    auto_role: document.getElementById('s-auto-role').value,
    anti_spam: document.getElementById('s-anti-spam').checked,
    anti_links: document.getElementById('s-anti-links').checked,
    anti_caps: document.getElementById('s-anti-caps').checked
  };

  const res = await API.patch('/api/guilds/' + id, data);
  const toast = document.getElementById('settings-toast');
  toast.classList.remove('hidden', 'success', 'error');

  if (res.success) {
    toast.textContent = '✅ Configuration sauvegardée!';
    toast.classList.add('success');
    await loadGuilds();
  } else {
    toast.textContent = '❌ Erreur: ' + (res.error || 'Inconnue');
    toast.classList.add('error');
  }

  setTimeout(() => toast.classList.add('hidden'), 3000);
});

// ===== SOCKET.IO real-time =====
try {
  const socket = io();
  socket.on('guild-updated', (guildId) => {
    console.log('[WS] Guild updated:', guildId);
    if (state.currentPage === 'settings' && document.getElementById('settings-guild-select').value === guildId) {
      selectSettingsGuild(guildId);
    }
  });
} catch(e) {}

// ===== UTILS =====
function timeAgo(ts) {
  if (!ts) return '—';
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return 'Il y a ' + diff + 's';
  if (diff < 3600) return 'Il y a ' + Math.floor(diff/60) + 'min';
  if (diff < 86400) return 'Il y a ' + Math.floor(diff/3600) + 'h';
  return 'Il y a ' + Math.floor(diff/86400) + 'j';
}

// ===== START =====
init();
