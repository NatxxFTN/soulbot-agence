'use strict';

// ── Détecteur antilink — URLs HTTP/HTTPS (exclut les invites Discord) ────────

const URL_REGEX = /(https?:\/\/[^\s<>]+|(?<![\w@])(?:[a-z0-9-]+\.)+(?:com|fr|net|org|io|gg|xyz|app|dev|co|uk|de|es|it|ru|jp|cn|ca|au|br|in|mx|tv|me|tk|ml|ga|cf|online|shop|club|info|biz|top|vip|live|world|store|site|tech|space|fun|games|news|blog|media)(?:\/[^\s<>]*)?)/gi;

const DISCORD_INVITE_REGEX = /(?:discord(?:app)?\.com\/invite|discord\.gg|dsc\.gg|discord\.me|discord\.li)\//i;

module.exports = {
  async check(message, _config) {
    const content = message.content;
    if (!content || content.length < 4) return { triggered: false };

    URL_REGEX.lastIndex = 0;
    const matches = content.match(URL_REGEX);
    if (!matches || matches.length === 0) return { triggered: false };

    // Ignorer les invites Discord (feature antiinvite)
    const nonInviteLinks = matches.filter(url => !DISCORD_INVITE_REGEX.test(url));
    if (nonInviteLinks.length === 0) return { triggered: false };

    return {
      triggered: true,
      reason   : `Lien externe détecté : ${nonInviteLinks[0].slice(0, 80)}`,
    };
  },
};
