'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/serverbackup-storage');

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

module.exports = {
  name       : 'serverbackuprestore',
  aliases    : ['sbackrestore'],
  category   : 'owner',
  description: 'Restaure (aperçu) un snapshot serveur par ID.',
  usage      : ';serverbackuprestore <id>',
  cooldown   : 10,
  guildOnly  : true,
  permissions: [PermissionFlagsBits.Administrator],

  async execute(message, args, _client) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return plain(message, `${e('btn_error')} Permission requise : **Administrateur**.`);
    }
    const id = parseInt(args[0], 10);
    if (!id) return plain(message, `${e('btn_error')} Usage : \`;serverbackuprestore <id>\``);

    const snap = storage.getSnapshot(id);
    if (!snap || snap.guild_id !== message.guild.id) {
      return plain(message, `${e('btn_error')} Snapshot introuvable.`);
    }

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_error')} **AVERTISSEMENT — Restauration snapshot #${id}**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Snapshot : \`${snap.name}\`\n` +
      `Salons : **${snap.channels_count}**\n` +
      `Rôles : **${snap.roles_count}**\n` +
      `Taille : ${(snap.size_bytes / 1024).toFixed(1)} KB\n\n` +
      `${e('btn_tip')} La restauration complète **n'est pas implémentée**. ` +
      `Ce bouton affichera uniquement un aperçu de ce qui serait restauré.`,
    ));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`sbackrestore:step1:${id}`)
        .setLabel('Étape 1 — Voir aperçu')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('sbackrestore:cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary),
    );
    ct.addActionRowComponents(row);

    return message.reply({
      components: [ct, row],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    }).catch(() => {});
  },
};
