'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SERVER SCANNER — ServerForge
 * ═══════════════════════════════════════════════════════════════════════════════
 * Scanne un serveur Discord pour en extraire la structure (rôles, salons,
 * permissions) et la sauvegarder en tant que template .json réutilisable.
 *
 * Usage :
 *   const template = await scanServer(guild);
 *   saveTemplate('mon-save', template);
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

const TEMPLATES_DIR = path.join(__dirname, '../../templates');

// ─── Dossier des templates ─────────────────────────────────────────────────
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

/**
 * Scanne un serveur Discord et retourne sa structure au format template.
 *
 * @param {import('discord.js').Guild} guild - Le serveur à scanner
 * @returns {Promise<object>} Template représentant la structure du serveur
 */
async function scanServer(guild) {
  logger.info('ServerScanner', `Scan de "${guild.name}" (${guild.id})`);

  // ── 1. Scan des rôles ─────────────────────────────────────────────────
  await guild.roles.fetch();
  const roles = guild.roles.cache
    .filter(r => r.name !== '@everyone') // Ignore @everyone
    .sort((a, b) => b.position - a.position) // Du plus haut au plus bas
    .map(r => ({
      name: r.name,
      color: r.hexColor === '#000000' ? '#99AAB5' : r.hexColor,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: formatPermissions(r.permissions),
      position: r.position,
      separator: r.name.match(/^[-—=_]+$/) ? true : false,
      icon_url: r.icon || null,
      icon_local: null,
    }));

  // ── 2. Scan des catégories et salons ──────────────────────────────────
  await guild.channels.fetch();
  const categories = [];
  const processedChannels = new Set();

  // 2a. Catégories
  const categoryChannels = guild.channels.cache
    .filter(c => c.type === 4) // GUILD_CATEGORY
    .sort((a, b) => a.position - b.position);

  for (const cat of categoryChannels.values()) {
    const channels = [];

    // 2b. Salons dans la catégorie
    const childChannels = guild.channels.cache
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.position - b.position);

    for (const ch of childChannels.values()) {
      processedChannels.add(ch.id);
      channels.push(await serializeChannel(ch));
    }

    categories.push({
      name: cat.name,
      position: cat.position,
      channels,
    });
  }

  // 2c. Salons sans catégorie (les mettre dans une catégorie "Autre")
  const orphanChannels = guild.channels.cache
    .filter(c => !c.parentId && c.type !== 4)
    .sort((a, b) => a.position - b.position);

  if (orphanChannels.size > 0) {
    const channels = [];
    for (const ch of orphanChannels.values()) {
      channels.push(await serializeChannel(ch));
    }
    categories.push({
      name: 'Autre',
      position: 99,
      channels,
    });
  }

  // ── 3. Construction du template ────────────────────────────────────────
  const template = {
    meta: {
      name: guild.name,
      description: `Structure du serveur "${guild.name}" scannée le ${new Date().toLocaleDateString('fr-FR')}`,
      color_primary: '#8B5CF6',
      color_secondary: '#1a1a2e',
    },
    roles,
    categories,
    logs: {
      enabled: false,
      inherit_soulbot: false,
      category_name: '-·📊·- Logs',
      position: 10,
      channels: [],
    },
    welcome: {
      enabled: false,
      title: 'Bienvenue sur **{server}** !',
      description: 'Bienvenue parmi nous !',
      color: '#8B5CF6',
      thumbnail: true,
      image: null,
      footer: 'Serveur généré par ServerForge',
    },
    rules: {
      enabled: false,
      title: 'Règlement de {server}',
      rules: [],
      color: '#8B5CF6',
      footer: 'En restant, tu acceptes ces règles',
    },
  };

  logger.info('ServerScanner',
    `Scan terminé: ${roles.length} rôles, ${categories.length} catégories, ` +
    `${categories.reduce((s, c) => s + c.channels.length, 0)} salons`
  );

  return template;
}

/**
 * Convertit un salon en format template.
 * @param {import('discord.js').GuildChannel} ch
 * @returns {Promise<object>}
 */
