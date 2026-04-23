'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/pairup-storage');
const { runPairup } = require('../../core/pairup-scheduler');

function reply(message, ct) {
  return message.reply({
    components: [ct],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { repliedUser: false, parse: [] },
  }).catch(() => {});
}

function plain(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return reply(message, ct);
}

function freqLabel(f) {
  return { daily: 'quotidien', weekly: 'hebdomadaire', monthly: 'mensuel' }[f] || f;
}

module.exports = {
  name       : 'pairup',
  aliases    : ['match'],
  category   : 'utility',
  description: 'Système de matchmaking communautaire (paires aléatoires).',
  usage      : ';pairup [run|history]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: [],

  async execute(message, args, client) {
    const sub = (args[0] || '').toLowerCase();

    // ── run ─────────────────────────────────────────────────────────────────
    if (sub === 'run') {
      if (!message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return plain(message, `${e('btn_error')} Permission requise : **Gérer le serveur**.`);
      }
      const cfg = storage.getConfig(message.guild.id);
      if (!cfg || !cfg.channel_id || !cfg.role_id) {
        return plain(message, `${e('btn_error')} Configure d'abord le système avec \`;pairupconfig\`.`);
      }
      await plain(message, `${e('btn_tip')} Lancement du matchmaking...`);
      await runPairup(client, cfg);
      return plain(message, `${e('btn_success')} Matchmaking effectué.`);
    }

    // ── history ─────────────────────────────────────────────────────────────
    if (sub === 'history' || sub === 'hist') {
      const rows = storage.getUserHistory(message.guild.id, message.author.id, 10);
      if (!rows.length) {
        return plain(message, `${e('btn_tip')} Aucun match enregistré pour toi.`);
      }
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('cat_fun')} **Tes 10 derniers matchs**`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = rows.map(r => {
        const other = r.user1_id === message.author.id ? r.user2_id : r.user1_id;
        const date = new Date(r.paired_at).toLocaleDateString('fr-FR');
        return `📅 ${date} · <@${other}>`;
      }).join('\n');
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));
      return reply(message, ct);
    }

    // ── No arg : config + historique perso résumé ───────────────────────────
    const cfg = storage.getConfig(message.guild.id);
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_fun')} **Pairup · Matchmaking communautaire**`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (!cfg || !cfg.channel_id) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_tip')} **Non configuré.**\n` +
        `Un admin peut activer le système avec \`;pairupconfig\`.\n\n` +
        `Le système forme automatiquement des paires de membres ayant un rôle donné, ` +
        `pour encourager les échanges entre inconnus du serveur.`,
      ));
      return reply(message, ct);
    }

    const ch = cfg.channel_id ? `<#${cfg.channel_id}>` : '*(aucun)*';
    const role = cfg.role_id ? `<@&${cfg.role_id}>` : '*(aucun)*';
    const lastRun = cfg.last_run_at
      ? `<t:${Math.floor(cfg.last_run_at / 1000)}:R>`
      : '*(jamais)*';

    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Salon** · ${ch}\n` +
      `**Rôle cible** · ${role}\n` +
      `**Fréquence** · ${freqLabel(cfg.frequency)}\n` +
      `**Dernier tour** · ${lastRun}\n` +
      `**Statut** · ${cfg.enabled ? `${e('btn_success')} actif` : `${e('btn_error')} désactivé`}`,
    ));

    const history = storage.getUserHistory(message.guild.id, message.author.id, 3);
    if (history.length) {
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      const lines = history.map(r => {
        const other = r.user1_id === message.author.id ? r.user2_id : r.user1_id;
        const date = new Date(r.paired_at).toLocaleDateString('fr-FR');
        return `• ${date} · <@${other}>`;
      }).join('\n');
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Tes 3 derniers matchs :**\n${lines}`,
      ));
    }

    return reply(message, ct);
  },
};
