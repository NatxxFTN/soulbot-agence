'use strict';

const L = require('../core/logs-helper');

const TYPE_LABELS = {
  0  : 'Texte',
  2  : 'Vocal',
  4  : 'Catégorie',
  5  : 'Annonce',
  10 : 'Thread annonce',
  11 : 'Thread public',
  12 : 'Thread privé',
  13 : 'Scène',
  15 : 'Forum',
  16 : 'Média',
};

module.exports = {
  name : 'channelDelete',

  async execute(channel) {
    if (!channel.guild) return;

    const typeLabel = TYPE_LABELS[channel.type] ?? `Type ${channel.type}`;

    await L.log(channel.guild, 'channel_delete', {
      description: `Le salon **#${channel.name}** a été supprimé.`,
      fields: [
        { name: 'Nom',       value: `\`#${channel.name}\``,  inline: true },
        { name: 'ID',        value: `\`${channel.id}\``,     inline: true },
        { name: 'Type',      value: typeLabel,               inline: true },
        { name: 'Catégorie', value: channel.parent?.name ?? '*aucune*', inline: true },
      ],
      summary: `Salon supprimé : #${channel.name} (${typeLabel})`,
    });
  },
};
