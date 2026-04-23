'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const ac = require('../../core/access-control');
const storage = require('../../core/custom-commands-storage');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  name       : 'customstats',
  aliases    : ['cstats'],
  category   : 'configuration',
  description: 'Stats globales ou détaillées d\'une commande custom.',
  usage      : ';customstats [nom]',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message, args) {
    const guildId = message.guild.id;

    if (!ac.hasAccess(guildId, message.author.id)) {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_error')} **Accès refusé** — Niveau Owner+ requis.`,
      ));
      return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
    }

    const targetName = (args[0] || '').toLowerCase();
    const container  = new ContainerBuilder().setAccentColor(0xFF0000);

    // ── Stats détaillées d'une commande ─────────────────────────────────────
    if (targetName) {
      const cmd = storage.getCommand(guildId, targetName);
      if (!cmd) {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `${e('btn_error')} \`;${targetName}\` n'existe pas.`,
        ));
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
      }

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ani_diamond')} **Stats — \`;${cmd.name}\`**`,
      ));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_giveaway')} Utilisations : **${cmd.uses_count}**\n` +
        `${e('ui_user')} Créée par : <@${cmd.created_by}>\n` +
        `${e('ui_pin')} Créée : <t:${Math.floor(cmd.created_at / 1000)}:R>\n` +
        (cmd.updated_at ? `${e('btn_edit')} Dernière édition : <t:${Math.floor(cmd.updated_at / 1000)}:R>\n` : '') +
        (cmd.last_used_at ? `${e('btn_tip')} Dernière utilisation : <t:${Math.floor(cmd.last_used_at / 1000)}:R>` : `${e('btn_error')} Jamais utilisée`),
      ));

      return message.reply({
        components: [container],
        flags     : MessageFlags.IsComponentsV2,
        allowedMentions: { repliedUser: false },
      });
    }

    // ── Stats globales : top 10 du serveur ──────────────────────────────────
    const top       = storage.getTopCommands(guildId, 10);
    const total     = storage.countCommands(guildId);
    const usesMonth = storage.getTotalUsesThisMonth(guildId);

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ani_diamond')} **Stats Commandes Custom** ${e('ani_diamond')}`,
    ));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_information')} Total : **${total}/${storage.MAX_PER_GUILD}**\n` +
      `${e('cat_giveaway')} Utilisations ce mois : **${usesMonth}**`,
    ));

    if (top.length > 0) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = top.map((c, i) => {
        const prefix = i < 3 ? MEDALS[i] : `**${i + 1}.**`;
        return `${prefix} \`;${c.name}\` — **${c.uses_count}** uses`;
      });
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_owner')} **Top utilisées**\n${lines.join('\n')}`,
      ));
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_tip')} Détail d'une commande : \`;customstats <nom>\``,
    ));

    await message.reply({
      components: [container],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
