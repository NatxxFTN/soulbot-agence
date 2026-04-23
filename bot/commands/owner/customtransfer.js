'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const customStorage = require('../../core/custom-commands-storage');
const access = require('../../core/access-control');

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
  name       : 'customtransfer',
  aliases    : ['cxfer'],
  category   : 'owner',
  description: 'Transfère les commandes custom depuis un autre serveur (duplicates ignorés).',
  usage      : ';customtransfer <guild_id_source>',
  cooldown   : 10,
  guildOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    const srcGuildId = (args[0] || '').trim();
    if (!srcGuildId || !/^\d{17,20}$/.test(srcGuildId)) {
      return plain(message, `${e('btn_error')} Usage : \`;customtransfer <guild_id_source>\``);
    }

    const dstGuildId = message.guild.id;
    if (srcGuildId === dstGuildId) {
      return plain(message, `${e('btn_error')} La source et la destination sont identiques.`);
    }

    // Vérifier l'accès sur SOURCE et DESTINATION
    const userId = message.author.id;
    const isOwner = access.isBotOwner(userId);
    const canSrc = isOwner || access.isBuyer(srcGuildId, userId);
    const canDst = isOwner || access.isBuyer(dstGuildId, userId);

    if (!canSrc || !canDst) {
      return plain(message,
        `${e('btn_error')} Accès refusé. Tu dois être **BotOwner** ou **Buyer** sur **les deux serveurs** (source et destination).`,
      );
    }

    // Vérifier que le bot est sur le serveur source
    const srcGuild = client.guilds.cache.get(srcGuildId);
    if (!srcGuild) {
      return plain(message,
        `${e('btn_error')} Le bot n'est pas présent sur le serveur source (\`${srcGuildId}\`).`,
      );
    }

    // Charger toutes les commandes du serveur source (pagination large)
    const page = customStorage.listCommands(srcGuildId, 0, 999);
    const srcCmds = page.items || [];
    if (srcCmds.length === 0) {
      return plain(message, `${e('btn_tip')} Aucune commande custom sur le serveur source.`);
    }

    // Compter les duplicates sur la destination
    let duplicates = 0;
    let importables = 0;
    for (const c of srcCmds) {
      if (customStorage.getCommand(dstGuildId, c.name)) duplicates++;
      else importables++;
    }

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_owner')} **Transfert de commandes custom**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Source** · \`${srcGuild.name}\` (\`${srcGuildId}\`)\n` +
      `**Destination** · \`${message.guild.name}\`\n\n` +
      `**Commandes trouvées** · ${srcCmds.length}\n` +
      `**Importables** · ${importables}\n` +
      `**Doublons (ignorés)** · ${duplicates}`,
    ));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cxfer:confirm:${srcGuildId}:${userId}`)
        .setLabel('Confirmer le transfert')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(importables === 0),
      new ButtonBuilder()
        .setCustomId(`cxfer:cancel:${userId}`)
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

// ── Handler des boutons cxfer ────────────────────────────────────────────────
// Enregistré via ready.js (voir module.exports.handler ci-dessous)

async function handleTransferInteraction(interaction, params, _client) {
  try {
    const action = params[0];

    if (action === 'cancel') {
      const authorId = params[1];
      if (interaction.user.id !== authorId && !access.isBotOwner(interaction.user.id)) {
        return interaction.reply({
          content: `${e('btn_error')} Ce bouton ne t'est pas destiné.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Transfert annulé.`,
      ));
      return interaction.update({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }

    if (action === 'confirm') {
      const srcGuildId = params[1];
      const authorId = params[2];
      if (interaction.user.id !== authorId && !access.isBotOwner(interaction.user.id)) {
        return interaction.reply({
          content: `${e('btn_error')} Ce bouton ne t'est pas destiné.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const dstGuildId = interaction.guild.id;
      const page = customStorage.listCommands(srcGuildId, 0, 999);
      const srcCmds = page.items || [];

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const c of srcCmds) {
        if (customStorage.getCommand(dstGuildId, c.name)) { skipped++; continue; }
        try {
          let responseType = c.response_type || 'text';
          let data;
          if (responseType === 'text') {
            data = { text: c.response_text || '' };
          } else if (responseType === 'embed') {
            try {
              data = JSON.parse(c.embed_data || '{}');
            } catch {
              errors++;
              continue;
            }
          } else {
            errors++;
            continue;
          }
          customStorage.createCommand(dstGuildId, c.name, responseType, data, interaction.user.id);
          imported++;
        } catch (err) {
          console.error('[customtransfer] import:', err.message);
          errors++;
        }
      }

      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_success')} **Transfert terminé**`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Importées** · ${imported}\n` +
        `**Ignorées (doublons)** · ${skipped}\n` +
        `**Erreurs** · ${errors}`,
      ));

      return interaction.update({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[customtransfer] handler:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

module.exports.handleTransferInteraction = handleTransferInteraction;
