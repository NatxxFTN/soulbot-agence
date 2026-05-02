'use strict';

const V3 = require('../../core/logs-v3-helper');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'logstoggle',
  aliases    : ['logtoggle', 'togglelog', 'togglelogs'],
  description: 'Activer/désactiver un event de logs (ou tous avec `all on|off`).',
  usage      : ';logstoggle <event_type | all on|off>',
  cooldown   : 3,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const cfg = V3.getConfig(message.guild.id);
    if (!cfg.default_channel_id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Non configuré',
        description: 'Lance d\'abord `;logssetup` pour créer la catégorie + salons.',
        category: 'Logs V3',
      })));
    }

    const all = Object.keys(V3.EVENT_TYPES);
    const first = (args[0] ?? '').toLowerCase();

    // ── all on | all off ────────────────────────────────────────
    if (first === 'all' || first === 'tout') {
      const mode = (args[1] ?? '').toLowerCase();
      if (!['on', 'off'].includes(mode)) {
        return message.reply(toEmbedReply(warningEmbed({
          title: 'Usage',
          description: '`;logstoggle all on|off`',
          category: 'Logs V3',
        })));
      }
      const enable = mode === 'on';
      V3.toggleAll(message.guild.id, enable);
      return message.reply(toEmbedReply(successEmbed({
        title       : `Tous les events ${enable ? 'activés' : 'désactivés'}`,
        description : `**${all.length}** event(s) traité(s).`,
        fields      : [
          { name: '⚙️ Nouvel état', value: enable ? '🟢 Tous ON' : '🔴 Tous OFF', inline: true },
          { name: '👤 Par',         value: message.author.tag,                    inline: true },
        ],
        user        : message.author,
        category    : 'Logs V3',
      })));
    }

    if (!first) {
      const list = all.map(t => `\`${t}\``).join(', ');
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Usage',
        description: `\`;logstoggle <event_type | all on|off>\`\n\n**Events valides (${all.length}) :** ${list}`,
        category: 'Logs V3',
      })));
    }

    if (!all.includes(first)) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Event inconnu',
        description: `\`${first}\` n'est pas un event valide. Utilise \`;logs\` pour voir la liste.`,
        category: 'Logs V3',
      })));
    }

    const currentState = V3.isEventEnabled(message.guild.id, first);
    const newState = V3.toggleEvent(message.guild.id, first, !currentState);
    const meta = V3.EVENT_TYPES[first];

    return message.reply(toEmbedReply(successEmbed({
      title       : `Event ${newState ? 'activé' : 'désactivé'}`,
      description : `${meta.icon} **${meta.label}**`,
      fields      : [
        { name: '⚙️ Event',       value: `\`${first}\``,                inline: true },
        { name: '🔄 Nouvel état', value: newState ? '🟢 ON' : '🔴 OFF', inline: true },
        { name: '👤 Par',         value: message.author.tag,            inline: true },
      ],
      user        : message.author,
      category    : 'Logs V3',
    })));
  },
};
