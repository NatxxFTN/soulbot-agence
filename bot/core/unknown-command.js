'use strict';

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('./emojis');

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[m][n];
}

function findSimilar(input, commands) {
  const inp = input.toLowerCase();
  return commands
    .filter(c => !c.ownerOnly)
    .map(c => ({ ...c, d: levenshtein(inp, c.name.toLowerCase()) }))
    .filter(c => c.d <= 3 || c.name.toLowerCase().includes(inp) || inp.includes(c.name.toLowerCase()))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
}

async function sendUnknownCommand(message, attempted, prefix, commands) {
  const suggestions = findSimilar(attempted, commands);

  const ct = new ContainerBuilder().setAccentColor(0xFF0000);

  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_error')} **Commande introuvable**`
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ui_chat')} La commande \`${prefix}${attempted}\` n'existe pas.`
  ));

  if (suggestions.length > 0) {
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const lines = suggestions.map(c =>
      `${e('ui_pin')} \`${prefix}${c.name}\` — ${c.description || '*Aucune description*'}`
    ).join('\n');
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_tip')} **Tu voulais peut-être dire :**\n${lines}`
    ));
  }

  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_help')} Tape \`${prefix}help\` pour voir toutes les commandes.`
  ));

  await message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => null);
}

module.exports = { sendUnknownCommand };
