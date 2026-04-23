'use strict';

// ── Détecteur antinsfw — mots marqueurs (defaults neutres + custom) ──────────
// Liste neutre par défaut, extensible via custom_data. Ignore les salons
// marqués NSFW côté Discord.

const DEFAULT_NSFW_WORDS = [
  'nsfw', 'porn', 'porno', 'xxx', 'nudes', 'nude', 'sex', 'sexe',
  'hentai', 'rule34', 'r34', 'onlyfans', 'camgirl',
];

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCustomData(raw) {
  if (!raw) return { words: [] };
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { words: Array.isArray(obj?.words) ? obj.words : [] };
  } catch { return { words: [] }; }
}

module.exports = {
  DEFAULT_NSFW_WORDS,

  async check(message, config) {
    if (message.channel?.nsfw) return { triggered: false };

    const content = (message.content || '').toLowerCase();
    if (content.length < 3) return { triggered: false };

    const { words: customWords } = parseCustomData(config?.custom_data);
    const all = [...DEFAULT_NSFW_WORDS, ...customWords.map(w => String(w).toLowerCase())];

    for (const w of all) {
      if (!w) continue;
      const regex = new RegExp(`\\b${escapeRegex(w)}\\b`, 'i');
      if (regex.test(content)) {
        return { triggered: true, reason: `Contenu NSFW détecté (mot "${w}")` };
      }
    }
    return { triggered: false };
  },
};
