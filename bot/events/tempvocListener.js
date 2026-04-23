'use strict';

const { ChannelType, PermissionFlagsBits } = require('discord.js');
const storage = require('../core/tempvoc-storage');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,

  async execute(oldState, newState, _client) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const config = storage.getConfig(guild.id);
    if (!config || !config.enabled || !config.hub_channel_id) return;

    // ── User rejoint le hub → créer salon temp ───────────────────────────
    if (
      newState.channelId === config.hub_channel_id &&
      oldState.channelId !== config.hub_channel_id
    ) {
      try {
        const member = newState.member;
        if (!member) return;

        const name = String(config.default_name_template || '🎮 Salon de {user}')
          .replace('{user}', member.displayName || member.user.username)
          .slice(0, 100);

        const parentId = config.category_id || newState.channel.parentId || null;

        const newChannel = await guild.channels.create({
          name,
          type      : ChannelType.GuildVoice,
          parent    : parentId,
          userLimit : config.default_user_limit || 0,
          permissionOverwrites: [
            {
              id    : member.id,
              allow : [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
              ],
            },
          ],
        });

        await member.voice.setChannel(newChannel).catch(() => {});
        storage.createTempVoc(newChannel.id, guild.id, member.id);
      } catch (err) {
        console.error('[tempvoc-create]', err.message);
      }
      return;
    }

    // ── User quitte un salon temp → check vide / transfert ──────────────
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      const tv = storage.getTempVoc(oldState.channelId);
      if (!tv) return;

      const channel = guild.channels.cache.get(oldState.channelId);
      if (!channel) { storage.deleteTempVoc(oldState.channelId); return; }

      // Salon vide → supprimer
      if (channel.members.size === 0) {
        if (config.delete_when_empty) {
          try {
            await channel.delete('TempVoc: salon vide');
            storage.deleteTempVoc(oldState.channelId);
          } catch {}
        }
        return;
      }

      // Owner parti mais salon non vide → transfert auto au premier membre
      if (config.transfer_on_leave && oldState.member?.id === tv.owner_id) {
        const newOwner = channel.members.first();
        if (newOwner) {
          try {
            await channel.permissionOverwrites.edit(newOwner.id, {
              ManageChannels : true,
              MoveMembers    : true,
              MuteMembers    : true,
              DeafenMembers  : true,
              Connect        : true,
              Speak          : true,
              ViewChannel    : true,
            });
            await channel.permissionOverwrites.delete(tv.owner_id).catch(() => {});
            storage.transferOwnership(oldState.channelId, newOwner.id);
          } catch (err) {
            console.error('[tempvoc-transfer]', err.message);
          }
        }
      }
    }
  },
};
