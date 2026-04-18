'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name      : 'serverinfo',
  aliases   : ['si', 'server'],
  description: 'Informations détaillées sur le serveur.',
  usage     : ';serverinfo',
  cooldown  : 10,
  guildOnly : true,

  async execute(message) {
    const g = message.guild;

    // Fetch membres pour avoir le count exact (pas juste le cache)
    await g.members.fetch().catch(() => {});
    const bots   = g.members.cache.filter(m => m.user.bot).size;
    const humans = g.memberCount - bots;

    const embed = E.base()
      .setTitle(g.name)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: 'Propriétaire',  value: `<@${g.ownerId}>`,                                           inline: true },
        { name: 'Créé le',       value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`,            inline: true },
        { name: 'Région',        value: g.preferredLocale,                                            inline: true },
        { name: 'Membres',       value: `${humans} humains · ${bots} bots`,                          inline: true },
        { name: 'Salons',        value: `${g.channels.cache.size}`,                                  inline: true },
        { name: 'Rôles',         value: `${g.roles.cache.size}`,                                     inline: true },
        { name: 'Emojis',        value: `${g.emojis.cache.size}`,                                    inline: true },
        { name: 'Boosts',        value: `Niveau ${g.premiumTier} · ${g.premiumSubscriptionCount}`,   inline: true },
        { name: 'Vérification',  value: g.verificationLevel.toString(),                              inline: true },
      )
      .setFooter({ text: `ID : ${g.id}` });

    message.channel.send({ embeds: [embed] });
  },
};
