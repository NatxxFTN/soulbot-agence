'use strict';

const { db } = require('../database');

// ─── Presets couleurs ────────────────────────────────────────────────────────

const COLOR_PRESETS = {
  'orange' : '#FF0000',
  'red'    : '#E74C3C',
  'green'  : '#27AE60',
  'blue'   : '#3498DB',
  'purple' : '#9B59B6',
  'pink'   : '#FF69B4',
  'yellow' : '#F1C40F',
  'cyan'   : '#00CED1',
  'white'  : '#FFFFFF',
  'black'  : '#2C2F33',
};

// ─── Presets config ──────────────────────────────────────────────────────────

const CONFIG_PRESETS = {
  modern: {
    mode              : 'embed',
    embed_title       : '👋 Bienvenue {user} !',
    embed_description : 'Salut {mention}, tu es le **{membercount_ordinal}** membre de **{server}** !\n\nN\'hésite pas à te présenter.',
    embed_color       : '#FF0000',
    embed_thumbnail_source: 'user_avatar',
    embed_footer_text : 'Membre depuis {joined_at}',
    embed_timestamp   : 1,
    mention_user      : 1,
  },
  gaming: {
    mode              : 'embed',
    embed_title       : '🎮 NEW PLAYER JOINED',
    embed_description : '```diff\n+ {user} a rejoint la partie !\n```\n**Level :** 1\n**Membre #** {membercount}',
    embed_color       : '#9B59B6',
    embed_image_source: 'user_avatar',
    embed_footer_text : '{server} • Press F to welcome',
    mention_user      : 0,
  },
  minimal: {
    mode         : 'text',
    text_content : '👋 Bienvenue {mention} sur **{server}** !',
    mention_user : 1,
  },
  festive: {
    mode              : 'embed',
    embed_title       : '🎊🎉 FÊTE ! 🎉🎊',
    embed_description : '**{user}** vient d\'arriver ! 🥳\n\nOn est maintenant **{membercount}** à faire la fête !',
    embed_color       : '#FF69B4',
    embed_thumbnail_source: 'user_avatar',
    embed_timestamp   : 1,
    mention_user      : 1,
  },
};

// ─── CRUD config ─────────────────────────────────────────────────────────────

function getWelcomeConfig(guildId) {
  return db.prepare('SELECT * FROM welcome_config WHERE guild_id = ?').get(guildId);
}

