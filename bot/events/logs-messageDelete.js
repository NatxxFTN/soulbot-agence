'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'messageDelete',

  async execute(message) {
    if (!message.guild || message.partial || message.author?.bot) return;

    const content = message.content ? message.content.slice(0, 1000) : '*(contenu vide ou non-texte)*';
    const summary = `${message.author?.tag ?? 'Inconnu'} — #${message.channel?.name ?? '?'} — ${content.slice(0, 60)}`;

    await L.log(message.guild, 'message_delete', {
      description: content,
      fields: [
        { name: 'Auteur', value: message.author ? `${message.author.tag} (\`${message.author.id}\`)` : 'Inconnu', inline: true },
        { name: 'Salon',  value: message.channel?.toString() ?? '*inconnu*',                                     inline: true },
        { name: 'ID msg', value: `\`${message.id}\``,                                                            inline: true },
      ],
      summary,
    });
  },
};
