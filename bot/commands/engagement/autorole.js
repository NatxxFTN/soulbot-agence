'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const { db } = require('../../database');

const STMT_LIST = db.prepare('SELECT role_id FROM guild_autoroles WHERE guild_id = ?');
const STMT_INS = db.prepare('INSERT OR IGNORE INTO guild_autoroles (guild_id, role_id, added_by) VALUES (?, ?, ?)');
const STMT_DEL = db.prepare('DELETE FROM guild_autoroles WHERE guild_id = ? AND role_id = ?');
const STMT_COUNT = db.prepare('SELECT COUNT(*) AS n FROM guild_autoroles WHERE guild_id = ?');

const MAX_AUTOROLES = 5;

function panel(title, body) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));
  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }
  return container;
}

function replyPanel(message, title, body) {
  return message.reply({
    components: [panel(title, body)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

module.exports = {
  name       : 'autorole',
  aliases    : ['autorl'],
  description: 'Donne automatiquement un rôle à chaque nouveau membre (max 5).',
  usage      : ';autorole <add|remove|list> <@role>',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageRoles'],

  async execute(message, args) {
    const sub = (args[0] || 'list').toLowerCase();
    const guildId = message.guild.id;

    if (sub === 'list') {
      const rows = STMT_LIST.all(guildId);
      const lines = rows.length ? rows.map(r => `<@&${r.role_id}>`).join('\n') : '_aucun_';
      return replyPanel(message, `${e('cat_configuration')} **Autoroles**`, lines);
    }

    if (sub === 'add' || sub === 'remove') {
      const role = message.mentions.roles.first();
      if (!role) return replyPanel(message, `${e('btn_error')} **Rôle manquant**`, 'Mentionne un rôle.');

      if (sub === 'add') {
        const { n } = STMT_COUNT.get(guildId);
        if (n >= MAX_AUTOROLES) {
          return replyPanel(message, `${e('btn_error')} **Limite atteinte**`, `Max ${MAX_AUTOROLES} autoroles.`);
        }
        if (role.position >= message.guild.members.me.roles.highest.position) {
          return replyPanel(message, `${e('btn_error')} **Hiérarchie**`, 'Mon rôle doit être au-dessus.');
        }
        STMT_INS.run(guildId, role.id, message.author.id);
        return replyPanel(message, `${e('btn_success')} **Autorole ajouté**`, `${role} sera donné aux nouveaux membres.`);
      }
      STMT_DEL.run(guildId, role.id);
      return replyPanel(message, `${e('btn_success')} **Autorole retiré**`, `${role} ne sera plus donné.`);
    }

    return replyPanel(message, `${e('btn_error')} **Usage**`, '`;autorole <add|remove|list> <@role>`');
  },
};
