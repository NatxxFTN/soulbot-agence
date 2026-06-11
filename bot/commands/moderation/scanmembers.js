'use strict';

// ── ;scanmembers — analyse heuristique des membres suspects ──────────────────
// Score 0-100 par membre : âge du compte, avatar, pattern de pseudo, activité
// (user_stats), absence de rôles, flags Discord (Spammer/Quarantined).
// Actions de masse (ban/kick) protégées par DOUBLE confirmation.

const {
  PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder, MessageFlags,
} = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed, infoEmbed } = require('../../utils/response-builder');
const { scrollablePanel } = require('../../utils/panels-v4');
const { db } = require('../../database');
const storage = require('../../core/security-storage');

const _msgCount = db.prepare('SELECT messages FROM user_stats WHERE guild_id = ? AND user_id = ?');

const DAY = 24 * 60 * 60 * 1000;
const PER_PAGE = 5;

function scoreMember(member, guildId) {
  let score = 0;
  const reasons = [];

  const daysOld = Math.floor((Date.now() - member.user.createdTimestamp) / DAY);
  if (daysOld < 7)       { score += 30; reasons.push(`Compte récent (${daysOld}j)`); }
  else if (daysOld < 30) { score += 15; reasons.push(`Compte jeune (${daysOld}j)`); }

  if (!member.user.avatar) { score += 10; reasons.push('Pas d\'avatar'); }

  const username = member.user.username;
  if (/^[a-z]+\d{4,}$/i.test(username) || /^user\d+$/i.test(username)) {
    score += 15; reasons.push('Pseudo généré');
  }

  const daysSinceJoin = member.joinedTimestamp ? Math.floor((Date.now() - member.joinedTimestamp) / DAY) : 0;
  const msgCount = _msgCount.get(guildId, member.id)?.messages ?? 0;
  if (daysSinceJoin > 14 && msgCount === 0) {
    score += 25; reasons.push(`0 message en ${daysSinceJoin}j`);
  }

  if (member.roles.cache.size === 1) { score += 10; reasons.push('Aucun rôle'); }

  const flags = member.user.flags?.toArray() ?? [];
  if (flags.includes('Spammer') || flags.includes('Quarantined')) {
    score += 50; reasons.push(`Flag Discord : ${flags.join(', ')}`);
  }

  return { score: Math.min(100, score), reasons, daysOld, msgCount };
}

function renderPage(suspicious, page, threshold) {
  const items = suspicious.map(s =>
    `**${s.member.user.tag}** — Score **${s.score}/100**\n` +
    `-# <@${s.member.id}> · compte ${s.daysOld}j · ${s.msgCount} msg · ${s.reasons.join(' · ')}`,
  );
  const payload = scrollablePanel({
    title: `Scan membres — ${suspicious.length} suspect(s) (seuil ${threshold})`,
    items, itemsPerPage: PER_PAGE, currentPage: page, navAction: 'scanm:page',
  });
  payload.components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('scanm:export').setLabel('Exporter CSV').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('scanm:kick').setLabel(`Kick les ${suspicious.length}`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('scanm:ban').setLabel(`Ban les ${suspicious.length}`).setStyle(ButtonStyle.Danger),
  ));
  return payload;
}

module.exports = {
  name       : 'scanmembers',
  aliases    : ['scanm', 'membersscan'],
  category   : 'moderation',
  description: 'Analyse tous les membres et liste les comptes suspects (score 0-100).',
  usage      : ';scanmembers [seuil 0-100, défaut 50]',
  cooldown   : 30,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [PermissionFlagsBits.ModerateMembers],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply({ embeds: [errorEmbed('Accès refusé', 'Permission **Modérer les membres** requise.')] });
    }

    const threshold = Math.min(100, Math.max(0, parseInt(args[0], 10) || 50));
    const progress = await message.reply({ embeds: [infoEmbed('Scan en cours…', 'Récupération et analyse des membres.')] });

    const members = await message.guild.members.fetch();
    const suspicious = [];
    for (const member of members.values()) {
      if (member.user.bot) continue;
      const res = scoreMember(member, message.guild.id);
      if (res.score >= threshold) suspicious.push({ member, ...res });
    }
    suspicious.sort((a, b) => b.score - a.score);

    storage.logAction(message.guild.id, message.author.id, 'scanmembers', 'scan',
      `${suspicious.length} suspects / ${members.size} membres (seuil ${threshold})`, message.channel.id);

    if (!suspicious.length) {
      return progress.edit({
        embeds: [successEmbed('Scan terminé', `**${members.size}** membres analysés — aucun suspect au seuil ${threshold}/100.`)],
      });
    }

    let page = 1;
    await progress.edit({ embeds: [], ...renderPage(suspicious, page, threshold) });

    const collector = progress.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300_000,
    });

    let pendingAction = null; // 'ban' | 'kick' en attente de confirmation

    collector.on('collect', async (i) => {
      const [ns, action, param] = i.customId.split(':');
      if (ns !== 'scanm') return;

      if (action === 'page' && param !== 'noop') {
        page = parseInt(param, 10) || 1;
        return i.update(renderPage(suspicious, page, threshold));
      }

      if (action === 'export') {
        const csv = ['user_id,tag,score,account_days,messages,reasons']
          .concat(suspicious.map(s => `${s.member.id},"${s.member.user.tag}",${s.score},${s.daysOld},${s.msgCount},"${s.reasons.join(' | ')}"`))
          .join('\n');
        return i.reply({
          files: [new AttachmentBuilder(Buffer.from(csv, 'utf8'), { name: `scan-membres-${message.guild.id}.csv` })],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (action === 'ban' || action === 'kick') {
        pendingAction = action;
        return i.reply({
          embeds: [warningEmbed(
            `Confirmation — ${action.toUpperCase()} de masse`,
            `Tu t'apprêtes à **${action}** ${suspicious.length} membre(s) sur la base d'HEURISTIQUES.\n` +
            `Des faux positifs sont possibles (nouveau membre légitime sans avatar, etc.).\n` +
            `Exporte le CSV et vérifie avant. Clique pour confirmer DÉFINITIVEMENT.`,
          )],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('scanm:confirm').setLabel(`OUI, ${action} les ${suspicious.length}`).setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('scanm:cancel').setLabel('Annuler').setStyle(ButtonStyle.Secondary),
          )],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (action === 'cancel') {
        pendingAction = null;
        return i.update({ embeds: [infoEmbed('Annulé', 'Aucune action de masse appliquée.')], components: [] });
      }

      if (action === 'confirm' && pendingAction) {
        const act = pendingAction; pendingAction = null;
        await i.update({ embeds: [infoEmbed('En cours…', `${act} de masse en application.`)], components: [] });

        let done = 0, failed = 0;
        for (const s of suspicious) {
          try {
            if (act === 'ban') await s.member.ban({ reason: `;scanmembers score ${s.score} : ${s.reasons.join(', ')}` });
            else await s.member.kick(`;scanmembers score ${s.score} : ${s.reasons.join(', ')}`);
            done++;
          } catch { failed++; }
        }
        storage.logAction(message.guild.id, message.author.id, 'scanmembers', `mass_${act}`,
          `${done} ${act}, ${failed} échecs (seuil ${threshold})`, message.channel.id);

        return i.editReply({
          embeds: [successEmbed(`${act.toUpperCase()} de masse terminé`,
            `**${done}** membre(s) traité(s)` + (failed ? ` — ${failed} échec(s) (hiérarchie/permissions)` : '') + '.')],
        });
      }
    });

    collector.on('end', () => {
      progress.edit({ components: [] }).catch(() => {});
    });
  },
};
