'use strict';

const {
  MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/suggestion-storage');

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

function buildSuggestionPanel(sugg, author) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  const name = sugg.anonymous ? 'Suggestion anonyme' : (author?.username || `User ${sugg.user_id}`);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('cat_information')} **Suggestion #${sugg.id}** · par ${name}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(sugg.content));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const statusLabels = {
    pending    : `${e('btn_tip')} En attente`,
    approved   : `${e('btn_success')} Approuvée`,
    rejected   : `${e('btn_error')} Rejetée`,
    implemented: `${e('ui_diamond')} Implémentée`,
  };
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${statusLabels[sugg.status] || sugg.status} · 👍 **${sugg.upvotes}** · 👎 **${sugg.downvotes}**` +
    (sugg.status_reason ? `\n\n**Raison :** ${sugg.status_reason}` : ''),
  ));

  const voteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggest:vote:up:${sugg.id}`)
      .setLabel(`${sugg.upvotes}`)
      .setEmoji('👍')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`suggest:vote:down:${sugg.id}`)
      .setLabel(`${sugg.downvotes}`)
      .setEmoji('👎')
      .setStyle(ButtonStyle.Danger),
  );

  const staffRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggest:approve:${sugg.id}`)
      .setLabel('Approuver')
      .setStyle(ButtonStyle.Success)
      .setDisabled(sugg.status !== 'pending'),
    new ButtonBuilder()
      .setCustomId(`suggest:reject:${sugg.id}`)
      .setLabel('Rejeter')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(sugg.status !== 'pending'),
    new ButtonBuilder()
      .setCustomId(`suggest:implement:${sugg.id}`)
      .setLabel('Implémentée')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(sugg.status === 'implemented'),
  );

  ct.addActionRowComponents(voteRow);
  ct.addActionRowComponents(staffRow);

  return { container: ct, rows: [voteRow, staffRow] };
}

module.exports = {
  name       : 'suggestion',
  aliases    : ['suggest'],
  category   : 'utility',
  description: 'Propose une suggestion. Les membres votent, le staff approuve.',
  usage      : ';suggestion <contenu>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  buildSuggestionPanel,

  async execute(message, args, _client) {
    const content = args.join(' ').trim();
    if (!content) return plain(message, `${e('btn_error')} Usage : \`;suggestion <ta suggestion>\``);
    if (content.length > 1000) {
      return plain(message, `${e('btn_error')} Suggestion trop longue (max 1000 caractères).`);
    }

    const cfg = storage.getConfig(message.guild.id);
    if (!cfg || !cfg.channel_id) {
      return plain(message, `${e('btn_tip')} Le système de suggestions n'est pas configuré. Utilise \`;suggestionconfig\`.`);
    }

    // Cooldown anti-spam
    const last = storage.getLastSubmission(message.guild.id, message.author.id);
    const cd = (cfg.cooldown_seconds || 300) * 1000;
    if (last && (Date.now() - last.submitted_at) < cd) {
      const remaining = Math.ceil((cd - (Date.now() - last.submitted_at)) / 1000);
      return plain(message, `${e('btn_tip')} Patiente **${remaining}s** avant de reproposer.`);
    }

    const channel = await message.guild.channels.fetch(cfg.channel_id).catch(() => null);
    if (!channel) return plain(message, `${e('btn_error')} Salon de suggestions introuvable.`);

    const suggId = storage.createSuggestion({
      guild_id: message.guild.id,
      user_id: message.author.id,
      content,
      anonymous: 0,
    });
    if (!suggId) return plain(message, `${e('btn_error')} Erreur lors de la création.`);

    const sugg = storage.getSuggestion(suggId);
    const { container, rows } = buildSuggestionPanel(sugg, message.author);

    const posted = await channel.send({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);

    if (posted) storage.updateMessageId(suggId, posted.id);

    try { await message.delete(); } catch {}

    const confirm = new ContainerBuilder().setAccentColor(0xFF0000);
    confirm.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_success')} Suggestion **#${suggId}** postée dans ${channel}.`,
    ));
    return message.channel.send({
      components: [confirm],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  },
};
