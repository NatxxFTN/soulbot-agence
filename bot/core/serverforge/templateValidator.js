'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE VALIDATOR — ServerForge
// ═══════════════════════════════════════════════════════════════════════════════
// Valide la structure du template.json avant toute génération pour éviter
// les erreurs en plein milieu du processus.
//
// Appelé au début de /generate, avant toute création.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valide un template complet et retourne la liste des erreurs.
 *
 * @param {object} template - Le template à valider (objet JSON parsé)
 * @returns {string[]} Tableau d'erreurs — vide si tout est valide
 *
 * @example
 * const errors = validateTemplate(template);
 * if (errors.length > 0) {
 *   return interaction.reply({ embeds: [E.error('Template invalide', errors.join('\n'))] });
 * }
 */
function validateTemplate(template) {
  const errors = [];

  // ── meta ─────────────────────────────────────────────────────────────────
  if (!template || typeof template !== 'object') {
    return ['Le template est vide ou invalide.'];
  }

  if (!template.meta || typeof template.meta !== 'object') {
    errors.push('meta : objet requis (name, description)');
  } else {
    if (!template.meta.name || typeof template.meta.name !== 'string') {
      errors.push('meta.name : nom du serveur requis (string)');
    }
  }

  // ── roles ────────────────────────────────────────────────────────────────
  if (!Array.isArray(template.roles)) {
    errors.push('roles : tableau requis');
  } else if (template.roles.length === 0) {
    errors.push('roles : au moins un rôle requis');
  } else {
    for (let i = 0; i < template.roles.length; i++) {
      const r = template.roles[i];
      if (!r.name || typeof r.name !== 'string') {
        errors.push(`roles[${i}] : name requis (string)`);
      }
      if (r.permissions && !Array.isArray(r.permissions)) {
        errors.push(`roles[${i}] ("${r.name || '?'}") : permissions doit être un tableau`);
      }
    }
  }

  // ── categories ───────────────────────────────────────────────────────────
  if (!Array.isArray(template.categories)) {
    errors.push('categories : tableau requis');
  } else {
    const channelNames = new Set(); // Pour détecter les doublons

    for (let i = 0; i < template.categories.length; i++) {
      const cat = template.categories[i];
      if (!cat.name || typeof cat.name !== 'string') {
        errors.push(`categories[${i}] : name requis (string)`);
      }

      if (!Array.isArray(cat.channels)) {
        errors.push(`categories[${i}] ("${cat.name || '?'}") : channels doit être un tableau`);
      } else {
        for (let j = 0; j < cat.channels.length; j++) {
          const ch = cat.channels[j];
          if (!ch.name || typeof ch.name !== 'string') {
            errors.push(`categories[${i}].channels[${j}] : name requis (string)`);
          } else {
            // Vérifie les doublons de noms (insensible à la casse)
            const lowerName = ch.name.toLowerCase();
            if (channelNames.has(lowerName)) {
              errors.push(`categories[${i}].channels[${j}] : nom "${ch.name}" en double`);
            }
            channelNames.add(lowerName);
          }

          if (!ch.type || !['text', 'voice', 'announcement', 'forum'].includes(ch.type)) {
            errors.push(`categories[${i}].channels[${j}] ("${ch.name || '?'}") : type invalide (text/voice)`);
          }

          // Vérifie les permissions référencées
          if (ch.permissions && typeof ch.permissions === 'object') {
            for (const roleName of Object.keys(ch.permissions)) {
              if (roleName !== 'everyone') {
                const exists = template.roles.some(r => r.name === roleName);
                if (!exists) {
                  errors.push(`categories[${i}].channels[${j}] : rôle "${roleName}" référencé dans permissions mais pas dans roles`);
                }
              }
            }
          }
        }
      }
    }
  }

  // ── logs ─────────────────────────────────────────────────────────────────
  if (template.logs !== undefined) {
    if (typeof template.logs !== 'object') {
      errors.push('logs : doit être un objet ou omis');
    } else if (template.logs.enabled) {
      if (!Array.isArray(template.logs.channels)) {
        errors.push('logs.channels : tableau requis');
      } else {
        for (let i = 0; i < template.logs.channels.length; i++) {
          const lc = template.logs.channels[i];
          if (!lc.name) errors.push(`logs.channels[${i}] : name requis`);
          if (!Array.isArray(lc.events) || lc.events.length === 0) {
            errors.push(`logs.channels[${i}] ("${lc.name || '?'}") : events requis (tableau non vide)`);
          }
        }
      }
    }
  }

  // ── welcome ──────────────────────────────────────────────────────────────
  if (template.welcome !== undefined) {
    if (typeof template.welcome !== 'object') {
      errors.push('welcome : doit être un objet ou omis');
    }
  }

  // ── rules ────────────────────────────────────────────────────────────────
  if (template.rules !== undefined) {
    if (typeof template.rules !== 'object') {
      errors.push('rules : doit être un objet ou omis');
    } else if (Array.isArray(template.rules.rules)) {
      for (let i = 0; i < template.rules.rules.length; i++) {
        if (typeof template.rules.rules[i] !== 'string') {
          errors.push(`rules.rules[${i}] : chaque règle doit être une chaîne de caractères`);
        }
      }
    }
  }

  return errors;
}

module.exports = { validateTemplate };
