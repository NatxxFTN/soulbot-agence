'use strict';

const V3 = require('../../core/logs-v3-helper');
const {
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

module.exports = {
  name       : 'logstest',
  aliases    : ['testlogs', 'logtest'],
  description: 'Envoyer un log de test dans le salon configuré (sans déclencher d\'action réelle).',
  usage      : ';logstest [event_type]',
  cooldown   : 5,
  guildOnly  : true,
  permissions: ['ManageGuild'],

  async execute(message, args) {
    const cfg = V3.getConfig(message.guild.id);
    if (!cfg.default_channel_id) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Non configuré',
        description: 'Lance d\'abord `;logssetup`.',
        category: 'Logs V3',
      })));
    }

    const all = Object.keys(V3.EVENT_TYPES);
    const requested = (args[0] ?? '').toLowerCase();
    const eventType = requested && all.includes(requested) ? requested : 'member_join';

    if (requested && !all.includes(requested)) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Event inconnu',
        description: `\`${requested}\` n'est pas un event valide.`,
        category: 'Logs V3',
      })));
    }

    if (!V3.isEventEnabled(message.guild.id, eventType)) {
      return message.reply(toEmbedReply(warningEmbed({
        title: 'Event désactivé',
        description: `L'event \`${eventType}\` est désactivé. Active avec \`;logstoggle ${eventType}\`.`,
        category: 'Logs V3',
      })));
    }

    // Construire des données factices selon l'event type
    const fakeUser = message.author;
    const fakeMember = message.member;
    const baseData = {
      summary: `🧪 Test ${eventType} par ${message.author.tag}`,
      isBot  : false,
      _testMode: true,
    };

    let payload = { ...baseData };
    switch (eventType) {
      case 'message_create':
      case 'message_delete':
        payload = { ...payload, author: fakeUser, member: fakeMember, channel: message.channel,
                    content: '🧪 Message de test (fake)', messageId: message.id, timestamp: Date.now(),
                    attachments: [], embedsCount: 0, stickersCount: 0,
                    mentions: { users: 0, roles: 0, channels: 0, everyone: false },
                    messageUrl: message.url };
        break;
      case 'message_edit':
        payload = { ...payload, author: fakeUser, member: fakeMember, channel: message.channel,
                    oldContent: 'avant test', newContent: 'après test', messageId: message.id, messageUrl: message.url };
        break;
      case 'message_bulk_delete':
        payload = { ...payload, channel: message.channel, count: 42, executor: fakeUser };
        break;
      case 'member_join':
      case 'member_leave':
        payload = { ...payload, user: fakeUser, member: fakeMember };
        break;
      case 'member_ban':
      case 'member_unban':
      case 'member_kick':
        payload = { ...payload, user: fakeUser, member: fakeMember, executor: fakeUser, reason: '🧪 Test' };
        break;
      case 'member_nickname_change':
        payload = { ...payload, user: fakeUser, member: fakeMember, oldNickname: 'avant', newNickname: 'après' };
        break;
      case 'role_create':
      case 'role_delete':
      case 'role_update':
        payload = { ...payload, roleId: '0000000000000000', name: 'Test Role', color: 0xFF0000,
                    position: 1, permissions: ['SendMessages'], mentionable: true, hoist: false, managed: false,
                    diffs: ['**Couleur** : `#000000` → `#FF0000`'], memberCount: 0 };
        break;
      case 'channel_create':
      case 'channel_delete':
      case 'channel_update':
        payload = { ...payload, channelId: message.channel.id, name: 'test-channel',
                    typeLabel: 'Texte', parentName: null, executor: fakeUser, diffs: ['**Slowmode** : 0s → 5s'] };
        break;
      case 'voice_join':
      case 'voice_leave':
        payload = { ...payload, user: fakeUser, member: fakeMember, channelId: '0000000000000000', channelName: 'Test Vocal' };
        break;
      case 'voice_move':
        payload = { ...payload, user: fakeUser, member: fakeMember,
                    fromChannelId: '0000000000000000', fromName: 'Vocal A',
                    toChannelId: '0000000000000001', toName: 'Vocal B' };
        break;
      case 'mod_warn':
      case 'mod_mute':
      case 'mod_unmute':
      case 'mod_timeout':
        payload = { ...payload, user: fakeUser, member: fakeMember, executor: fakeUser, reason: '🧪 Test',
                    duration: '10 min', warnCount: 1 };
        break;
      case 'boost_add':
        payload = { ...payload, user: fakeUser, member: fakeMember };
        break;
      case 'invite_create':
        payload = { ...payload, code: 'TEST1234', inviter: fakeUser, channelId: message.channel.id,
                    maxUses: 0, maxAge: 0, expiresTimestamp: null, temporary: false };
        break;
      case 'emoji_update':
        payload = { ...payload, added: [{ name: 'test_emoji', toString: () => '🧪' }] };
        break;
      case 'server_update':
        payload = { ...payload, diffs: ['**Nom** : `avant` → `après`'], executor: fakeUser };
        break;
    }

    V3.log(message.guild, eventType, payload);

    const targetChannel = V3.getEventChannel(message.guild.id, eventType);
    return message.reply(toEmbedReply(successEmbed({
      title       : 'Log de test envoyé',
      description : `Vérifie <#${targetChannel}> — un log \`${eventType}\` de test devrait être visible.`,
      fields      : [
        { name: '🧪 Event testé', value: `\`${eventType}\``,    inline: true },
        { name: '📍 Destination', value: `<#${targetChannel}>`, inline: true },
      ],
      user        : message.author,
      category    : 'Logs V3',
    })));
  },
};