function updateWelcomeConfig(guildId, updates, updatedBy = null) {
  const existing = getWelcomeConfig(guildId);
  if (!existing) {
    db.prepare('INSERT INTO welcome_config (guild_id, updated_at, updated_by) VALUES (?, ?, ?)')
      .run(guildId, Date.now(), updatedBy);
  }
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE welcome_config SET ${setClause}, updated_at = ?, updated_by = ? WHERE guild_id = ?`)
    .run(...keys.map(k => updates[k]), Date.now(), updatedBy, guildId);
}

function resetWelcomeConfig(guildId) {
  db.prepare('DELETE FROM welcome_config WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM welcome_fields WHERE guild_id = ?').run(guildId);
  db.prepare('DELETE FROM welcome_auto_roles WHERE guild_id = ?').run(guildId);
}

function applyPreset(guildId, presetName, updatedBy) {
  const preset = CONFIG_PRESETS[presetName];
  if (!preset) throw new Error(`Preset inconnu : ${presetName}`);
  updateWelcomeConfig(guildId, preset, updatedBy);
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

function moveField(id, direction) {
  const field = db.prepare('SELECT * FROM welcome_fields WHERE id = ?').get(id);
  if (!field) return;
  const delta  = direction === 'up' ? -1 : 1;
  const target = field.field_order + delta;
  const swap   = db.prepare('SELECT * FROM welcome_fields WHERE guild_id = ? AND field_order = ?').get(field.guild_id, target);
  if (swap) db.prepare('UPDATE welcome_fields SET field_order = ? WHERE id = ?').run(field.field_order, swap.id);
  db.prepare('UPDATE welcome_fields SET field_order = ? WHERE id = ?').run(target, id);
}

// ─── Rôles auto multiples ────────────────────────────────────────────────────

function getAutoRoles(guildId) {
  return db.prepare('SELECT * FROM welcome_auto_roles WHERE guild_id = ? ORDER BY id ASC').all(guildId);
}

function addAutoRole(guildId, roleId) {
  const existing = getAutoRoles(guildId);
  if (existing.length >= 5) throw new Error('Maximum 5 rôles auto');
  db.prepare('INSERT OR IGNORE INTO welcome_auto_roles (guild_id, role_id, created_at) VALUES (?, ?, ?)')
    .run(guildId, roleId, Date.now());
}

function removeAutoRole(guildId, roleId) {
  db.prepare('DELETE FROM welcome_auto_roles WHERE guild_id = ? AND role_id = ?').run(guildId, roleId);
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function logWelcome(guildId, userId, userTag, accountAgeDays, dmSent) {
  db.prepare('INSERT INTO welcome_stats (guild_id, user_id, user_tag, triggered_at, account_age_days, dm_sent) VALUES (?, ?, ?, ?, ?, ?)')
    .run(guildId, userId, userTag, Date.now(), accountAgeDays, dmSent ? 1 : 0);
}

function getStats(guildId) {
  const total    = db.prepare('SELECT COUNT(*) as c FROM welcome_stats WHERE guild_id = ?').get(guildId)?.c || 0;
  const last     = db.prepare('SELECT * FROM welcome_stats WHERE guild_id = ? ORDER BY triggered_at DESC LIMIT 1').get(guildId);
  const last30   = db.prepare('SELECT COUNT(*) as c FROM welcome_stats WHERE guild_id = ? AND triggered_at > ?').get(guildId, Date.now() - 30 * 86400000)?.c || 0;
  return { total, last, last30 };
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateImageUrl(url) {
  if (!url || url === '') return { valid: true, url: null };
  if (['user_avatar', 'server_icon', 'user_banner'].includes(url)) return { valid: true, url };
  if (url.length > 2048) return { valid: false, error: 'URL trop longue (max 2048)' };
  try {
    const p = new URL(url);
    if (!['http:', 'https:'].includes(p.protocol)) return { valid: false, error: 'Seul http:// ou https://' };
    return { valid: true, url };
  } catch {
    return { valid: false, error: 'URL invalide' };
  }
}

function validateColor(color) {
  if (!color) return { valid: true, color: '#FF0000' };
  if (color === 'random') return { valid: true, color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0') };
  if (COLOR_PRESETS[color]) return { valid: true, color: COLOR_PRESETS[color] };
  const hex = color.trim().startsWith('#') ? color.trim() : `#${color.trim()}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return { valid: false, error: 'Format hex invalide (ex: #FF0000)' };
  return { valid: true, color: hex };
}

// ─── Variables dynamiques ────────────────────────────────────────────────────

function replaceVariables(text, member) {
  if (!text) return text;
  const guild   = member.guild;
  const ageDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
  const n       = guild.memberCount;
  const ordinal = `${n}${n === 1 ? 'er' : 'ème'}`;

  const vars = {
    '{user}'              : member.user.username,
    '{mention}'           : `<@${member.id}>`,
    '{username}'          : member.user.username,
    '{tag}'               : member.user.tag,
    '{id}'                : member.id,
    '{displayname}'       : member.displayName,
    '{server}'            : guild.name,
    '{servername}'        : guild.name,
    '{serverid}'          : guild.id,
    '{membercount}'       : String(n),
    '{membercount_ordinal}': ordinal,
    '{account_age}'       : `${ageDays} jour${ageDays > 1 ? 's' : ''}`,
    '{account_age_days}'  : String(ageDays),
    '{account_created}'   : new Date(member.user.createdTimestamp).toLocaleDateString('fr-FR'),
    '{joined_at}'         : new Date().toLocaleDateString('fr-FR'),
    '{avatar_url}'        : member.user.displayAvatarURL({ size: 512 }),
    '{server_icon}'       : guild.iconURL({ size: 512 }) || '',
    '{random_color}'      : '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
  };

  let result = text;
  for (const [k, v] of Object.entries(vars)) result = result.split(k).join(v);
  return result;
}

// ─── Résolution source image ─────────────────────────────────────────────────

