'use strict';

// ── Détecteur antiduplicate — messages identiques répétés (cache mémoire) ────
// Fenêtre glissante 60s par user. Cache auto-nettoyé toutes les 5 min.

const userMessages = new Map(); // userId -> { messages: [{content, time}], lastSeen }

setInterval(() => {
  const now = Date.now();
  const TTL = 5 * 60 * 1000;
  for (const [uid, data] of userMessages) {
    if (now - data.lastSeen > TTL) userMessages.delete(uid);
  }
}, 5 * 60 * 1000).unref?.();

const WINDOW_MS = 60 * 1000;

module.exports = {
  async check(message, config) {
    const threshold = Number(config?.threshold) || 3;

    const content = message.content?.trim().toLowerCase();
    if (!content || content.length < 3) return { triggered: false };

    const userId = message.author.id;
    const now    = Date.now();

    if (!userMessages.has(userId)) {
      userMessages.set(userId, { messages: [], lastSeen: now });
    }
    const userData = userMessages.get(userId);
    userData.lastSeen = now;

    userData.messages = userData.messages.filter(m => now - m.time < WINDOW_MS);
    userData.messages.push({ content, time: now });

    const dupCount = userData.messages.filter(m => m.content === content).length;
    if (dupCount >= threshold) {
      userData.messages = []; // reset pour éviter re-trigger immédiat
      return {
        triggered: true,
        reason   : `Message identique répété ${dupCount}× en < 60s`,
      };
    }
    return { triggered: false };
  },
};
