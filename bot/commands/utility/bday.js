'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/bday-storage');

const MONTHS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

function formatDate(day, month, year) {
  const d = String(day).padStart(2, '0');
  const m = MONTHS[month] || String(month).padStart(2, '0');
  return year ? `${d} ${m} ${year}` : `${d} ${m}`;
}

function parseDate(str) {
  // DD/MM ou DD/MM/YYYY ou DD-MM(-YYYY)
  const m = String(str || '').match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = m[3] ? parseInt(m[3], 10) : null;
  if (year && year < 100) year += 2000;
  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year && (year < 1900 || year > new Date().getFullYear())) return null;
  // Validation de la date réelle
  const test = new Date(year || 2000, month - 1, day);
  if (test.getMonth() !== month - 1 || test.getDate() !== day) return null;
  return { day, month, year };
}

module.exports = {
  name       : 'bday',
  aliases    : ['birthday', 'anniv'],
  category   : 'utility',
  description: 'Gère ton anniversaire (ajout, suppression, liste).',
  usage      : ';bday [set JJ/MM [AAAA]|remove|next|today|@user]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    const sub = (args[0] || '').toLowerCase();

    // ── set ─────────────────────────────────────────────────────────────────
    if (sub === 'set') {
      const parsed = parseDate(args[1]);
      if (!parsed) {
        return plain(message,
          `${e('btn_error')} Format invalide. Utilise \`;bday set JJ/MM\` ou \`;bday set JJ/MM/AAAA\`.`);
      }
      storage.setBirthday(message.guild.id, message.author.id, parsed.day, parsed.month, parsed.year);
      return plain(message,
        `${e('btn_success')} Anniversaire enregistré : **${formatDate(parsed.day, parsed.month, parsed.year)}**.`);
    }

    // ── remove ──────────────────────────────────────────────────────────────
    if (sub === 'remove' || sub === 'delete' || sub === 'del') {
      const ok = storage.removeBirthday(message.guild.id, message.author.id);
      return plain(message, ok
        ? `${e('btn_success')} Anniversaire supprimé.`
        : `${e('btn_tip')} Aucun anniversaire enregistré.`);
    }

    // ── today ───────────────────────────────────────────────────────────────
    if (sub === 'today') {
      const rows = storage.listTodaysBirthdays(message.guild.id);
      if (!rows.length) {
        return plain(message, `${e('btn_tip')} Aucun anniversaire aujourd'hui.`);
      }
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_fun')} **🎂 Anniversaires du jour**`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = rows.map(r => {
        const age = r.year ? ` · **${new Date().getFullYear() - r.year} ans**` : '';
        return `🎉 <@${r.user_id}>${age}`;
      }).join('\n');
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false, users: rows.map(r => r.user_id) },
      }).catch(() => {});
    }

    // ── next [count] ────────────────────────────────────────────────────────
    if (sub === 'next' || sub === 'upcoming') {
      const count = Math.min(20, Math.max(1, parseInt(args[1], 10) || 5));
      const rows = storage.listUpcoming(message.guild.id, count);
      if (!rows.length) {
        return plain(message, `${e('btn_tip')} Aucun anniversaire enregistré sur ce serveur.`);
      }
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_fun')} **📅 Prochains anniversaires** (${rows.length})`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = rows.map(r => {
        const d = formatDate(r.day, r.month);
        const suffix = r.delta === 0 ? ' · **AUJOURD\'HUI**' : ` · dans ${r.delta} jour(s)`;
        return `📅 <@${r.user_id}> — ${d}${suffix}`;
      }).join('\n');
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
      return message.reply({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false, parse: [] },
      }).catch(() => {});
    }

    // ── @user : voir l'anniversaire de quelqu'un ────────────────────────────
    const mentioned = message.mentions.users.first();
    if (mentioned) {
      const row = storage.getBirthday(message.guild.id, mentioned.id);
      if (!row) {
        return plain(message, `${e('btn_tip')} ${mentioned.username} n'a pas enregistré son anniversaire.`);
      }
      const age = row.year ? ` (**${new Date().getFullYear() - row.year} ans** cette année)` : '';
      return plain(message,
        `🎂 Anniversaire de **${mentioned.username}** : **${formatDate(row.day, row.month, row.year)}**${age}`);
    }

    // ── No arg : ton anniv + les 5 prochains ────────────────────────────────
    const mine = storage.getBirthday(message.guild.id, message.author.id);
    const upcoming = storage.listUpcoming(message.guild.id, 5);

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_fun')} **🎂 Anniversaires**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const mineLine = mine
      ? `${e('btn_success')} Ton anniversaire : **${formatDate(mine.day, mine.month, mine.year)}**`
      : `${e('btn_tip')} Tu n'as pas enregistré ton anniversaire.\nUtilise \`;bday set JJ/MM\` pour le faire.`;
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(mineLine));

    if (upcoming.length) {
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = upcoming.map(r => {
        const d = formatDate(r.day, r.month);
        const suffix = r.delta === 0 ? ' · **AUJOURD\'HUI**' : ` · dans ${r.delta}j`;
        return `📅 <@${r.user_id}> — ${d}${suffix}`;
      }).join('\n');
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Prochains anniversaires :**\n${lines}`,
      ));
    }

    return message.reply({
      components: [ct],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false, parse: [] },
    }).catch(() => {});
  },
};
