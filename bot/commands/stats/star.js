'use strict';

const { db, getGuildSettings, setGuildSetting } = require('../../database');
const { e } = require('../../core/emojis');
const V2 = require('./_components-v2');

/*
 * ;star on                     — Activer le starboard
 * ;star off                    — Désactiver le starboard
 * ;star channel #salon         — Définir le salon starboard
 * ;star threshold <n>          — Modifier le seuil (ex: 3)
 * ;star emoji <emoji>          — Modifier l'emoji utilisé
 * ;star roles                  — Lister les rôles allow/deny
 * ;star allow @role            — Autoriser un rôle à voter
 * ;star deny  @role            — Interdire un rôle de voter
 * ;star remove @role           — Retirer un rôle allow/deny
 */
module.exports = {
  name        : 'star',
  aliases     : ['starconfig'],
  description : 'Configure le système Starboard.',
  usage       : 'star <on|off|channel|threshold|emoji|roles|allow|deny|remove>',
  cooldown    : 3,
  guildOnly  : true,
  permissions : ['ManageGuild'],

  async execute(message, args, client) {
    const guildId  = message.guild.id;
    const action   = (args[0] ?? 'info').toLowerCase();
    const settings = getGuildSettings(guildId);

    // ── Info ──────────────────────────────────────────────────────────────────
    if (action === 'info' || action === 'status') {
      return V2.reply(message, _buildInfoPanel(message.guild, settings, db));
    }

    // ── on / off ──────────────────────────────────────────────────────────────
    if (action === 'on' || action === 'enable') {
      if (!settings.star_channel_id) {
        return V2.reply(message, V2.error('Canal manquant', 'Définis d\'abord un salon avec `;star channel #salon`.'));
      }
      setGuildSetting(guildId, 'star_enabled', 1);
      return V2.reply(message, V2.success('Starboard activé', `Le starboard est maintenant actif dans <#${settings.star_channel_id}>.`));
    }

    if (action === 'off' || action === 'disable') {
      setGuildSetting(guildId, 'star_enabled', 0);
      return V2.reply(message, V2.success('Starboard désactivé', 'Le starboard a été désactivé.'));
    }

    // ── channel #salon ────────────────────────────────────────────────────────
    if (action === 'channel' || action === 'salon') {
      const channel = message.mentions.channels.first();
      if (!channel) return V2.reply(message, V2.usage(';', 'star channel #salon', ''));
      setGuildSetting(guildId, 'star_channel_id', channel.id);
      return V2.reply(message, V2.success('Salon défini', `Le starboard postera dans ${channel}.`));
    }

    // ── threshold <n> ─────────────────────────────────────────────────────────
    if (action === 'threshold' || action === 'seuil') {
      const n = parseInt(args[1]);
      if (!n || n < 1 || n > 50) return V2.reply(message, V2.error('Valeur invalide', 'Le seuil doit être entre 1 et 50.'));
      setGuildSetting(guildId, 'star_threshold', n);
      return V2.reply(message, V2.success('Seuil mis à jour', `Il faudra maintenant **${n}** ${settings.star_emoji} pour apparaître dans le starboard.`));
    }

    // ── emoji <emoji> ─────────────────────────────────────────────────────────
    if (action === 'emoji') {
      const emoji = args[1];
      if (!emoji) return V2.reply(message, V2.usage(';', 'star emoji <emoji>', ''));
      setGuildSetting(guildId, 'star_emoji', emoji);
      return V2.reply(message, V2.success('Emoji mis à jour', `L'emoji est maintenant : ${emoji}`));
    }

    // ── roles (lister) ────────────────────────────────────────────────────────
    if (action === 'roles') {
      const allowRows = db.prepare("SELECT role_id FROM star_role_permissions WHERE guild_id = ? AND permission = 'allow'").all(guildId);
      const denyRows  = db.prepare("SELECT role_id FROM star_role_permissions WHERE guild_id = ? AND permission = 'deny'").all(guildId);

      const allows = allowRows.map(r => `<@&${r.role_id}>`).join(', ') || '*Aucun (tous autorisés)*';
      const denies = denyRows.map(r => `<@&${r.role_id}>`).join(', ')  || '*Aucun*';

      return V2.reply(message, V2.panel(
        '**Starboard — Permissions rôles**',
        V2.fieldBlock([
          { name: `${e('btn_success')} Rôles autorisés`, value: allows },
          { name: `${e('ui_lock')} Rôles interdits`, value: denies },
        ]),
      ));
    }

    // ── allow @role ───────────────────────────────────────────────────────────
    if (action === 'allow') {
      const role = message.mentions.roles.first();
      if (!role) return V2.reply(message, V2.usage(';', 'star allow @role', ''));

      db.prepare('DELETE FROM star_role_permissions WHERE guild_id = ? AND role_id = ?').run(guildId, role.id);
      db.prepare("INSERT INTO star_role_permissions (guild_id, role_id, permission) VALUES (?, ?, 'allow')").run(guildId, role.id);
      return V2.reply(message, V2.success('Rôle autorisé', `${role} peut désormais voter dans le starboard.`));
    }

    // ── deny @role ────────────────────────────────────────────────────────────
    if (action === 'deny') {
      const role = message.mentions.roles.first();
      if (!role) return V2.reply(message, V2.usage(';', 'star deny @role', ''));

      db.prepare('DELETE FROM star_role_permissions WHERE guild_id = ? AND role_id = ?').run(guildId, role.id);
      db.prepare("INSERT INTO star_role_permissions (guild_id, role_id, permission) VALUES (?, ?, 'deny')").run(guildId, role.id);
      return V2.reply(message, V2.success('Rôle interdit', `${role} ne peut plus voter dans le starboard.`));
    }

    // ── remove @role ──────────────────────────────────────────────────────────
    if (action === 'remove' || action === 'del') {
      const role = message.mentions.roles.first();
      if (!role) return V2.reply(message, V2.usage(';', 'star remove @role', ''));

      const deleted = db.prepare('DELETE FROM star_role_permissions WHERE guild_id = ? AND role_id = ?').run(guildId, role.id);
      if (!deleted.changes) {
        return V2.reply(message, V2.error('Introuvable', `${role} n'était pas dans la liste des permissions.`));
      }
      return V2.reply(message, V2.success('Permission retirée', `${role} a été retiré de la liste.`));
    }

    return V2.reply(message, _buildInfoPanel(message.guild, settings, db));
  },
};

// ─── Panel d'info ─────────────────────────────────────────────────────────────
function _buildInfoPanel(guild, settings, db) {
  const guildId    = guild.id;
  const starChan   = settings.star_channel_id ? `<#${settings.star_channel_id}>` : '*Non défini*';
  const entryCount = db.prepare('SELECT COUNT(*) AS c FROM starboard_entries WHERE guild_id = ?').get(guildId).c;

  return V2.panel('**Configuration Starboard**', V2.fieldBlock([
    { name: 'Statut', value: settings.star_enabled ? `${e('btn_success')} Actif` : 'Inactif' },
    { name: 'Salon', value: starChan },
    { name: 'Emoji', value: settings.star_emoji },
    { name: 'Seuil', value: `${settings.star_threshold} réaction(s)` },
    { name: 'Entrées', value: `${entryCount} message(s) archivé(s)` },
  ]));
}
