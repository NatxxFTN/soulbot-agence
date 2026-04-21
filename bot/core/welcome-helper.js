'use strict';

const { db } = require('../database');

// ─── CRUD configuration ───────────────────────────────────────────────────────

function getWelcomeConfig(guildId) {
  return db.prepare('SELECT * FROM welcome_config WHERE guild_id = ?').get(guildId);
}

function ensureWelcomeConfig(guildId) {
  const exists = db.prepare('SELECT 1 FROM welcome_config WHERE guild_id = ?').get(guildId);
  if (!exists) {
    db.prepare('INSERT INTO welcome_config (guild_id, updated_at) VALUES (?, ?)').run(guildId, Date.now());
  }
}

function updateWelcomeConfig(guildId, updates, updatedBy = null) {
  ensureWelcomeConfig(guildId);
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values    = keys.map(k => updates[k]);
  db.prepare(`UPDATE welcome_config SET ${setClause}, updated_at = ?, updated_by = ? WHERE guild_id = ?`)
    .run(...values, Date.now(), updatedBy, guildId);
}

// ─── Champs personnalisés ────────────────────────────────────────────────────

function getFields(guildId) {
  return db.prepare('SELECT * FROM welcome_fields WHERE guild_id = ? ORDER BY field_order ASC, id ASC').all(guildId);
}

function addField(guildId, name, value, inline = false) {
  const fields = getFields(guildId);
  if (fields.length >= 25) throw new Error('Maximum 25 champs (limite Discord)');
  db.prepare('INSERT INTO welcome_fields (guild_id, field_order, name, value, inline, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, fields.length, name, value, inline ? 1 : 0, Date.now());
}

function updateField(id, name, value, inline) {
  db.prepare('UPDATE welcome_fields SET name = ?, value = ?, inline = ? WHERE id = ?')
    .run(name, value, inline ? 1 : 0, id);
}

function removeField(id) {
  db.prepare('DELETE FROM welcome_fields WHERE id = ?').run(id);
}

// ─── Validation (SecOps) ─────────────────────────────────────────────────────

const ALLOWED_IMG_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

function validateImageUrl(url) {
  if (!url || url === '') return { valid: true, url: null };
  if (url === 'user_avatar' || url === 'server_icon') return { valid: true, url };
  if (url.length > 2048) return { valid: false, error: 'URL trop longue (max 2048)' };
  try {
    const p = new URL(url);
    if (!['http:', 'https:'].includes(p.protocol)) return { valid: false, error: 'Seul http:// ou https:// accepté' };
    const path = p.pathname.toLowerCase();
    if (!ALLOWED_IMG_EXT.some(e => path.endsWith(e)) &&
        !path.includes('cdn.discordapp.com') &&
        !url.includes('i.imgur.com')) {
      return { valid: false, error: 'Extension non supportée (png/jpg/jpeg/gif/webp)' };
    }
    return { valid: true, url };
  } catch {
    return { valid: false, error: 'URL invalide' };
  }
}

function validateColor(color) {
  if (!color) return { valid: true, color: '#F39C12' };
  const hex = color.trim().startsWith('#') ? color.trim() : `#${color.trim()}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return { valid: false, error: 'Format hex invalide (ex: #F39C12)' };
  return { valid: true, color: hex };
}

// ─── Variables dynamiques ────────────────────────────────────────────────────

function replaceVariables(text, member) {
  if (!text) return text;
  const guild    = member.guild;
  const ageDays  = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  const map = {
    '{user}':            member.user.username,
    '{mention}':         `<@${member.id}>`,
    '{username}':        member.user.username,
    '{tag}':             member.user.tag,
    '{id}':              member.id,
    '{server}':          guild.name,
    '{servername}':      guild.name,
    '{membercount}':     String(guild.memberCount),
    '{account_age}':     `${ageDays} jour${ageDays > 1 ? 's' : ''}`,
    '{account_created}': new Date(member.user.createdTimestamp).toLocaleDateString('fr-FR'),
    '{joined_at}':       new Date().toLocaleDateString('fr-FR'),
    '{avatar_url}':      member.user.displayAvatarURL({ size: 512 }),
    '{server_icon}':     guild.iconURL({ size: 512 }) || '',
    '{random_color}':    '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
  };
  let result = text;
  for (const [k, v] of Object.entries(map)) result = result.split(k).join(v);
  return result;
}

// ─── Construire le message welcome ───────────────────────────────────────────

function buildWelcomeMessage(cfg, member) {
  const { EmbedBuilder } = require('discord.js');
  const payload = {};

  if (cfg.mode === 'text' || cfg.mode === 'both') {
    if (cfg.text_content) payload.content = replaceVariables(cfg.text_content, member);
  }

  if (cfg.mode === 'embed' || cfg.mode === 'both' || cfg.mode === 'image') {
    const embed = new EmbedBuilder();
    const color = validateColor(cfg.embed_color).color || '#F39C12';
    embed.setColor(color);

    if (cfg.embed_title)       embed.setTitle(replaceVariables(cfg.embed_title, member).slice(0, 256));
    if (cfg.embed_description) embed.setDescription(replaceVariables(cfg.embed_description, member).slice(0, 4096));
    if (cfg.embed_url)         embed.setURL(cfg.embed_url);

    // Thumbnail
    let thumbUrl = cfg.embed_thumbnail_url;
    if (thumbUrl === 'user_avatar')  thumbUrl = member.user.displayAvatarURL({ size: 512 });
    else if (thumbUrl === 'server_icon') thumbUrl = member.guild.iconURL({ size: 512 });
    if (thumbUrl) embed.setThumbnail(thumbUrl);

    if (cfg.embed_image_url) embed.setImage(cfg.embed_image_url);

    // Author
    if (cfg.embed_author_name) {
      let icon = cfg.embed_author_icon;
      if (icon === 'user_avatar')  icon = member.user.displayAvatarURL({ size: 512 });
      else if (icon === 'server_icon') icon = member.guild.iconURL({ size: 512 });
      embed.setAuthor({
        name   : replaceVariables(cfg.embed_author_name, member).slice(0, 256),
        iconURL: icon || undefined,
        url    : cfg.embed_author_url || undefined,
      });
    }

    // Footer
    if (cfg.embed_footer_text) {
      embed.setFooter({
        text   : replaceVariables(cfg.embed_footer_text, member).slice(0, 2048),
        iconURL: cfg.embed_footer_icon || undefined,
      });
    }

    if (cfg.embed_timestamp) embed.setTimestamp();

    // Champs personnalisés
    const fields = getFields(member.guild.id);
    for (const f of fields.slice(0, 25)) {
      embed.addFields({
        name  : replaceVariables(f.name, member).slice(0, 256),
        value : replaceVariables(f.value, member).slice(0, 1024),
        inline: !!f.inline,
      });
    }

    payload.embeds = [embed];
  }

  return payload;
}

module.exports = {
  getWelcomeConfig, ensureWelcomeConfig, updateWelcomeConfig,
  getFields, addField, updateField, removeField,
  validateImageUrl, validateColor, replaceVariables,
  buildWelcomeMessage,
};