async function serializeChannel(ch) {
  const typeMap = {
    0: 'text',
    2: 'voice',
    5: 'announcement',
    13: 'stage',
    15: 'forum',
  };

  const channel = {
    name: ch.name,
    type: typeMap[ch.type] || 'text',
    topic: ch.topic || null,
    slowmode: ch.rateLimitPerUser || 0,
    nsfw: ch.nsfw || false,
    bitrate: ch.bitrate || null,
    userLimit: ch.userLimit || null,
    permissions: {},
    rules_message: false,
    welcome_message: false,
  };

  // Permissions : permission_overwrites
  if (ch.permissionOverwrites?.cache) {
    for (const [id, overwrite] of ch.permissionOverwrites.cache) {
      // On utilise le nom du rôle si possible
      let name = null;
      if (overwrite.type === 0) { // Rôle
        const role = ch.guild.roles.cache.get(id);
        name = role ? role.name : id;
      } else if (overwrite.type === 1) { // Membre
        name = `@${overwrite.id}`;
      }

      if (name === '@everyone') {
        // Permissions @everyone
        const allow = formatPermissionArray(overwrite.allow);
        const deny = formatPermissionArray(overwrite.deny);
        channel.permissions.everyone = mergePerms(allow, deny);
      } else if (name) {
        // Skip @everyone déjà traité, skip les membres
        if (!name.startsWith('@') && name !== '@everyone') {
          const allow = formatPermissionArray(overwrite.allow);
          const deny = formatPermissionArray(overwrite.deny);
          channel.permissions[name] = mergePerms(allow, deny, true);
        }
      }
    }
  }

  return channel;
}

/**
 * Convertit un bitfield de permissions en tableau de noms.
 */
function formatPermissionArray(bitfield) {
  if (!bitfield) return [];
  const perms = new PermissionsBitField(bitfield);
  return perms.toArray();
}

/**
 * Fusionne allow/deny en un tableau de permissions.
 * @param {string[]} allow - Permissions autorisées
 * @param {string[]} deny - Permissions refusées
 * @param {boolean} removeDenied - Si true, enlève les permissions refusées
 * @returns {string[]}
 */
function mergePerms(allow, deny, removeDenied = false) {
  if (removeDenied) {
    return allow.filter(p => !deny.includes(p));
  }
  return allow;
}

/**
 * Convertit un PermissionsBitField en tableau de noms lisibles.
 */
function formatPermissions(permissions) {
  if (!permissions) return [];
  return permissions.toArray();
}

/**
 * Sauvegarde un template dans le dossier bot/templates/.
 * @param {string} name - Nom du fichier (sans extension)
 * @param {object} template - Le template à sauvegarder
 * @returns {string} Chemin du fichier créé
 */
function saveTemplate(name, template) {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'template-scanne';

  const filePath = path.join(TEMPLATES_DIR, `${safeName}.template.json`);

  fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
  logger.info('ServerScanner', `Template sauvegardé: ${filePath}`);

  return filePath;
}

/**
 * Scanne un serveur via un code template Discord (sans être dans le serveur).
 * L'utilisateur récupère le code depuis Paramètres → Server Template.
 *
 * @param {string} code - Code template Discord (ex: "abc123" ou "discord.new/abc123")
 * @returns {Promise<object>} Template ServerForge
 */
