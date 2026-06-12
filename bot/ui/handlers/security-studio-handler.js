'use strict';

// ═══════════════════════════════════════════════
// SECURITY STUDIO HANDLER — V5
// Routing : security:<section>:<action>[:arg]
//   security:hub:refresh|toggle|open|exempt|disableall|help
//   security:confirm:disableall:yes|no
// Reprend le namespace 'security' de l'ancien security-handler
// (les anciens customIds 'security:toggle'/'security:config' reçoivent
// une réponse « panel obsolète » propre au lieu d'un silence).
// Écritures DB : UNIQUEMENT via security-registry.
// Réponses d'erreur/refus : ephemeral. Le hub vit dans SON message
// (interaction.update) — jamais de spam de nouveaux messages.
// ═══════════════════════════════════════════════

const {
  PermissionFlagsBits, MessageFlags,
  ActionRowBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder,
  ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const registry = require('../../core/security-registry');
const storage = require('../../core/security-storage');
const {
  renderDisableAllConfirm, renderLockdownConfirm, renderPanicConfirm,
} = require('../panels/security-studio');
const { buildHubPayload, invalidateCache } = require('../soc-image');

// Payload unique (image + fallback CV2 gérés par soc-image)
function _hubPayload(guild, opts = {}) {
  return buildHubPayload(guild, opts);
}

async function handleSecurityStudioInteraction(interaction) {
  if (!interaction.inGuild()) return;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      content: `${e('btn_error')} Permission **Gérer le serveur** requise.`,
      flags  : MessageFlags.Ephemeral,
    });
  }

  const [, section, action, arg, arg2] = interaction.customId.split(':');
  const guild = interaction.guild;

  try {
    // ── HUB ────────────────────────────────────────────────────────────────
    if (section === 'hub') {
      if (action === 'refresh') {
        // Rafraîchir force le re-render de l'image (bypass cache 5 s)
        return interaction.update(_hubPayload(guild, { forceImage: true }));
      }

      if (action === 'toggle') {
        const key = interaction.values?.[0];
        const newState = registry.toggleEnabled(guild.id, key, interaction.user.id);
        await interaction.update(_hubPayload(guild));
        return interaction.followUp({
          content: `${newState ? e('btn_success') : e('btn_error')} **${registry.MODULES_BY_KEY.get(key)?.label ?? key}** est maintenant **${newState ? 'activé' : 'désactivé'}**.`,
          flags  : MessageFlags.Ephemeral,
        });
      }

      if (action === 'open') {
        const key = interaction.values?.[0];
        const mod = registry.getModule(guild.id, key);
        const lad = registry.getLadderConfig(guild.id, key, registry.normalizeSanction(mod?.sanctionRaw ?? 'delete').sanction);
        // Vue détaillée complète : Defense Grid Phase 3. Dès maintenant :
        // état + mode de sanction (Escalade/Fixe — voie de retour, décision Nathan).
        return interaction.reply({
          content:
            `${e(mod?.emoji ?? 'cat_protection')} **${mod?.label ?? key}** — ${mod?.enabled ? 'armé' : 'désarmé'}\n` +
            `${e('btn_tip')} Sanction plancher : \`${mod?.sanctionLabel}\` · Mode : **${lad.mode === 'ladder' ? 'Escalade (ladder)' : 'Sanction fixe'}**\n` +
            `Paliers : ${lad.ladder.map(r => `${r.count}→${r.action}${r.duration ? `(${r.duration}s)` : ''}`).join(' · ')}\n` +
            `Configuration fine : \`;${key === 'antinsfw' ? 'antiexplicit' : key}\` (éditeur complet → Defense Grid Phase 3)`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`security:mod:laddermode:${key}`)
                .setEmoji(forButton('btn_edit'))
                .setLabel(`Passer en mode ${lad.mode === 'ladder' ? 'Sanction fixe' : 'Escalade'}`)
                .setStyle(ButtonStyle.Secondary),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (action === 'staffrole') {
        return interaction.reply({
          content: `${e('ui_lock')} Choisis le rôle staff à protéger — il sera exempté de TOUTES les protections (vault global).`,
          components: [
            new ActionRowBuilder().addComponents(
              new RoleSelectMenuBuilder()
                .setCustomId('security:vault:staffrole')
                .setPlaceholder('Rôle à ajouter au vault')
                .setMaxValues(1),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (action === 'disableall') {
        return interaction.update({
          components: [renderDisableAllConfirm(guild)], files: [],
          flags     : MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }

      if (action === 'help') {
        return interaction.reply({
          content:
            `${e('cat_protection')} **Security Studio V5 — aide rapide**\n` +
            `${e('btn_success')} / ${e('btn_error')} = module actif / inactif\n` +
            `· **Toggle rapide** : premier menu — effet immédiat.\n` +
            `· **Configurer** : second menu — seuils, sanctions, salon de logs (étapes à venir).\n` +
            `· **Exemption modos** : si ON, les membres avec *Gérer les messages* ne déclenchent rien.\n` +
            `· Whitelist : \`;whitelist\` · Logs : \`;securitylogs\` · Blacklist : \`;blacklist\``,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ── VAULT : ajout rôle staff (1 clic, décision Nathan) ────────────────
    if (section === 'vault' && action === 'staffrole') {
      const roleId = interaction.values?.[0];
      if (!roleId) return;
      const added = storage.addWhitelist(guild.id, 'role', roleId, null, interaction.user.id);
      return interaction.update({
        content: added
          ? `${e('btn_success')} <@&${roleId}> est maintenant dans le vault — exempté de toutes les protections.`
          : `${e('btn_tip')} <@&${roleId}> était déjà dans le vault.`,
        components: [],
        allowedMentions: { parse: [] },
      });
    }

    // ── MODULE : switch Escalade / Sanction fixe ──────────────────────────
    if (section === 'mod' && action === 'laddermode') {
      const key = arg;
      const mod = registry.getModule(guild.id, key);
      if (!mod) return;
      const current = registry.getLadderConfig(guild.id, key);
      const newMode = registry.setLadderMode(guild.id, key, current.mode === 'ladder' ? 'fixed' : 'ladder', interaction.user.id);
      return interaction.update({
        content:
          `${e('btn_success')} **${mod.label}** — mode de sanction : ` +
          `**${newMode === 'ladder' ? 'Escalade (ladder)' : `Sanction fixe (${mod.sanctionLabel})`}**.`,
        components: [],
      });
    }

    // ── DOCK D'URGENCE (2B) ───────────────────────────────────────────────
    if (section === 'dock') {
      if (action === 'lockdown') {
        return interaction.update({
          components: [renderLockdownConfirm(guild)], files: [],
          flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] },
        });
      }
      if (action === 'panic') {
        return interaction.update({
          components: [renderPanicConfirm(guild)], files: [],
          flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] },
        });
      }
      if (action === 'quarantine') {
        return interaction.reply({
          content: `${e('ui_user')} Choisis le membre à isoler (rôles retirés + sauvegardés, restauration via \`;unquarantine\`).`,
          components: [
            new ActionRowBuilder().addComponents(
              new UserSelectMenuBuilder()
                .setCustomId('security:dock:quarantine_user')
                .setPlaceholder('Membre à mettre en quarantaine')
                .setMaxValues(1),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
      if (action === 'quarantine_user') {
        const userId = interaction.values?.[0];
        const target = await guild.members.fetch(userId).catch(() => null);
        if (!target) {
          return interaction.update({ content: `${e('btn_error')} Membre introuvable.`, components: [] });
        }
        // Garde-fous AVANT confirmation (mêmes règles que ;quarantine)
        const { getActiveQuarantine } = require('../../commands/audit-mod/quarantine');
        let block = null;
        if (target.user.bot) block = 'On ne met pas un bot en quarantaine.';
        else if (target.id === guild.ownerId) block = 'Le propriétaire du serveur ne peut pas être isolé.';
        else if (target.id === interaction.user.id) block = 'Tu ne peux pas t\'isoler toi-même.';
        else if (!target.manageable) block = 'Hiérarchie : mon rôle est trop bas pour gérer ce membre.';
        else if (getActiveQuarantine(guild.id, target.id)) block = 'Déjà en quarantaine.';
        if (block) {
          return interaction.update({ content: `${e('btn_error')} ${block}`, components: [] });
        }
        return interaction.update({
          content:
            `${e('ui_lock')} **Quarantine — confirmation**\n` +
            `Cible : **${target.user.tag}** — ${target.roles.cache.size - 1} rôle(s) seront retirés et sauvegardés.`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`security:confirm:quarantine:yes:${userId}`)
                .setEmoji(forButton('ui_lock')).setLabel('Isoler').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('security:confirm:quarantine:no')
                .setEmoji(forButton('btn_prev')).setLabel('Annuler').setStyle(ButtonStyle.Secondary),
            ),
          ],
        });
      }
      if (action === 'scan') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const members = await guild.members.fetch().catch(() => guild.members.cache);
        const now = Date.now();
        const young = [...members.values()]
          .filter(m => !m.user.bot && now - m.user.createdTimestamp < 7 * 86_400_000)
          .sort((a, b) => b.user.createdTimestamp - a.user.createdTimestamp);
        const bots = [...members.values()].filter(m => m.user.bot).length;
        const lines = young.slice(0, 10).map(m =>
          `· <@${m.id}> — compte créé <t:${Math.floor(m.user.createdTimestamp / 1000)}:R>`);
        return interaction.editReply({
          content:
            `${e('btn_search')} **SCAN rapide — ${guild.name}**\n` +
            `Membres : **${members.size}** · Bots : **${bots}** · ` +
            `Comptes < 7 jours : **${young.length}**\n` +
            (lines.length ? lines.join('\n') + '\n' : '') +
            `${e('btn_tip')} Scan complet avec actions de masse : \`;scanmembers\``,
          allowedMentions: { parse: [] },
        });
      }
    }

    // ── CONFIRMATIONS ──────────────────────────────────────────────────────
    if (section === 'confirm' && action === 'lockdown') {
      if (arg === 'lock' || arg === 'unlock') {
        await interaction.deferUpdate();
        const { executeLock, executeUnlock } = require('./lockdown-handler');
        if (arg === 'lock') await executeLock(interaction, guild.id);
        else await executeUnlock(interaction, guild.id);
        storage.logAction(guild.id, interaction.user.id, 'lockdown',
          arg === 'lock' ? 'none' : 'restore',
          `${arg === 'lock' ? 'Lockdown' : 'Fin de lockdown'} via dock SOC`, null);
        invalidateCache(guild.id);
        await interaction.editReply(_hubPayload(guild, { forceImage: true }));
        return interaction.followUp({
          content: `${arg === 'lock' ? e('ui_lock') : e('ui_unlock')} ${arg === 'lock' ? 'Serveur verrouillé.' : 'Serveur déverrouillé.'}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.update(_hubPayload(guild));
    }

    if (section === 'confirm' && action === 'panic') {
      if (arg === 'yes') {
        await interaction.deferUpdate();
        for (const mod of registry.MODULES) {
          registry.setEnabled(guild.id, mod.key, true, interaction.user.id);
        }
        registry.setSettings(guild.id, { defcon: 4 }); // HAUT
        storage.logAction(guild.id, interaction.user.id, 'panic', 'none', 'PANIC via dock SOC — tout armé + DEFCON HAUT', null);
        invalidateCache(guild.id);
        await interaction.editReply(_hubPayload(guild, { forceImage: true }));
        return interaction.followUp({
          content: `${e('btn_error')} **PANIC** — ${registry.MODULES.length} protections armées, DEFCON **HAUT**.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.update(_hubPayload(guild));
    }

    if (section === 'confirm' && action === 'quarantine') {
      if (arg === 'yes' && arg2) {
        await interaction.deferUpdate();
        const { quarantineMember } = require('../../commands/audit-mod/quarantine');
        const target = await guild.members.fetch(arg2).catch(() => null);
        if (!target) {
          return interaction.editReply({ content: `${e('btn_error')} Membre introuvable (parti ?).`, components: [] });
        }
        const result = await quarantineMember(guild, target, interaction.user, 'Quarantine via dock SOC');
        if (!result.ok) {
          return interaction.editReply({ content: `${e('btn_error')} ${result.error}`, components: [] });
        }
        storage.logAction(guild.id, target.id, 'quarantine', 'none', `Quarantine via dock SOC par ${interaction.user.tag}`, null);
        invalidateCache(guild.id);
        return interaction.editReply({
          content: `${e('ui_lock')} **${target.user.tag}** isolé — ${result.savedRoles} rôle(s) sauvegardé(s). Libération : \`;unquarantine\`.`,
          components: [],
        });
      }
      return interaction.update({ content: `${e('btn_prev')} Quarantine annulée.`, components: [] });
    }

    if (section === 'confirm' && action === 'disableall') {
      if (arg === 'yes') {
        const active = registry.listModules(guild.id).filter(m => m.enabled);
        for (const mod of active) {
          registry.setEnabled(guild.id, mod.key, false, interaction.user.id);
        }
        await interaction.update(_hubPayload(guild));
        return interaction.followUp({
          content: `${e('btn_error')} **${active.length}** protection(s) désactivée(s) par <@${interaction.user.id}>.`,
          flags  : MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
        });
      }
      // 'no' → retour hub sans rien toucher
      return interaction.update(_hubPayload(guild));
    }

    // ── Anciens customIds (panel pré-V5 encore affiché quelque part) ──────
    return interaction.reply({
      content: `${e('btn_tip')} Ce panel date d'une version précédente — relance \`;security\` pour ouvrir le Studio V5.`,
      flags  : MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error('[security-studio]', err);
    const payload = {
      content: `${e('btn_error')} Erreur : ${err.message}`,
      flags  : MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(payload).catch(() => {});
    }
    return interaction.reply(payload).catch(() => {});
  }
}

function register(client) {
  client.buttonHandlers.set('security', handleSecurityStudioInteraction);
  client.selectHandlers.set('security', handleSecurityStudioInteraction);
}

module.exports = { handleSecurityStudioInteraction, register };
