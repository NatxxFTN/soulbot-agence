'use strict';

const { AttachmentBuilder, ChannelType } = require('discord.js');
const { LEVELS } = require('../../core/permissions-levels');
const { getUserLevel } = require('../../core/permissions');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
  errorEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name        : 'exportdata',
  aliases     : ['export'],
  description : 'Exporte les données du serveur en JSON (membres, rôles, salons, config Soulbot)',
  usage       : ';exportdata',
  guildOnly   : true,

  async execute(message, args, client, db) {
    const level = getUserLevel(message.author.id, message.guild.id);
    if (level < LEVELS.OWNER) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Accès refusé',
        description: '`;exportdata` est réservé aux **Owners** (BotOwner + Owner niveau 100).',
        category: 'Innovation',
      })));
    }

    await message.channel.sendTyping().catch(() => {});

    try {
      const g = message.guild;
      await g.members.fetch().catch(() => null);

      const out = {
        exported_at: new Date().toISOString(),
        exported_by: { id: message.author.id, tag: message.author.tag },
        guild      : {
          id: g.id, name: g.name, owner_id: g.ownerId,
          member_count: g.memberCount,
          verification_level: g.verificationLevel,
          boost_tier: g.premiumTier,
        },
        members: [...g.members.cache.values()].map(m => ({
          id       : m.id,
          tag      : m.user.tag,
          bot      : m.user.bot,
          joined_at: m.joinedTimestamp,
          nickname : m.nickname,
          roles    : m.roles.cache.filter(r => r.id !== g.id).map(r => ({ id: r.id, name: r.name })),
        })),
        roles: [...g.roles.cache.values()]
          .filter(r => r.id !== g.id)
          .map(r => ({
            id       : r.id,
            name     : r.name,
            color    : r.color,
            hoist    : r.hoist,
            mentionable: r.mentionable,
            position : r.position,
            managed  : r.managed,
          })),
        channels: [...g.channels.cache.values()].map(c => ({
          id    : c.id,
          name  : c.name,
          type  : ChannelType[c.type] || c.type,
          parent: c.parentId,
          topic : c.topic || null,
          nsfw  : c.nsfw || false,
        })),
        config_soulbot: {},
      };

      const SAFE_TABLES = [
        'guild_settings', 'mod_config', 'warn_config', 'antileak_config',
        'antispam_config', 'greeting_config', 'welcome_config', 'ticket_config',
        'nuke_config', 'lockdown_config', 'raidmode_config',
      ];
      for (const tbl of SAFE_TABLES) {
        try {
          const row = db.prepare(`SELECT * FROM ${tbl} WHERE guild_id = ?`).get(g.id);
          if (row) out.config_soulbot[tbl] = row;
        } catch { /* table absente */ }
      }

      let attachment, truncated = false;
      const buf = Buffer.from(JSON.stringify(out, null, 2), 'utf8');
      if (buf.length > 22 * 1024 * 1024) {
        const shrunk = { ...out, members: out.members.slice(0, 1000), _truncated: { members: out.members.length - 1000 } };
        const smallBuf = Buffer.from(JSON.stringify(shrunk, null, 2), 'utf8');
        attachment = new AttachmentBuilder(smallBuf, { name: `export-${g.id}-truncated.json` });
        truncated = true;
      } else {
        attachment = new AttachmentBuilder(buf, { name: `export-${g.id}-${Date.now()}.json` });
      }

      // Panel V2 résumé
      const container = newContainer();
      buildHeader(container, {
        emojiKey : 'btn_calendar',
        title    : 'Export de données serveur',
        subtitle : `**${g.name}** · <t:${Math.floor(Date.now() / 1000)}:F>`,
      });

      container.addTextDisplayComponents(
        text(
          `## Contenu\n` +
          `• 👥 **Membres :** ${out.members.length}${truncated ? ' *(tronqué à 1000)*' : ''}\n` +
          `• 📜 **Rôles :** ${out.roles.length}\n` +
          `• 📂 **Salons :** ${out.channels.length}\n` +
          `• ⚙️ **Tables Soulbot exportées :** ${Object.keys(out.config_soulbot).length}`,
        ),
      );
      container.addSeparatorComponents(separator('Small'));

      const size = buf.length / 1024;
      const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)} Mo` : `${size.toFixed(1)} Ko`;
      container.addTextDisplayComponents(
        text(
          `## Fichier\n` +
          `• 💾 **Taille :** ${sizeStr}\n` +
          `• 📄 **Format :** JSON\n` +
          (truncated ? `• ⚠️ **Tronqué :** oui (limite Discord 25 Mo)\n` : ''),
        ),
      );

      container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Export v1.0 · Owner-only`));

      return message.reply({
        ...toV2Payload(container),
        files: [attachment],
      });
    } catch (err) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Échec de l\'export',
        description: err.message,
        category: 'Innovation',
      })));
    }
  },
};