async function scanTemplateCode(code) {
  // Nettoie le code (supporte discord.new/xxx, discord.gg/xxx, ou juste le code)
  const cleanCode = code
    .replace(/https?:\/\//, '')
    .replace(/discord\.(new|gg|com\/invite)\//, '')
    .replace(/\/$/, '')
    .trim();

  if (!/^[a-zA-Z0-9-]+$/.test(cleanCode)) {
    throw new Error(`Code template invalide: "${code}"`);
  }

  logger.info('ServerScanner', `Récupération du template: ${cleanCode}`);

  // L'API Discord des templates est publique — pas besoin de token
  const res = await fetch(`https://discord.com/api/v10/guilds/templates/${cleanCode}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Code template introuvable. Vérifie que le code est valide.');
    }
    if (res.status === 429) {
      throw new Error('Rate limit — attends quelques secondes et réessaie.');
    }
    throw new Error(`Erreur Discord: ${res.status}`);
  }

  const data = await res.json();
  const guild = data.serialized_source_guild;

  if (!guild) {
    throw new Error('Ce template ne contient pas de données de serveur.');
  }

  logger.info('ServerScanner',
    `Template récupéré: "${guild.name}" (${guild.roles?.length || 0} rôles, ${guild.channels?.length || 0} salons)`
  );

  // ── Convertir les rôles ──────────────────────────────────────────────────
  const roles = (guild.roles || [])
    .filter(r => r.name !== '@everyone')
    .map(r => ({
      name: r.name,
      color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#99AAB5',
      hoist: r.hoist || false,
      mentionable: r.mentionable || false,
      permissions: r.permissions ? new PermissionsBitField(r.permissions).toArray() : [],
      position: r.position || 0,
      separator: /^[-—=_]+$/.test(r.name),
      icon_url: null,
      icon_local: null,
    }));

  // ── Convertir les salons ────────────────────────────────────────────────
  const typeMap = { 0: 'text', 2: 'voice', 4: 'category', 5: 'announcement', 13: 'stage', 15: 'forum' };
  const categories = [];
  const processed = new Set();

  // Les salons de type "category"
  const cats = guild.channels?.filter(c => c.type === 4) || [];
  const uncat = guild.channels?.filter(c => c.type !== 4) || [];

  for (const cat of cats.sort((a, b) => (a.position || 0) - (b.position || 0))) {
    const channels = [];

    for (const ch of uncat.filter(c => c.parent_id === cat.id).sort((a, b) => (a.position || 0) - (b.position || 0))) {
      processed.add(ch.id);
      channels.push({
        name: ch.name,
        type: typeMap[ch.type] || 'text',
        topic: ch.topic || null,
        slowmode: ch.rate_limit_per_user || 0,
        nsfw: ch.nsfw || false,
        bitrate: ch.bitrate || null,
        userLimit: ch.user_limit || null,
        permissions: {}, // Les templates Discord n'incluent PAS les perms
        rules_message: false,
        welcome_message: false,
      });
    }

    categories.push({
      name: cat.name,
      position: cat.position || 0,
      channels,
    });
  }

  // Salons sans catégorie
  const orphans = uncat.filter(c => !c.parent_id && !processed.has(c.id));
  if (orphans.length > 0) {
    const channels = orphans.sort((a, b) => (a.position || 0) - (b.position || 0)).map(ch => ({
      name: ch.name,
      type: typeMap[ch.type] || 'text',
      topic: ch.topic || null,
      slowmode: ch.rate_limit_per_user || 0,
      nsfw: ch.nsfw || false,
      bitrate: ch.bitrate || null,
      userLimit: ch.user_limit || null,
      permissions: {},
      rules_message: false,
      welcome_message: false,
    }));

    categories.push({
      name: 'Autre',
      position: 99,
      channels,
    });
  }

  // ── Template final ──────────────────────────────────────────────────────
  return {
    meta: {
      name: guild.name,
      description: `Structure du serveur "${guild.name}" via code template Discord`,
      color_primary: '#8B5CF6',
      color_secondary: '#1a1a2e',
    },
    roles,
    categories,
    logs: {
      enabled: false,
      inherit_soulbot: false,
      category_name: '-·📊·- Logs',
      position: 10,
      channels: [],
    },
    welcome: {
      enabled: false,
      title: 'Bienvenue sur **{server}** !',
      description: 'Bienvenue parmi nous !',
      color: '#8B5CF6',
      thumbnail: true,
      image: null,
      footer: 'Serveur généré par ServerForge',
    },
    rules: {
      enabled: false,
      title: 'Règlement de {server}',
      rules: [],
      color: '#8B5CF6',
      footer: 'En restant, tu acceptes ces règles',
    },
  };
}

/**
 * Liste tous les templates disponibles dans le dossier.
 * @returns {Array<{name: string, path: string, size: number, modified: Date}>}
 */
function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];

  return fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.template.json'))
    .map(f => {
      const filePath = path.join(TEMPLATES_DIR, f);
      const stat = fs.statSync(filePath);
      return {
        name: f.replace('.template.json', ''),
        path: filePath,
        size: stat.size,
        modified: stat.mtime,
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

module.exports = { scanServer, scanTemplateCode, saveTemplate, listTemplates };
