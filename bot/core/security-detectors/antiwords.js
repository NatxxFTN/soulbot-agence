'use strict';

// ── Détecteur antiwords — filtre de mots interdits custom par serveur ────────
// custom_data JSON : { words: ["mot1", "mot2", ...] } · matching mot entier, CI.

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
  async check(message, config) {
    const { words } = parseCustomData(config?.custom_data);
    if (words.length === 0) return { triggered: false };

    const content = (message.content || '').toLowerCase();
    if (!content) return { triggered: false };

    for (const raw of words) {
      const w = String(raw).toLowerCase().trim();
      if (!w) continue;
      const regex = new RegExp(`\\b${escapeRegex(w)}\\b`, 'i');
      if (regex.test(content)) {
        return { triggered: true, reason: `Mot interdit détecté : "${w}"` };
      }
    }
    return { triggered: false };
  },
};
