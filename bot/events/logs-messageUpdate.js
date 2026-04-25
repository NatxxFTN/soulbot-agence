'use strict';

const L = require('../core/logs-helper');

module.exports = {
  name : 'messageUpdate',

  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return; // edit sans texte (embed, pin, etc.)

    const before = (oldMessage.content || '').slice(0, 900) || '*(vide)*';
    const after  = (newMessage.content || '').slice(0, 900) || '*(vide)*';

    await L.log(newMessage.guild, 'message_edit', {
      description: `**Avant :**\n${before}\n\n**Après :**\n${after}`,
      fields: [
        { name: 'Auteur', value: `${newMessage.author.tag} (\`${newMessage.author.id}\`)`, inline: true },
        { name: 'Salon',  value: newMessage.channel.toString(),                            inline: true },
        { name: 'Lien',   value: `[Aller au message](${newMessage.url})`,                  inline: true },
      ],
      summary: `${newMessage.author.tag} — édité dans #${newMessage.channel?.name ?? '?'}`,
    });
  },
};
