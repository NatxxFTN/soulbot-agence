'use strict';

// ── ;softmute — invisibilise un membre (ne voit plus rien, n'écrit plus) ─────
// Crée/réutilise le rôle "Soulbot-Soft-Muted" avec deny View/Send/Speak sur
// tous les salons. Les rôles d'origine sont sauvegardés dans softmute_history
// pour restauration exacte via ;unsoftmute.
// LIMITE connue : une durée programmée (setTimeout) ne survit PAS à un restart
// du bot — ;unsoftmute reste toujours disponible en manuel.

const { PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, logLine } = require('../../utils/response-builder');
const { db } = require('../../database');
const storage = require('../../core/security-storage');

const MUTED_ROLE_NAME = 'Soulbot-Soft-Muted';

const _insert = db.prepare(`
  INSERT INTO softmute_history (guild_id, user_id, previous_roles, reason, moderator, duration)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const _active = db.prepare(`
  SELECT * FROM softmute_history WHERE guild_id = ? AND user_id = ? AND ended_at IS NULL
  ORDER BY id DESC LIMIT 1
`);

function parseDuration(raw) {
  const m = /^(\d+)\s*(m|h|d|j)$/i.exec((raw || '').trim());
  if (!m) return null;
  const mult = { m: 60_000, h: 3_600_000, d: 86_400_000, j: 86_400_000 };
  return Number(m[1]) * mult[m[2].toLowerCase()];
}

async function ensureMutedRole(guild) {
  let role = guild.roles.cache.find(r => r.name === MUTED_ROLE_NAME);
  if (role) return role;

  role = await guild.roles.create({
    name: MUTED_ROLE_NAME, color: 0x000000, permissions: [],
    reason: 'Création auto par ;softmute',
  });
  for (const channel of guild.channels.cache.values()) {
    if (!channel.permissionOverwrites?.create) continue;
    await channel.permissionOverwrites.create(role, {
      ViewChannel: false, SendMessages: false, AddReactions: false,
      Speak: false, Connect: false,
    }).catch(() => { /* salon géré par une intégration */ });
  }
  return role;
}

module.exports = {
  name       : 'softmute',
  aliases    : ['smute', 'invisibilise'],
  category   : 'moderation',
  description: 'Invisibilise un membre : il ne voit plus aucun salon, sans kick ni ban.',
  usage      : ';softmute @user <raison...> [durée: 30m|2h|1d]',
  cooldown   : 5,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [PermissionFlagsBits.ModerateMembers],
  ensureMutedRole, // réutilisé par ;unsoftmute

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Permission **Modérer les membres** requise.')] });
    }

    const targetId = (args[0] ?? '').replace(/[<@!>]/g, '');
    if (!/^\d{15,20}$/.test(targetId)) {
      return message.reply({ embeds: [errorEmbed('Usage', this.usage)] });
    }
    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (!member) return message.reply({ embeds: [errorEmbed('Introuvable', 'Ce membre n\'est pas sur le serveur.')] });
    if (member.id === message.author.id) return message.reply({ embeds: [errorEmbed('Refusé', 'Tu ne peux pas te softmute toi-même.')] });
    if (!member.manageable) {
      return message.reply({ embeds: [errorEmbed('Hiérarchie', 'Mon rôle est trop bas pour gérer ce membre.')] });
    }
    if (_active.get(message.guild.id, member.id)) {
      return message.reply({ embeds: [errorEmbed('Déjà softmuté', `Utilise \`;unsoftmute @${member.user.username}\` d'abord.`)] });
    }

    // Durée = dernier arg si parsable, le reste = raison
    let durationMs = null, durationLabel = 'permanent';
    const maybeDuration = args[args.length - 1];
    if (args.length > 1 && parseDuration(maybeDuration)) {
      durationMs = parseDuration(maybeDuration);
      durationLabel = maybeDuration;
      args = args.slice(0, -1);
    }
    const reason = args.slice(1).join(' ').trim() || 'Aucune raison fournie';

    const mutedRole = await ensureMutedRole(message.guild);
    const previousRoles = member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.id);

    _insert.run(message.guild.id, member.id, JSON.stringify(previousRoles), reason, message.author.id, durationLabel);
    await member.roles.set([mutedRole.id], `Softmute par ${message.author.tag} : ${reason}`);
    storage.logAction(message.guild.id, member.id, 'softmute', durationLabel, reason, message.channel.id);

    if (durationMs) {
      const guildId = message.guild.id, userId = member.id;
      setTimeout(async () => {
        try {
          const row = _active.get(guildId, userId);
          if (!row) return; // déjà unsoftmute manuellement
          const guild = message.client.guilds.cache.get(guildId);
          const m = await guild?.members.fetch(userId).catch(() => null);
          if (m) await m.roles.set(JSON.parse(row.previous_roles || '[]'), 'Fin de softmute (durée écoulée)');
          db.prepare('UPDATE softmute_history SET ended_at = unixepoch() WHERE id = ?').run(row.id);
        } catch { /* membre parti */ }
      }, durationMs).unref?.();
    }

    await message.reply({
      embeds: [successEmbed('Softmute appliqué',
        `<@${member.id}> est **invisibilisé** — il ne voit plus aucun salon.\n` +
        `**Durée :** ${durationLabel}\n**Raison :** ${reason}\n` +
        `Restauration : \`;unsoftmute @user\` (rôles d'origine sauvegardés).`)],
      allowedMentions: { parse: [] },
    });

    console.log(logLine('SOFTMUTE', message.author.tag, `${member.user.tag} | ${durationLabel} | ${reason}`));
  },
};
