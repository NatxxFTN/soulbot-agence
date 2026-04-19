'use strict';

const fs   = require('fs');
const path = require('path');
const { ChannelType } = require('discord.js');
const { db } = require('../database');

const TEMPLATES_DIR = path.join(__dirname, '../../data/templates');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

const STMT_LOG = db.prepare(`
  INSERT INTO template_logs
    (action, template_name, user_id, guild_id, guild_name, mode, stats, success, error, duration_ms, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ─── Sérialisation ────────────────────────────────────────────────────────────

async function serializeGuild(guild, options = {}) {
  const { includeEmojis = false } = options;

  const data = {
    name      : guild.name,
    icon      : guild.iconURL({ size: 256 }),
    saved_at  : Date.now(),
    roles     : [],
    categories: [],
    emojis    : [],
  };

  // Rôles — sauf @everyone et rôles bot
  guild.roles.cache
    .filter(r => !r.managed && r.id !== guild.roles.everyone.id)
    .sort((a, b) => b.position - a.position)
    .forEach(r => {
      data.roles.push({
        name        : r.name,
        color       : r.hexColor,
        hoist       : r.hoist,
        mentionable : r.mentionable,
        position    : r.position,
        permissions : r.permissions.toArray(),
      });
    });

  // Catégories + enfants
  guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position)
    .forEach(cat => {
      const catData = { name: cat.name, position: cat.position, channels: [] };
      guild.channels.cache
        .filter(c => c.parentId === cat.id)
        .sort((a, b) => a.position - b.position)
        .forEach(ch => catData.channels.push(serializeChannel(ch)));
      data.categories.push(catData);
    });

  // Salons hors catégorie
  const orphans = guild.channels.cache.filter(
    c => !c.parentId && c.type !== ChannelType.GuildCategory
  );
  if (orphans.size > 0) {
    const orphanCat = { name: '_ROOT_', position: -1, channels: [] };
    orphans.forEach(ch => orphanCat.channels.push(serializeChannel(ch)));
    data.categories.unshift(orphanCat);
  }

  if (includeEmojis) {
    guild.emojis.cache.forEach(e => {
      data.emojis.push({ name: e.name, url: e.url, animated: e.animated });
    });
  }

  return data;
}

function serializeChannel(ch) {
  return {
    name            : ch.name,
    type            : ch.type,
    topic           : ch.topic || null,
    nsfw            : ch.nsfw || false,
    rateLimitPerUser: ch.rateLimitPerUser || 0,
    bitrate         : ch.bitrate || null,
    userLimit       : ch.userLimit || null,
  };
}

// ─── Stockage ────────────────────────────────────────────────────────────────

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 50);
}

function saveTemplate(name, data) {
  const safeName = sanitizeName(name);
  const filePath = path.join(TEMPLATES_DIR, `${safeName}.json`);
  // Validation que le chemin résolu reste dans TEMPLATES_DIR
  if (!filePath.startsWith(TEMPLATES_DIR)) throw new Error('Nom de template invalide.');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return { safeName, filePath };
}

function listTemplates() {
  return fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => {
      const name   = path.basename(f, '.json');
      const stat   = fs.statSync(path.join(TEMPLATES_DIR, f));
      try {
        const data = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf-8'));
        return {
          name,
          original_name: data.name,
          saved_at     : data.saved_at,
          stats: {
            roles     : data.roles?.length || 0,
            categories: data.categories?.length || 0,
            channels  : data.categories?.reduce((s, c) => s + (c.channels?.length || 0), 0) || 0,
            emojis    : data.emojis?.length || 0,
          },
          size_kb: (stat.size / 1024).toFixed(1),
        };
      } catch {
        return { name, error: 'Fichier corrompu' };
      }
    });
}

function loadTemplate(name) {
  const safeName = sanitizeName(name);
  const filePath = path.join(TEMPLATES_DIR, `${safeName}.json`);
  if (!filePath.startsWith(TEMPLATES_DIR)) return null;
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

// ─── Application ─────────────────────────────────────────────────────────────

async function* applyTemplate(guild, template, options = {}) {
  const { mode = 'add', includeEmojis = false } = options;
  const stats = { rolesCreated: 0, categoriesCreated: 0, channelsCreated: 0, emojisCreated: 0, errors: [] };

  // Mode reset — supprime tout d'abord
  if (mode === 'reset') {
    yield { status: 'resetting', message: '🗑️ Suppression des éléments existants...' };
    for (const ch of guild.channels.cache.filter(c => c.deletable).values()) {
      try { await ch.delete('Template reset'); } catch {}
      await sleep(200);
    }
    for (const r of guild.roles.cache.filter(r => r.editable && !r.managed && r.id !== guild.roles.everyone.id).values()) {
      try { await r.delete('Template reset'); } catch {}
      await sleep(200);
    }
  }

  // Rôles
  yield { status: 'roles', message: '🎭 Création des rôles...', current: 0, total: template.roles.length };
  for (const roleData of template.roles) {
    try {
      await guild.roles.create({
        name        : roleData.name,
        color       : roleData.color,
        hoist       : roleData.hoist,
        mentionable : roleData.mentionable,
        permissions : filterSafePermissions(roleData.permissions),
      });
      stats.rolesCreated++;
      yield { status: 'role_created', current: stats.rolesCreated, total: template.roles.length, message: `🎭 Rôles : ${stats.rolesCreated}/${template.roles.length}` };
      await sleep(500);
    } catch (err) {
      stats.errors.push(`Rôle ${roleData.name}: ${err.message}`);
    }
  }

  // Catégories + salons
  const totalChannels = template.categories.reduce((s, c) => s + (c.channels?.length || 0), 0);
  yield { status: 'channels', message: '📁 Création des salons...', current: 0, total: totalChannels };

  for (const catData of template.categories) {
    try {
      let category = null;
      if (catData.name !== '_ROOT_') {
        category = await guild.channels.create({ name: catData.name, type: ChannelType.GuildCategory });
        stats.categoriesCreated++;
      }
      for (const chData of catData.channels || []) {
        try {
          await guild.channels.create({
            name            : chData.name,
            type            : chData.type,
            parent          : category?.id,
            topic           : chData.topic || undefined,
            nsfw            : chData.nsfw || false,
            rateLimitPerUser: chData.rateLimitPerUser || 0,
            bitrate         : chData.bitrate || undefined,
            userLimit       : chData.userLimit || undefined,
          });
          stats.channelsCreated++;
          yield { status: 'channel_created', current: stats.channelsCreated, total: totalChannels, message: `📁 Salons : ${stats.channelsCreated}/${totalChannels}` };
          await sleep(400);
        } catch (err) {
          stats.errors.push(`Salon ${chData.name}: ${err.message}`);
        }
      }
    } catch (err) {
      stats.errors.push(`Catégorie ${catData.name}: ${err.message}`);
    }
  }

  // Emojis
  if (includeEmojis && template.emojis?.length > 0) {
    yield { status: 'emojis', message: '😀 Création des emojis...', current: 0, total: template.emojis.length };
    for (const e of template.emojis) {
      try {
        await guild.emojis.create({ attachment: e.url, name: e.name });
        stats.emojisCreated++;
        await sleep(1000);
      } catch (err) {
        stats.errors.push(`Emoji ${e.name}: ${err.message}`);
      }
    }
  }

  yield { status: 'done', stats };
}

// ─── Sécurité ────────────────────────────────────────────────────────────────

const DANGEROUS_PERMS = new Set([
  'Administrator', 'ManageGuild', 'ManageRoles',
  'ManageWebhooks', 'BanMembers', 'KickMembers',
]);

function filterSafePermissions(permArray) {
  return (permArray || []).filter(p => !DANGEROUS_PERMS.has(p));
}

// ─── DB ──────────────────────────────────────────────────────────────────────

function logAction(data) {
  STMT_LOG.run(
    data.action, data.templateName, data.userId, data.guildId,
    data.guildName || null, data.mode || null,
    JSON.stringify(data.stats || {}),
    data.success ? 1 : 0,
    data.error || null, data.durationMs || null,
    Date.now()
  );
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { serializeGuild, saveTemplate, listTemplates, loadTemplate, applyTemplate, logAction };
