'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ChannelType,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/wordchain-storage');

function reply(message, ct) {
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false },
  }).catch(() => {});
}

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return reply(message, ct);
}

module.exports = {
  name       : 'wordchain',
  aliases    : ['wc'],
  category   : 'utility',
  description: 'Système de chaîne de mots (dernière lettre → première lettre).',
  usage      : ';wordchain [setup|stats|reset]',
  cooldown   : 3,
  guildOnly  : true,
  permissions: [],

  async execute(message, args, _client) {
    const sub = (args[0] || '').toLowerCase();

    // ── setup ───────────────────────────────────────────────────────────────
    if (sub === 'setup') {
      if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
      }
      // Cherche une mention de salon ou prend le salon courant
      const mentioned = message.mentions.channels.first();
      const channel = mentioned || message.channel;
      if (channel.type !== ChannelType.GuildText) {
        return plain(message, `${e('btn_error')} Le salon doit être un salon textuel.`);
      }
      storage.setConfig(message.guild.id, {
        channel_id: channel.id,
        enabled   : 1,
        current_chain: 0,
        last_letter  : null,
        last_user_id : null,
      });
      return plain(message,
        `${e('btn_success')} Chaîne de mots activée dans ${channel}.\n` +
        `${e('btn_tip')} Le premier joueur démarre la chaîne avec le mot de son choix.`);
    }

    // ── stats ───────────────────────────────────────────────────────────────
    if (sub === 'stats') {
      const top = storage.listTop(message.guild.id, 10);
      if (!top.length) {
        return plain(message, `${e('btn_tip')} Aucune statistique enregistrée.`);
      }
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_fun')} **Classement · Chaîne de mots**`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const medals = ['🥇', '🥈', '🥉'];
      const lines = top.map((r, i) => {
        const medal = medals[i] || `**${i + 1}.**`;
        return `${medal} <@${r.user_id}> — **${r.contributions}** contribution(s) · ${r.breaks} rupture(s)`;
      }).join('\n');
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
      return reply(message, ct);
    }

    // ── reset ───────────────────────────────────────────────────────────────
    if (sub === 'reset') {
      if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
      }
      storage.resetChain(message.guild.id);
      return plain(message, `${e('btn_success')} Chaîne réinitialisée.`);
    }

    // ── No arg → status ─────────────────────────────────────────────────────
    const cfg = storage.getConfig(message.guild.id);
    const stats = storage.getUserStats(message.guild.id, message.author.id);

    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_fun')} **Chaîne de mots**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (!cfg || !cfg.channel_id) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_tip')} **Non configuré.**\n` +
        `Un admin peut activer le système avec \`;wordchain setup #salon\`.\n\n` +
        `**Règle du jeu :** chaque message doit commencer par la dernière lettre du précédent. ` +
        `Un même joueur ne peut pas poster deux fois d'affilée.`,
      ));
      return reply(message, ct);
    }

    const statusStr = cfg.enabled ? `${e('btn_success')} Actif` : `${e('btn_error')} Désactivé`;
    const nextLetter = cfg.last_letter
      ? `**${cfg.last_letter.toUpperCase()}**`
      : '*(n\'importe quelle lettre — début de chaîne)*';

    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Statut** · ${statusStr}\n` +
      `**Salon** · <#${cfg.channel_id}>\n` +
      `**Chaîne actuelle** · \`${cfg.current_chain || 0}\` message(s)\n` +
      `**Prochaine lettre** · ${nextLetter}\n` +
      `**Record du serveur** · \`${cfg.best_chain || 0}\` message(s)`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Tes stats** · ${stats.contributions} contribution(s) · ${stats.breaks} rupture(s)\n\n` +
      `*Règle : commence ton mot par la dernière lettre du précédent. ` +
      `Pas deux fois d'affilée le même joueur.*`,
    ));

    return reply(message, ct);
  },
};
