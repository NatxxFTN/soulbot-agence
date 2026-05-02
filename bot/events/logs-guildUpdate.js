'use strict';

const { AuditLogEvent } = require('discord.js');
const L = require('../core/logs-v3-helper');

module.exports = {
  name : 'guildUpdate',

  async execute(oldGuild, newGuild) {
    const diffs = [];
    if (oldGuild.name !== newGuild.name) diffs.push(`**Nom** : \`${oldGuild.name}\` → \`${newGuild.name}\``);
    if (oldGuild.iconURL?.() !== newGuild.iconURL?.()) diffs.push(`**Icône** : modifiée`);
    if (oldGuild.bannerURL?.() !== newGuild.bannerURL?.()) diffs.push(`**Bannière** : modifiée`);
    if (oldGuild.description !== newGuild.description) diffs.push(`**Description** : modifiée`);
    if (oldGuild.ownerId !== newGuild.ownerId) diffs.push(`**Propriétaire** : <@${oldGuild.ownerId}> → <@${newGuild.ownerId}>`);
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) diffs.push(`**Niveau vérification** : ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) diffs.push(`**Salon AFK** : ${oldGuild.afkChannelId ? `<#${oldGuild.afkChannelId}>` : '_(aucun)_'} → ${newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : '_(aucun)_'}`);
    if (oldGuild.systemChannelId !== newGuild.systemChannelId) diffs.push(`**Salon système** : ${oldGuild.systemChannelId ? `<#${oldGuild.systemChannelId}>` : '_(aucun)_'} → ${newGuild.systemChannelId ? `<#${newGuild.systemChannelId}>` : '_(aucun)_'}`);

    if (!diffs.length) return;

    let executor = null;
    try {
      const audit = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 });
      const entry = audit.entries.first();
      if (entry && Date.now() - entry.createdTimestamp < 10_000) executor = entry.executor;
    } catch { /* perms */ }

    L.log(newGuild, 'server_update', {
      diffs,
      executor,
      summary: `Serveur modifié`,
      actorId: executor?.id || null,
    });
  },
};