function resolveImageSource(source, url, member) {
  if (source === 'user_avatar')  return member.user.displayAvatarURL({ size: 512 });
  if (source === 'server_icon')  return member.guild.iconURL({ size: 512 }) || null;
  if (source === 'user_banner')  return member.user.bannerURL?.({ size: 512 }) || null;
  if (source === 'none')         return null;
  return url || null;
}

// ─── Condition de déclenchement ──────────────────────────────────────────────

function shouldTriggerWelcome(cfg, member) {
  if (!cfg || !cfg.enabled)   return { trigger: false, reason: 'disabled' };
  if (!cfg.channel_id)        return { trigger: false, reason: 'no_channel' };
  if (cfg.ignore_bots && member.user.bot) return { trigger: false, reason: 'is_bot' };

  if (cfg.min_account_age_days > 0) {
    const days = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
    if (days < cfg.min_account_age_days) return { trigger: false, reason: 'account_too_young' };
  }

  if (cfg.require_role_id && !member.roles.cache.has(cfg.require_role_id)) {
    return { trigger: false, reason: 'missing_required_role' };
  }

  if (cfg.active_hours_start >= 0 && cfg.active_hours_end >= 0) {
    const h = new Date().getHours();
    const s = cfg.active_hours_start;
    const e = cfg.active_hours_end;
    const outside = s < e ? (h < s || h >= e) : (h >= e && h < s);
    if (outside) return { trigger: false, reason: 'outside_hours' };
  }

  if (cfg.active_weekdays) {
    const days = cfg.active_weekdays.split(',').map(Number);
    if (!days.includes(new Date().getDay())) return { trigger: false, reason: 'outside_weekdays' };
  }

  return { trigger: true };
}

// ─── Build message welcome ───────────────────────────────────────────────────

function buildWelcomeMessage(cfg, member) {
  const { EmbedBuilder } = require('discord.js');
  const payload = {};

  if ((cfg.mode === 'text' || cfg.mode === 'both') && cfg.text_content) {
    payload.content = replaceVariables(cfg.text_content, member);
  }

  if (cfg.mode === 'embed' || cfg.mode === 'both' || cfg.mode === 'image') {
    const embed = new EmbedBuilder();
    const color = validateColor(cfg.embed_color).color || '#FF0000';
    embed.setColor(color);

    if (cfg.embed_title) {
      embed.setTitle(replaceVariables(cfg.embed_title, member).slice(0, 256));
      if (cfg.embed_title_url) embed.setURL(cfg.embed_title_url);
    }
    if (cfg.embed_description) {
      embed.setDescription(replaceVariables(cfg.embed_description, member).slice(0, 4096));
    }

    const thumb = resolveImageSource(cfg.embed_thumbnail_source, cfg.embed_thumbnail_url, member);
    if (thumb) embed.setThumbnail(thumb);

    const img = resolveImageSource(cfg.embed_image_source, cfg.embed_image_url, member);
    if (img) embed.setImage(img);

    if (cfg.embed_author_name) {
      const icon = resolveImageSource(cfg.embed_author_icon_source, cfg.embed_author_icon, member);
      embed.setAuthor({
        name   : replaceVariables(cfg.embed_author_name, member).slice(0, 256),
        iconURL: icon || undefined,
        url    : cfg.embed_author_url || undefined,
      });
    }

    if (cfg.embed_footer_text) {
      const icon = resolveImageSource(cfg.embed_footer_icon_source, cfg.embed_footer_icon, member);
      embed.setFooter({
        text   : replaceVariables(cfg.embed_footer_text, member).slice(0, 2048),
        iconURL: icon || undefined,
      });
    }

    if (cfg.embed_timestamp) embed.setTimestamp();

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
  COLOR_PRESETS, CONFIG_PRESETS,
  getWelcomeConfig, updateWelcomeConfig, resetWelcomeConfig, applyPreset,
  getFields, addField, updateField, removeField, moveField,
  getAutoRoles, addAutoRole, removeAutoRole,
  logWelcome, getStats,
  validateImageUrl, validateColor,
  replaceVariables, resolveImageSource,
  shouldTriggerWelcome, buildWelcomeMessage,
};
