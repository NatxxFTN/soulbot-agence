'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/confession-storage');

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
  name       : 'confession',
  aliases    : ['confess'],
  category   : 'utility',
  description: 'Poste une confession anonyme (via un formulaire).',
  usage      : ';confession',
  cooldown   : 5,
  guildOnly  : true,
  permissions: [],

  async execute(message, _args, _client) {
    const cfg = storage.getConfig(message.guild.id);
    if (!cfg || !cfg.channel_id) {
      return plain(message, `${e('btn_tip')} Le système de confessions n'est pas configuré. Utilise \`;confessionconfig\`.`);
    }

    // Tentative d'ouverture d'un modal via un bouton éphémère (pas possible depuis un message).
    // Solution : on poste un bouton "Écrire ma confession" que l'utilisateur clique.
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ani_diamond')} **Confession anonyme**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `Clique sur le bouton ci-dessous pour écrire ta confession.\n` +
      `Elle sera postée anonymement dans <#${cfg.channel_id}>.\n` +
      (cfg.require_approval
        ? `${e('btn_tip')} Les confessions passent par une modération avant publication.`
        : `${e('btn_success')} Publication immédiate.`),
    ));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confession:open')
        .setLabel('Écrire ma confession')
        .setEmoji('✍️')
        .setStyle(ButtonStyle.Primary),
    );
    ct.addActionRowComponents(row);

    try { await message.delete(); } catch {}

    return message.channel.send({
      components: [ct, row],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  },
};

// Export d'un helper pour construire le modal (réutilisable depuis le handler)
module.exports.buildConfessionModal = function buildConfessionModal() {
  const modal = new ModalBuilder()
    .setCustomId('confession_modal:submit')
    .setTitle('Confession anonyme');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('content')
      .setLabel('Ta confession')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(4)
      .setMaxLength(1000)
      .setRequired(true)
      .setPlaceholder('Écris ici ce que tu veux partager anonymement...'),
  ));
  return modal;
};

// Export d'un builder pour le panel publié (utilisé par le handler d'approbation)
module.exports.buildConfessionPanel = function buildConfessionPanel(conf, cfg) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ani_diamond')} **Confession #${conf.id}** ${e('ani_diamond')}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(conf.content));

  const rows = [];
  if (cfg?.allow_votes) {
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const voteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confession:vote:up:${conf.id}`)
        .setLabel(String(conf.upvotes || 0))
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`confession:vote:down:${conf.id}`)
        .setLabel(String(conf.downvotes || 0))
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger),
    );
    ct.addActionRowComponents(voteRow);
    rows.push(voteRow);
  }
  return { container: ct, rows };
};
