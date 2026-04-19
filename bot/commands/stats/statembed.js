'use strict';

const { EmbedBuilder } = require('discord.js');
const { db, getGuildSettings, setGuildSetting } = require('../../database');
const { formatDuration, formatNumber }           = require('../../utils/format');
const E = require('../../utils/embeds');

/*
 * ;statembed                — Afficher/rafraîchir le live embed
 * ;statembed set #salon     — Définir le salon du live embed
 * ;statembed refresh        — Rafraîchir manuellement
 * ;statembed remove         — Désactiver le live embed
 *
 * Le bot met à jour cet embed toutes les 10 minutes via setInterval (ready.js).
 * Ici on expose aussi la commande manuelle de refresh.
 */

module.exports = {
  name        : 'statembed',
  aliases     : ['livstats', 'livestat'],
  description : 'Embed de statistiques en direct dans un salon.',
  usage       : 'statembed [set #salon | refresh | remove]',
  cooldown    : 5,
  guildOnly  : true,
  permissions : ['ManageGuild'],

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const action  = (args[0] ?? 'refresh').toLowerCase();
    const settings = getGuildSettings(guildId);

    // ── ;statembed set #salon ─────────────────────────────────────────────────
    if (action === 'set') {
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply({ embeds: [E.usage(';', 'statembed set #salon', '')] });

      // Poster l'embed initial
      const embed = await buildStatEmbed(message.guild, client, db);
      const posted = await channel.send({ embeds: [embed] });

      setGuildSetting(guildId, 'statembed_channel_id', channel.id);
      setGuildSetting(guildId, 'statembed_message_id', posted.id);

      // Démarrer le refresh périodique pour cette guilde
      startLiveUpdate(client, guildId, 10 * 60 * 1000); // 10 min

      return message.reply({ embeds: [E.success('StatEmbed configuré', `L'embed live est maintenant dans ${channel}. Il se rafraîchit toutes les 10 minutes.`)] });
    }

    // ── ;statembed refresh ────────────────────────────────────────────────────
    if (action === 'refresh') {
      if (!settings.statembed_channel_id || !settings.statembed_message_id) {
        return message.reply({ embeds: [E.error('Non configuré', 'Aucun StatEmbed actif. Utilise `;statembed set #salon`.') ]});
      }

      const updated = await updateStatEmbed(client, guildId, settings);
      return message.reply({ embeds: [updated ? E.success('Rafraîchi', 'L\'embed a été mis à jour.') : E.error('Erreur', 'Impossible de trouver le message. Reconfigure avec `;statembed set #salon`.')] });
    }

    // ── ;statembed remove ─────────────────────────────────────────────────────
    if (action === 'remove' || action === 'delete' || action === 'off') {
      // Tenter de supprimer le message
      if (settings.statembed_channel_id && settings.statembed_message_id) {
        try {
          const chan = client.channels.cache.get(settings.statembed_channel_id);
          const msg  = chan ? await chan.messages.fetch(settings.statembed_message_id) : null;
          if (msg) await msg.delete();
        } catch {}
      }

      setGuildSetting(guildId, 'statembed_channel_id', null);
      setGuildSetting(guildId, 'statembed_message_id', null);
      return message.reply({ embeds: [E.success('StatEmbed supprimé', 'L\'embed live a été désactivé.')] });
    }

    // Afficher le statut actuel
    const chan = settings.statembed_channel_id ? `<#${settings.statembed_channel_id}>` : '*Non défini*';
    return message.reply({
      embeds: [E.info('StatEmbed', `Salon actuel : ${chan}\n\nCommandes :\n• \`;statembed set #salon\`\n• \`;statembed refresh\`\n• \`;statembed remove\``)]
    });
  },
};

// ─── Construire l'embed de stats ──────────────────────────────────────────────
async function buildStatEmbed(guild, client, db) {
  const guildId = guild.id;

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(messages),      0) AS msgs,
      COALESCE(SUM(voice_seconds), 0) AS voice,
      COUNT(DISTINCT user_id)         AS users
    FROM user_stats WHERE guild_id = ?
  `).get(guildId);

  const topMsg = db.prepare('SELECT user_id, messages FROM user_stats WHERE guild_id = ? ORDER BY messages DESC LIMIT 3').all(guildId);
  const topVoc = db.prepare('SELECT user_id, voice_seconds FROM user_stats WHERE guild_id = ? ORDER BY voice_seconds DESC LIMIT 3').all(guildId);
  const active = db.prepare('SELECT COUNT(*) AS c FROM voice_sessions WHERE guild_id = ?').get(guildId).c;

  const formatTop = async (rows, field, isVoice) => {
    const lines = await Promise.all(rows.map(async (r, i) => {
      const u    = await client.users.fetch(r.user_id).catch(() => null);
      const name = u ? u.username : 'Inconnu';
      const val  = isVoice ? formatDuration(r.voice_seconds) : formatNumber(r.messages);
      return `${i + 1}. **${name}** — ${val}`;
    }));
    return lines.join('\n') || '*—*';
  };

  return new EmbedBuilder()
    .setColor(E.COLORS.PRIMARY)
    .setTitle(`📊  Live Stats — ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: '👥 Membres',           value: formatNumber(guild.memberCount),   inline: true },
      { name: '🎙️ En vocal maintenant', value: `${active}`,                     inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '💬 Messages totaux',   value: formatNumber(totals.msgs),          inline: true },
      { name: '🎙️ Vocal total',       value: formatDuration(totals.voice),       inline: true },
      { name: '👤 Utilisateurs actifs', value: formatNumber(totals.users),       inline: true },
      { name: '🏆 Top messages',       value: await formatTop(topMsg, 'messages', false), inline: true },
      { name: '🏆 Top vocal',          value: await formatTop(topVoc, 'voice_seconds', true), inline: true },
    )
    .setFooter({ text: `Mis à jour le` })
    .setTimestamp();
}

// ─── Mettre à jour un embed existant ──────────────────────────────────────────
async function updateStatEmbed(client, guildId, settings) {
  try {
    const chan = client.channels.cache.get(settings.statembed_channel_id);
    if (!chan) return false;

    const msg = await chan.messages.fetch(settings.statembed_message_id);
    if (!msg) return false;

    const guild = client.guilds.cache.get(guildId);
    const embed = await buildStatEmbed(guild, client, db);
    await msg.edit({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}

// ─── Boucle de mise à jour périodique ────────────────────────────────────────
const _liveIntervals = new Map(); // guildId → intervalId

function startLiveUpdate(client, guildId, intervalMs = 10 * 60 * 1000) {
  // Éviter les doublons
  if (_liveIntervals.has(guildId)) {
    clearInterval(_liveIntervals.get(guildId));
  }

  const id = setInterval(async () => {
    const settings = require('../../database').getGuildSettings(guildId);
    if (!settings?.statembed_channel_id || !settings?.statembed_message_id) {
      clearInterval(id);
      _liveIntervals.delete(guildId);
      return;
    }
    await updateStatEmbed(client, guildId, settings);
  }, intervalMs);

  _liveIntervals.set(guildId, id);
}

// Exposer pour ready.js (démarrer les live embeds au démarrage)
module.exports.startLiveUpdate = startLiveUpdate;
module.exports.updateStatEmbed = updateStatEmbed;
