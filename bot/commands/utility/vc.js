'use strict';

const {
  ChannelType, PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');
const E = require('../../utils/embeds');

// Sous-commandes tempvoc (si l'user est owner d'un salon temp, elles prennent le dessus)
const TEMPVOC_SUBS = new Set([
  'name', 'limit', 'lock', 'unlock', 'hide', 'show',
  'invite', 'uninvite', 'kick', 'ban', 'unban', 'transfer', 'claim',
]);

module.exports = {
  name       : 'vc',
  aliases    : ['vocal', 'voicelist'],
  category   : 'utility',
  description: 'Liste membres vocal · ou sous-commandes tempvoc (voir ;tempvoccmd).',
  usage      : ';vc [#vocal] · ;vc <name|lock|unlock|limit|invite|kick|transfer|claim|...>',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    // ── Dispatch tempvoc sub-commands ───────────────────────────────────────
    const maybeSub = (args[0] || '').toLowerCase();
    if (TEMPVOC_SUBS.has(maybeSub)) {
      return handleTempvocSubcommand(message, maybeSub, args.slice(1));
    }

    // ── Behavior originale : liste membres vocaux ───────────────────────────
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

// ── Sous-commandes tempvoc ────────────────────────────────────────────────────

function replyCt(message, content) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  return message.reply({ components: [ct], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
}

async function handleTempvocSubcommand(message, sub, args) {
  const storage = require('../../core/tempvoc-storage');
  const voice   = message.member.voice.channel;

  if (!voice) {
    return replyCt(message, `${e('btn_error')} Tu dois être dans un salon vocal temporaire.`);
  }
  const tv = storage.getTempVoc(voice.id);
  if (!tv) {
    return replyCt(message, `${e('btn_error')} Ce salon n'est pas un salon vocal temporaire.`);
  }

  const isOwner = tv.owner_id === message.author.id;

  // `claim` est la seule sous-commande accessible aux non-owners (si owner absent)
  if (sub === 'claim') {
    const ownerInChannel = voice.members.has(tv.owner_id);
    if (ownerInChannel) return replyCt(message, `${e('btn_error')} L'owner actuel est présent. Demande un \`;vc transfer\`.`);
    try {
      await voice.permissionOverwrites.edit(message.author.id, {
        ManageChannels: true, MoveMembers: true, MuteMembers: true, DeafenMembers: true,
        Connect: true, Speak: true, ViewChannel: true,
      });
      await voice.permissionOverwrites.delete(tv.owner_id).catch(() => {});
      storage.transferOwnership(voice.id, message.author.id);
      return replyCt(message, `${e('btn_success')} Tu es désormais **owner** de ${voice}.`);
    } catch (err) {
      return replyCt(message, `${e('btn_error')} Erreur : ${err.message}`);
    }
  }

  if (!isOwner) {
    return replyCt(message, `${e('btn_error')} Seul l'**owner** du salon peut utiliser cette commande. \`;vc claim\` si absent.`);
  }

  // ── Owner actions ─────────────────────────────────────────────────────────
  const target = message.mentions.users.first();

  try {
    if (sub === 'name') {
      const newName = args.join(' ').slice(0, 100);
      if (!newName) return replyCt(message, `${e('btn_error')} Usage : \`;vc name <nouveau nom>\``);
      await voice.setName(newName, 'TempVoc rename by owner');
      return replyCt(message, `${e('btn_success')} Salon renommé en **${newName}**.`);
    }

    if (sub === 'limit') {
      const n = parseInt(args[0], 10);
      if (Number.isNaN(n) || n < 0 || n > 99) return replyCt(message, `${e('btn_error')} Limite invalide (0-99).`);
      await voice.setUserLimit(n);
      return replyCt(message, `${e('btn_success')} Limite fixée à **${n || 'illimité'}**.`);
    }

    if (sub === 'lock') {
      await voice.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
      storage.setLocked(voice.id, true);
      return replyCt(message, `${e('ui_lock')} Salon verrouillé — personne ne peut plus rejoindre sans invite.`);
    }
    if (sub === 'unlock') {
      await voice.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
      storage.setLocked(voice.id, false);
      return replyCt(message, `${e('ui_unlock')} Salon déverrouillé.`);
    }

    if (sub === 'hide') {
      await voice.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
      storage.setHidden(voice.id, true);
      return replyCt(message, `${e('btn_success')} Salon caché.`);
    }
    if (sub === 'show') {
      await voice.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
      storage.setHidden(voice.id, false);
      return replyCt(message, `${e('btn_success')} Salon révélé.`);
    }

    if (sub === 'invite') {
      if (!target) return replyCt(message, `${e('btn_error')} Mentionne un user.`);
      await voice.permissionOverwrites.edit(target.id, { ViewChannel: true, Connect: true });
      return replyCt(message, `${e('btn_success')} ${target} invité dans le salon.`);
    }
    if (sub === 'uninvite') {
      if (!target) return replyCt(message, `${e('btn_error')} Mentionne un user.`);
      await voice.permissionOverwrites.delete(target.id).catch(() => {});
      return replyCt(message, `${e('btn_success')} Invitation de ${target} retirée.`);
    }

    if (sub === 'kick') {
      if (!target) return replyCt(message, `${e('btn_error')} Mentionne un user.`);
      const m = await message.guild.members.fetch(target.id).catch(() => null);
      if (m?.voice?.channelId === voice.id) await m.voice.disconnect('TempVoc kick').catch(() => {});
      return replyCt(message, `${e('btn_success')} ${target} déconnecté.`);
    }

    if (sub === 'ban') {
      if (!target) return replyCt(message, `${e('btn_error')} Mentionne un user.`);
      await voice.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false });
      const m = await message.guild.members.fetch(target.id).catch(() => null);
      if (m?.voice?.channelId === voice.id) await m.voice.disconnect('TempVoc ban').catch(() => {});
      return replyCt(message, `${e('cat_protection')} ${target} banni du salon.`);
    }
    if (sub === 'unban') {
      if (!target) return replyCt(message, `${e('btn_error')} Mentionne un user.`);
      await voice.permissionOverwrites.delete(target.id).catch(() => {});
      return replyCt(message, `${e('btn_success')} ${target} unban.`);
    }

    if (sub === 'transfer') {
      if (!target) return replyCt(message, `${e('btn_error')} Mentionne le nouvel owner.`);
      if (target.id === message.author.id) return replyCt(message, `${e('btn_error')} Tu ne peux pas te transférer à toi-même.`);
      const m = await message.guild.members.fetch(target.id).catch(() => null);
      if (!m || !voice.members.has(m.id)) return replyCt(message, `${e('btn_error')} ${target} doit être dans le salon.`);
      await voice.permissionOverwrites.edit(target.id, {
        ManageChannels: true, MoveMembers: true, MuteMembers: true, DeafenMembers: true,
        Connect: true, Speak: true, ViewChannel: true,
      });
      await voice.permissionOverwrites.delete(message.author.id).catch(() => {});
      storage.transferOwnership(voice.id, target.id);
      return replyCt(message, `${e('cat_owner')} Ownership transféré à ${target}.`);
    }
  } catch (err) {
    return replyCt(message, `${e('btn_error')} Erreur : ${err.message}`);
  }
}
