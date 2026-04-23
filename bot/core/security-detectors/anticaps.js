'use strict';

// ── Détecteur anticaps — % majuscules ≥ seuil ───────────────────────────────
// Ignore si <8 caractères alphabétiques (laisse passer "OK", "LOL", …).

module.exports = {
  async check(message, config) {
    const content = message.content || '';
    if (content.length < 8) return { triggered: false };

    const threshold = Number(config?.threshold) || 70;

    const letters = content.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (letters.length < 8) return { triggered: false };

    const upper = (letters.match(/[A-ZÀ-Þ]/g) || []).length;
    const pct   = (upper / letters.length) * 100;

    if (pct >= threshold) {
      return {
        triggered: true,
        reason   : `Abus de majuscules (${Math.round(pct)}% CAPS, seuil ${threshold}%)`,
      };
    }
    return { triggered: false };
  },
};
