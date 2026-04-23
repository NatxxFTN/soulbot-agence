'use strict';

const storage = require('../core/wordchain-storage');

/** Supprime les accents et met en minuscule. */
function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Retourne la première lettre alphabétique d'un mot normalisé. */
function firstLetter(str) {
  const m = normalize(str).match(/[a-z]/);
  return m ? m[0] : null;
}

/** Retourne la dernière lettre alphabétique d'un mot normalisé. */
function lastLetter(str) {
  const norm = normalize(str);
  for (let i = norm.length - 1; i >= 0; i--) {
    if (/[a-z]/.test(norm[i])) return norm[i];
  }
  return null;
}

/** Vérifie que le contenu est un "mot" valide (pas une URL, pas un emoji pur, etc.) */
function isValidWord(content) {
  if (!content) return false;
  const trimmed = content.trim();
  // Ignore si commence par une mention, emoji custom, URL
  if (/^<[@#:]/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  // Doit contenir au moins une lettre
  if (!/[a-zA-Zà-ÿÀ-ß]/.test(trimmed)) return false;
  return true;
}

async function autoDelete(msg, ms) {
  setTimeout(() => {
    msg.delete().catch(() => {});
  }, ms);
}

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, _client) {
    try {
      if (!message.guild) return;
      if (message.author?.bot) return;
      if (!message.channel) return;

      const cfg = storage.getConfig(message.guild.id);
      if (!cfg || !cfg.enabled) return;
      if (!cfg.channel_id || cfg.channel_id !== message.channel.id) return;

      const content = (message.content || '').trim();

      // Commandes bot (préfixes ; ! etc) → on ne bloque pas les prefixes connus
      // Si le 1er caractère est non-alphabétique et pas un accent, on ignore le message.
      if (!isValidWord(content)) {
        // Pas de mot → on laisse le message mais on ne compte pas (le listener
        // wordchain ne sanctionne que les messages-mots).
        return;
      }

      const fLetter = firstLetter(content);
      const lLetter = lastLetter(content);
      if (!fLetter || !lLetter) return;

      // Même auteur que le précédent → interdit
      if (cfg.last_user_id && cfg.last_user_id === message.author.id) {
        await message.delete().catch(() => {});
        const notif = await message.channel.send({
          content: `${message.author}, attends qu'un autre joueur enchaîne avant de rejouer !`,
          allowedMentions: { users: [message.author.id] },
        }).catch(() => null);
        if (notif) autoDelete(notif, 5000);
        return;
      }

      // Vérification de la lettre
      if (cfg.last_letter && fLetter !== cfg.last_letter) {
        const brokenAt = cfg.current_chain;
        await message.delete().catch(() => {});
        storage.incrementBreak(message.guild.id, message.author.id);

        // Best chain update avant reset
        const patch = { current_chain: 0, last_letter: null, last_user_id: null };
        if (brokenAt > (cfg.best_chain || 0)) {
          patch.best_chain = brokenAt;
          patch.best_chain_ended_at = Date.now();
        }
        storage.setConfig(message.guild.id, patch);

        const notif = await message.channel.send({
          content: `❌ ${message.author} a rompu la chaîne ! (${brokenAt} message${brokenAt > 1 ? 's' : ''})\nLa prochaine lettre attendue était **${cfg.last_letter.toUpperCase()}**.`,
          allowedMentions: { users: [message.author.id] },
        }).catch(() => null);
        if (notif) autoDelete(notif, 10000);
        return;
      }

      // Message valide
      const newChain = (cfg.current_chain || 0) + 1;
      const patch = {
        current_chain: newChain,
        last_letter  : lLetter,
        last_user_id : message.author.id,
      };
      // Nouveau record ?
      let newRecord = false;
      if (newChain > (cfg.best_chain || 0)) {
        patch.best_chain = newChain;
        newRecord = true;
      }
      storage.setConfig(message.guild.id, patch);
      storage.incrementContribution(message.guild.id, message.author.id);

      // Célébration d'un nouveau record tous les 10 messages
      if (newRecord && newChain % 10 === 0 && newChain >= 10) {
        const notif = await message.channel.send({
          content: `🏆 Nouveau record : **${newChain} messages** enchaînés !`,
        }).catch(() => null);
        if (notif) autoDelete(notif, 15000);
      }
    } catch (err) {
      console.error('[wordchain-listener]', err);
    }
  },
};
