'use strict';

const {
  ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

module.exports = {
  name       : 'vc',
  aliases    : ['vocal', 'voicelist'],
  category   : 'utility',
  description: 'Affiche les membres connectés dans un salon vocal.',
  usage      : ';vc [#vocal]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    let channel = message.mentions.channels.first()
      ?? (args[0] ? message.guild.channels.cache.get(args[0]) : null)
      ?? message.member.voice.channel;

    if (!channel) {
      return message.reply({ embeds: [E.error('Salon introuvable', 'Rejoins un salon vocal ou mentionne-en un.')] });
    }

    if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
      return message.reply({ embeds: [E.error('Salon invalide', 'Spécifie un salon vocal valide.')] });
    }

    const members = [...channel.members.values()];
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);

    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ani_diamond')} **${channel.name}**`
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (members.length === 0) {
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_speaker')} Aucun membre connecté.`
      ));
    } else {
      const lines = members.map((m, i) => {
        const mic  = m.voice.selfMute  || m.voice.serverMute  ? '🔇' : '🎤';
        const deaf = m.voice.selfDeaf  || m.voice.serverDeaf  ? '🔕' : '';
        return `\`${String(i + 1).padStart(2, '0')}.\` ${mic}${deaf} ${m}`;
      });
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ui_members')} **${members.length}** membre(s) connecté(s)`
    ));

    await message.reply({
      components: [ct],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
