'use strict';

const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  name        : 'rolesync',
  aliases     : ['syncroles', 'rolecopy'],
  description : 'Synchronise les rôles entre 2 membres (même serveur) ou depuis un autre serveur (par nom)',
  usage       : ';rolesync <@source> <@target>  |  ;rolesync <@target> from <guildId> <@user>',
  guildOnly   : true,
  permissions : ['ManageRoles'],

  async execute(message, args, client) {
    if (args.length < 2) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description:
          '`;rolesync <@source> <@target>` — copie rôles source → target\n' +
          '`;rolesync <@target> from <guildId> <@user>` — cross-serveur par nom',
        category: 'Innovation',
      })));
    }

    const mode = args[1]?.toLowerCase() === 'from' ? 'cross' : 'same';
    const me = message.guild.members.me;
    if (!me) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Erreur interne',
        description: 'Bot introuvable dans le cache — retente dans quelques secondes.',
        category: 'Innovation',
      })));
    }
    const botTop = me.roles.highest.position;

    await message.channel.sendTyping().catch(() => {});

    // ── Mode SAME ─────────────────────────────────────────────────────
    if (mode === 'same') {
      const sourceId = args[0].match(/^<@!?(\d+)>$/)?.[1] || args[0].match(/^\d{17,20}$/)?.[0];
      const targetId = args[1].match(/^<@!?(\d+)>$/)?.[1] || args[1].match(/^\d{17,20}$/)?.[0];
      if (!sourceId || !targetId) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Mentions invalides',
          description: 'Les deux arguments doivent être des mentions ou IDs.',
          category: 'Innovation',
        })));
      }

      const source = await message.guild.members.fetch(sourceId).catch(() => null);
      const target = await message.guild.members.fetch(targetId).catch(() => null);
      if (!source || !target) {
        return message.reply(toEmbedReply(errorEmbed({
          title: 'Membre(s) introuvable(s)',
          description: 'Au moins un des deux membres n\'est pas sur le serveur.',
          category: 'Innovation',
        })));
      }

      const toAdd = source.roles.cache.filter(r =>
        r.id !== message.guild.id && !r.managed && r.position < botTop && !target.roles.cache.has(r.id),
      );

      let ok = 0, failed = 0;
      for (const r of toAdd.values()) {
        try { await target.roles.add(r, `[rolesync] par ${message.author.tag}`); ok++; await sleep(350); }
        catch { failed++; }
      }

      return message.reply(toEmbedReply(successEmbed({
        title       : 'Sync terminée',
        description : `<@${sourceId}> → <@${targetId}>`,
        fields      : [
          { name: '✅ Ajoutés',    value: `${ok}`,      inline: true },
          { name: '❌ Échecs',     value: `${failed}`,  inline: true },
          { name: '📊 Total tenté', value: `${toAdd.size}`, inline: true },
          { name: '👤 Par',        value: message.author.tag, inline: true },
        ],
        user        : message.author,
        category    : 'Innovation',
      })));
    }

    // ── Mode CROSS ────────────────────────────────────────────────────
    const targetId = args[0].match(/^<@!?(\d+)>$/)?.[1] || args[0].match(/^\d{17,20}$/)?.[0];
    const srcGuildId = args[2];
    const srcUserRaw = args[3];
    if (!targetId || !srcGuildId || !srcUserRaw) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage cross-serveur',
        description: '`;rolesync <@target> from <guildId> <@user>`',
        category: 'Innovation',
      })));
    }
    const srcUserId = srcUserRaw.match(/^<@!?(\d+)>$/)?.[1] || srcUserRaw.match(/^\d{17,20}$/)?.[0];
    if (!srcUserId) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Utilisateur source invalide',
        description: 'Mentionne l\'utilisateur source ou fournis son ID.',
        category: 'Innovation',
      })));
    }

    const srcGuild = client.guilds.cache.get(srcGuildId);
    if (!srcGuild) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Serveur source inaccessible',
        description: `Le bot n'est pas dans le serveur \`${srcGuildId}\`.`,
        category: 'Innovation',
      })));
    }

    const srcMember = await srcGuild.members.fetch(srcUserId).catch(() => null);
    const target    = await message.guild.members.fetch(targetId).catch(() => null);
    if (!srcMember || !target) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Membre(s) introuvable(s)',
        description: 'Au moins un des membres est inaccessible.',
        category: 'Innovation',
      })));
    }

    const localRolesByName = new Map();
    for (const r of message.guild.roles.cache.values()) {
      if (r.id === message.guild.id || r.managed) continue;
      localRolesByName.set(r.name.toLowerCase(), r);
    }

    let ok = 0, failed = 0, skipped = 0;
    for (const r of srcMember.roles.cache.values()) {
      if (r.id === srcGuild.id || r.managed) continue;
      const local = localRolesByName.get(r.name.toLowerCase());
      if (!local) { skipped++; continue; }
      if (local.position >= botTop) { failed++; continue; }
      if (target.roles.cache.has(local.id)) continue;
      try { await target.roles.add(local, `[rolesync cross] par ${message.author.tag}`); ok++; await sleep(350); }
      catch { failed++; }
    }

    return message.reply(toEmbedReply(successEmbed({
      title       : 'Cross-sync terminée',
      description : `**${srcGuild.name}** → **${message.guild.name}**`,
      fields      : [
        { name: '✅ Ajoutés',             value: `${ok}`,      inline: true },
        { name: '⚠️ Skippés (nom inconnu)', value: `${skipped}`, inline: true },
        { name: '❌ Échecs',              value: `${failed}`,  inline: true },
        { name: '👤 Par',                 value: message.author.tag, inline: false },
      ],
      user        : message.author,
      category    : 'Innovation',
    })));
  },
};
