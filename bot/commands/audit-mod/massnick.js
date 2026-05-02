'use strict';

const P = require('../../core/audit-mod-panels');
const audit = require('../../core/audit-mod-storage');

const MIN_USERS = 2;
const MAX_USERS = 50;
const MAX_NICK_LEN = 32;

function parseTargetsAndNick(message, rawArgs) {
  const idx = rawArgs.findIndex(a => a === '|');
  if (idx < 0) return { targets: [], nickPattern: null };

  const userArgs = rawArgs.slice(0, idx);
  const nickPattern = rawArgs.slice(idx + 1).join(' ').trim();

  const ids = new Set();
  for (const tok of userArgs) {
    const m = tok.match(/^<@!?(\d{15,})>$/) || tok.match(/^(\d{15,})$/);
    if (m) ids.add(m[1]);
  }
  const targets = [];
  for (const id of ids) {
    const member = message.guild.members.cache.get(id);
    if (member && !member.user.bot) targets.push(member);
  }
  return { targets, nickPattern };
}

function applyPattern(pattern, member) {
  return pattern
    .replace(/\{name\}/g, member.user.username)
    .replace(/\{tag\}/g, member.user.tag)
    .replace(/\{id\}/g, member.id)
    .slice(0, MAX_NICK_LEN);
}

module.exports = {
  name       : 'massnick',
  aliases    : ['mnick', 'massrename'],
  description: 'Renomme plusieurs membres en masse (placeholder {name} supporté).',
  usage      : ';massnick <@u1> <@u2> ... | <nouveau_pseudo>',
  cooldown   : 15,
  guildOnly  : true,
  permissions: ['ManageNicknames'],

  async execute(message, args) {
    const isConfirm = args[0] === 'confirm';
    const rest = isConfirm ? args.slice(1) : args;
    const { targets, nickPattern } = parseTargetsAndNick(message, rest);

    if (!nickPattern) {
      return message.reply(P.warningPanel(
        'Format invalide',
        `Usage : \`${this.usage}\`\nUtilise \`|\` pour séparer la liste des users du pseudo.\nPlaceholder : \`{name}\` (username), \`{tag}\` (user#1234), \`{id}\`.\nExemple : \`;massnick @a @b | [Mod] {name}\``,
      ));
    }
    if (targets.length < MIN_USERS) {
      return message.reply(P.warningPanel('Trop peu de cibles', `Mentionne au moins **${MIN_USERS}** membres.`));
    }
    if (targets.length > MAX_USERS) {
      return message.reply(P.warningPanel('Trop de cibles', `Maximum **${MAX_USERS}** membres par exécution.`));
    }

    const previewLines = targets.map(t => `• ${t.user.tag} → \`${applyPattern(nickPattern, t)}\``);
    const confirmCmd = `;massnick confirm ${targets.map(t => `<@${t.id}>`).join(' ')} | ${nickPattern}`;

    if (!isConfirm) {
      return message.reply(P.confirmPanel(
        '🏷️ Mass-nick — Confirmation',
        `**Cibles** : ${targets.length} membres\n**Pattern** : \`${nickPattern}\`\n\n${previewLines.join('\n')}`,
        confirmCmd,
      ));
    }

    let renamed = 0;
    let failed = 0;
    for (const t of targets) {
      const newNick = applyPattern(nickPattern, t);
      try {
        await t.setNickname(newNick, `Mass-nick par ${message.author.tag}`);
        audit.recordModAction(message.guild.id, t.id, message.author.id, 'NICK', `Mass-nick → ${newNick}`);
        renamed++;
      } catch {
        failed++;
      }
    }

    return message.reply(P.successPanel(
      '✅ Mass-nick exécuté',
      `**${renamed} / ${targets.length}** membres renommés` + (failed ? ` · ${failed} échec(s) (perms ?)` : '') + '.',
    ));
  },
};
