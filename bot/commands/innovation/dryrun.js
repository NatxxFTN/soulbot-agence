'use strict';

const { PermissionsBitField } = require('discord.js');
const { e } = require('../../core/emojis');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
} = require('../../ui/panels/_premium-helpers');

const ANALYZABLE = {
  ban:        { label: 'Bannir',          reversible: 'OUI (`;unban`)',    impact: 'Retire le membre + ajoute au ban-list',       botPerm: 'BanMembers' },
  kick:       { label: 'Expulser',        reversible: 'NON (rejoindra)',   impact: 'Retire le membre du serveur',                  botPerm: 'KickMembers' },
  unban:      { label: 'Débannir',        reversible: 'OUI (`;ban`)',      impact: 'Retire l\'entrée du ban-list',                 botPerm: 'BanMembers' },
  mute:       { label: 'Timeout',         reversible: 'OUI (`;unmute`)',   impact: 'Applique un timeout Discord',                  botPerm: 'ModerateMembers' },
  unmute:     { label: 'Retirer timeout', reversible: 'OUI (`;mute`)',     impact: 'Retire le timeout',                            botPerm: 'ModerateMembers' },
  warn:       { label: 'Warn',            reversible: 'OUI (`;unwarn`)',   impact: 'Ajoute un warn en DB, DM au membre',           botPerm: 'ModerateMembers' },
  clear:      { label: 'Purge messages',  reversible: 'NON',               impact: 'Supprime N messages (14j max)',                botPerm: 'ManageMessages' },
  lock:       { label: 'Verrouiller',     reversible: 'OUI (`;unlock`)',   impact: 'Retire SendMessages à @everyone',              botPerm: 'ManageChannels' },
  nuke:       { label: 'Nuke salon',      reversible: 'NON',               impact: 'Supprime et recrée le salon vide',             botPerm: 'ManageChannels' },
  freeze:     { label: 'Geler serveur',   reversible: 'OUI (`;unfreeze`)', impact: 'Retire SendMessages sur tous les salons',      botPerm: 'ManageChannels' },
};

module.exports = {
  name        : 'dryrun',
  aliases     : ['simulate', 'preview'],
  description : 'Simule une commande sans l\'exécuter (perms, hiérarchie, impact)',
  usage       : ';dryrun <commande> [cible] [args...]',
  guildOnly   : true,

  async execute(message, args) {
    if (!args.length) {
      const container = newContainer();
      buildHeader(container, {
        emojiKey : 'btn_search',
        title    : 'Simulation — aide',
        subtitle : '`;dryrun <commande> [cible] [args...]`',
      });
      const list = Object.keys(ANALYZABLE).map(k => `• \`${k}\` — ${ANALYZABLE[k].label}`).join('\n');
      container.addTextDisplayComponents(text(`## Commandes analysables\n${list}`));
      container.addSeparatorComponents(separator('Small'));
      container.addTextDisplayComponents(text(`**Exemple :** \`;dryrun ban @user spam\``));
      container.addTextDisplayComponents(text(`-# Soulbot • Innovation • DryRun v1.0`));
      return message.reply(toV2Payload(container));
    }

    const cmd = args[0].toLowerCase();
    const info = ANALYZABLE[cmd];
    if (!info) {
      const container = newContainer();
      buildHeader(container, {
        emojiKey : 'btn_error',
        title    : 'Commande non analysable',
        subtitle : `\`${cmd}\` n'est pas dans la liste des simulables.`,
      });
      container.addTextDisplayComponents(text(`Tape \`;dryrun\` (sans argument) pour voir la liste complète.`));
      container.addTextDisplayComponents(text(`-# Soulbot • Innovation • DryRun v1.0`));
      return message.reply(toV2Payload(container));
    }

    const me = message.guild.members.me;
    const botHasPerm = me?.permissions.has(PermissionsBitField.Flags[info.botPerm]);
    const authorHasPerm = message.member?.permissions.has(PermissionsBitField.Flags[info.botPerm]);

    // Analyse cible éventuelle
    let targetInfo = '*(non fournie)*';
    let hierarchy = '*(non applicable)*';
    const targetRaw = args[1];
    if (targetRaw) {
      const userId = targetRaw.match(/^<@!?(\d+)>$/)?.[1] || targetRaw.match(/^\d{17,20}$/)?.[0];
      const channelId = targetRaw.match(/^<#(\d+)>$/)?.[1];
      if (userId) {
        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (member) {
          targetInfo = `${member.user.tag} · <@${member.id}>`;
          if (['ban', 'kick', 'mute', 'warn'].includes(cmd)) {
            const botTop    = me.roles.highest.position;
            const targetTop = member.roles.highest.position;
            const authorTop = message.member.roles.highest.position;
            const botOk     = botTop > targetTop;
            const authorOk  = authorTop > targetTop || message.guild.ownerId === message.author.id;
            hierarchy = `Bot : ${botOk ? '✅' : '❌'} · Auteur : ${authorOk ? '✅' : '❌'}`;
          }
        } else {
          targetInfo = `<@${userId}> *(hors serveur)*`;
        }
      } else if (channelId) {
        targetInfo = `<#${channelId}>`;
      }
    }

    // Panel SIMULATION V2
    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'btn_search',
      title    : `🧪 SIMULATION — \`;${cmd} ${args.slice(1).join(' ')}\``,
      subtitle : '*Aucune action réellement exécutée.*',
    });

    container.addTextDisplayComponents(
      text(
        `## Action prévue\n` +
        `• **Nom :** ${info.label}\n` +
        `• **Impact :** ${info.impact}\n` +
        `• **Réversible :** ${info.reversible}`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(
        `## Vérifications\n` +
        `• **Perm bot (\`${info.botPerm}\`) :** ${botHasPerm ? '✅' : '❌'}\n` +
        `• **Perm auteur (\`${info.botPerm}\`) :** ${authorHasPerm ? '✅' : '❌'}\n` +
        `• **Cible :** ${targetInfo}\n` +
        `• **Hiérarchie :** ${hierarchy}`,
      ),
    );
    container.addSeparatorComponents(separator('Small'));

    container.addTextDisplayComponents(
      text(`> ${e('btn_flag')} **Aucune action n'a été exécutée.** Seules les vérifications sont affichées.`),
    );
    container.addTextDisplayComponents(text(`-# Soulbot • Innovation • DryRun v1.0`));

    return message.reply(toV2Payload(container));
  },
};
