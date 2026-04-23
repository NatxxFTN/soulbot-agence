'use strict';

// ── Détecteur antiemojispam — trop d'emojis (Unicode + custom Discord) ────────

const UNICODE_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F2FF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]/gu;
const CUSTOM_EMOJI_REGEX  = /<a?:[\w]+:\d+>/g;

module.exports = {
  async check(message, config) {
    const content = message.content || '';
    if (!content) return { triggered: false };

    const threshold = Number(config?.threshold) || 10;

    const uni     = (content.match(UNICODE_EMOJI_REGEX) || []).length;
    const custom  = (content.match(CUSTOM_EMOJI_REGEX)  || []).length;
    const total   = uni + custom;

    if (total >= threshold) {
      return {
        triggered: true,
        reason   : `Trop d'emojis (${total} détectés, seuil ${threshold})`,
      };
    }
    return { triggered: false };
  },
};
