'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, ensureGuild, getGuildSettings } = require('../database');

module.exports = {
  name : 'messageReactionAdd',

  async execute(reaction, user, client) {
    if (user.bot) return;

    // Résoudre les partials
    try {
      if (reaction.partial)         await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch { return; }

    const message = reaction.message;
    if (!message.guild) return;

    const guildId  = message.guild.id;
    ensureGuild(guildId);

    const settings = getGuildSettings(guildId);
    if (!settings?.star_enabled || !settings?.star_channel_id) return;
    if (reaction.emoji.name !== settings.star_emoji) return;
    if (message.author?.id === user.id) return; // pas d'auto-star

    // ── Vérification des permissions rôles ───────────────────────────────────
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const denyRoles  = db.prepare("SELECT role_id FROM star_role_permissions WHERE guild_id = ? AND permission = 'deny'").all(guildId);
      const allowRoles = db.prepare("SELECT role_id FROM star_role_permissions WHERE guild_id = ? AND permission = 'allow'").all(guildId);

      if (denyRoles.length  && denyRoles.some(r => member.roles.cache.has(r.role_id)))  return;
      if (allowRoles.length && !allowRoles.some(r => member.roles.cache.has(r.role_id))) return;
    }

    // ── Enregistrement de la réaction ────────────────────────────────────────
    try {
      db.prepare('INSERT OR IGNORE INTO star_reactions (guild_id, message_id, user_id) VALUES (?, ?, ?)').run(guildId, message.id, user.id);
    } catch { return; }

    const starCount = db.prepare('SELECT COUNT(*) as c FROM star_reactions WHERE guild_id = ? AND message_id = ?').get(guildId, message.id).c;

    await _syncStarboard(client, message, guildId, settings, starCount);
  },
};

// ─── Sync Starboard ───────────────────────────────────────────────────────────
async function _syncStarboard(client, message, guildId, settings, starCount) {
  const sbChannel = message.guild.channels.cache.get(settings.star_channel_id);
  if (!sbChannel) return;

  // Construire l'embed
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
    .setDescription(message.content || null)
    .addFields({ name: '📌 Source', value: `[Voir le message](${message.url})`, inline: true })
    .setFooter({ text: `#${message.channel.name}` })
    .setTimestamp(message.createdAt);

  // Première image attachée
  const img = message.attachments.find(a => a.contentType?.startsWith('image/'));
  if (img) embed.setImage(img.url);

  const content = `${settings.star_emoji} **${starCount}** <#${message.channel.id}>`;

  const entry = db.prepare('SELECT * FROM starboard_entries WHERE guild_id = ? AND original_message_id = ?').get(guildId, message.id);

  if (entry?.starboard_message_id) {
    // Mettre à jour le message existant
    try {
      const sbMsg = await sbChannel.messages.fetch(entry.starboard_message_id);
      await sbMsg.edit({ content, embeds: [embed] });
      db.prepare('UPDATE starboard_entries SET star_count = ? WHERE guild_id = ? AND original_message_id = ?').run(starCount, guildId, message.id);
    } catch {
      // Message supprimé du starboard → recréer
      await _createStarboardMsg(sbChannel, content, embed, guildId, message, starCount);
    }
  } else if (starCount >= settings.star_threshold) {
    await _createStarboardMsg(sbChannel, content, embed, guildId, message, starCount);
  }
}

async function _createStarboardMsg(sbChannel, content, embed, guildId, message, starCount) {
  try {
    const sbMsg = await sbChannel.send({ content, embeds: [embed] });
    db.prepare(`
      INSERT OR REPLACE INTO starboard_entries
        (guild_id, original_channel_id, original_message_id, starboard_message_id, author_id, star_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, message.channel.id, message.id, sbMsg.id, message.author.id, starCount);
  } catch (err) {
    console.error('[Starboard] Erreur d\'envoi:', err.message);
  }
}
