'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

module.exports = {
  name       : 'tempvoccmd',
  aliases    : ['vccmd', 'vchelp'],
  category   : 'utility',
  description: 'Liste des commandes disponibles dans ton salon vocal temporaire.',
  usage      : ';tempvoccmd',
  cooldown   : 3,
  guildOnly  : true,

  async execute(message) {
    const ct = new ContainerBuilder().setAccentColor(0xFF0000);
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('ani_diamond')} **Commandes Salon Vocal Temp** ${e('ani_diamond')}`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('cat_information')} Tu dois être **owner** du salon temp pour utiliser ces commandes.\n` +
      `${e('btn_tip')} Un owner peut aussi transférer ses droits à un autre membre.`,
    ));
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const lines = [
      `${e('btn_edit')} \`;vc name <nom>\` — renomme le salon`,
      `${e('ui_user')} \`;vc limit <0-99>\` — limite de users (0 = illimité)`,
      `${e('ui_lock')} \`;vc lock\` / \`;vc unlock\` — verrouille / ouvre la connexion`,
      `${e('ui_eye')} \`;vc hide\` / \`;vc show\` — cache / révèle le salon`,
      `${e('btn_success')} \`;vc invite @user\` — autorise un user à rejoindre`,
      `${e('btn_error')} \`;vc uninvite @user\` — retire l'invitation`,
      `${e('btn_trash')} \`;vc kick @user\` — déconnecte un user`,
      `${e('cat_protection')} \`;vc ban @user\` — ban + déconnecte`,
      `${e('btn_success')} \`;vc unban @user\` — retire le ban`,
      `${e('ui_user')} \`;vc transfer @user\` — donne ownership`,
      `${e('cat_owner')} \`;vc claim\` — claim ownership si owner absent`,
    ];
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_help')} Config admin : \`;tempvoc\` (ManageGuild requis)`,
    ));

    await message.reply({
      components: [ct],
      flags     : MessageFlags.IsComponentsV2,
      allowedMentions: { repliedUser: false },
    });
  },
};
