'use strict';

// ═══════════════════════════════════════════════
// ;syncemojis — importe TOUS les emojis du serveur COURANT dans le cache.
// Cas d'usage : tu as un serveur dédié aux emojis Soulbot. Tu y ajoutes
// le bot, tu lances ;syncemojis dessus → le cache (data/emojis-ids.json)
// pointe désormais vers les IDs de CE serveur, accessible au bot.
// Corrige les COMPONENT_INVALID_EMOJI (emojis hébergés sur un serveur
// où le bot n'est pas membre).
// ═══════════════════════════════════════════════

const { setEmojiId, loadCache } = require('../../core/emoji-cache');
const E = require('../../utils/embeds');
const { e } = require('../../core/emojis');

// Emojis attendus par les surfaces Security Studio / SOC (zéro-Unicode).
const SOC_EXPECTED = [
  'cat_protection', 'cat_information', 'cat_moderation',
  'ui_lock', 'ui_unlock', 'ui_eye', 'ui_user', 'ui_members',
  'ui_antispam', 'ui_antileak', 'ui_git', 'ui_mail', 'ui_mail_letter',
  'ui_chat', 'ui_speaker', 'ui_smiley', 'ui_pin',
  'btn_success', 'btn_error', 'btn_tip', 'btn_help', 'btn_home',
  'btn_prev', 'btn_next', 'btn_edit', 'btn_search', 'btn_trash',
];

module.exports = {
  name       : 'syncemojis',
  aliases    : ['synmojis', 'importemojis'],
  category   : 'owner',
  description: 'Importe tous les emojis du serveur courant dans le cache du bot.',
  usage      : ';syncemojis [--prune]',
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message, args) {
    const guild = message.guild;
    const emojis = [...guild.emojis.cache.values()];

    if (!emojis.length) {
      return message.reply({
        embeds: [E.error(
          `${e('ui_folder')} Aucun emoji`,
          `Ce serveur (**${guild.name}**) n'a aucun emoji custom. ` +
          `Ajoute la pack d'emojis ici puis relance \`;syncemojis\`.`,
        )],
      });
    }

    const before = loadCache();
    const imported = [];
    const overwritten = [];

    for (const emoji of emojis) {
      if (!emoji.name) continue;
      if (before[emoji.name] && before[emoji.name].id !== emoji.id) {
        overwritten.push(emoji.name);
      }
      // id + animated + guildId (traçabilité : sur quel serveur l'emoji vit)
      setEmojiId(emoji.name, emoji.id, emoji.animated, guild.id);
      imported.push(emoji.name);
    }

    // Couverture des emojis attendus par le SOC
    const after = loadCache();
    const stillMissing = SOC_EXPECTED.filter(k => !after[k]);
    const nowFromThisGuild = SOC_EXPECTED.filter(k => imported.includes(k));

    const lines = [
      `${e('btn_success')} **${imported.length}** emoji(s) importé(s) depuis **${guild.name}**`,
      overwritten.length ? `${e('btn_tip')} ${overwritten.length} ID(s) mis à jour (anciens serveurs)` : null,
      `${e('cat_protection')} Couverture SOC : **${nowFromThisGuild.length}/${SOC_EXPECTED.length}** servis par ce serveur`,
      stillMissing.length
        ? `${e('btn_error')} **À uploader ici** (${stillMissing.length}) : ${stillMissing.map(k => `\`${k}\``).join(', ')}`
        : `${e('btn_success')} Tous les emojis SOC sont couverts.`,
    ].filter(Boolean);

    return message.reply({
      embeds: [E.base()
        .setTitle(`${e('cat_owner')} Synchronisation des emojis`)
        .setDescription(lines.join('\n'))],
    });
  },
};
