'use strict';

// ── Embed Builder — Validator ─────────────────────────────────────────────────
// Valide les limites Discord pour un embedData avant envoi.

const URL_RE = /^https?:\/\/.+/i;

function isValidUrl(str) {
  return typeof str === 'string' && URL_RE.test(str);
}

function countStr(val) {
  return typeof val === 'string' ? val.length : 0;
}

/**
 * @param {object} embed
 * @returns {{ valid: boolean, errors: string[], warnings: string[], totalChars: number, remaining: number }}
 */
function validateEmbed(embed) {
  const errors   = [];
  const warnings = [];
  let   total    = 0;

  // ── title ──────────────────────────────────────────────────────────────────
  if (embed.title) {
    const l = embed.title.length;
    total += l;
    if (l > 256) errors.push(`Titre trop long : ${l}/256 caractères.`);
    else if (l > 230) warnings.push(`Titre proche de la limite : ${l}/256.`);
  }

  // ── titleUrl ───────────────────────────────────────────────────────────────
  if (embed.titleUrl && !isValidUrl(embed.titleUrl)) {
    errors.push('URL du titre invalide (doit commencer par https://).');
  }

  // ── description ────────────────────────────────────────────────────────────
  if (embed.description) {
    const l = embed.description.length;
    total += l;
    if (l > 4096) errors.push(`Description trop longue : ${l}/4096 caractères.`);
    else if (l > 3800) warnings.push(`Description proche de la limite : ${l}/4096.`);
  }

  // ── author ─────────────────────────────────────────────────────────────────
  if (embed.author) {
    const l = countStr(embed.author.name);
    total += l;
    if (l > 256) errors.push(`Nom d'auteur trop long : ${l}/256 caractères.`);
    if (embed.author.url && !isValidUrl(embed.author.url)) {
      errors.push("URL de l'auteur invalide.");
    }
    if (embed.author.iconUrl && !isValidUrl(embed.author.iconUrl)) {
      errors.push("URL de l'icône auteur invalide.");
    }
  }

  // ── footer ─────────────────────────────────────────────────────────────────
  if (embed.footer) {
    const l = countStr(embed.footer.text);
    total += l;
    if (l > 2048) errors.push(`Texte du footer trop long : ${l}/2048 caractères.`);
    else if (l > 1900) warnings.push(`Footer proche de la limite : ${l}/2048.`);
    if (embed.footer.iconUrl && !isValidUrl(embed.footer.iconUrl)) {
      errors.push("URL de l'icône footer invalide.");
    }
  }

  // ── thumbnail / image ──────────────────────────────────────────────────────
  if (embed.thumbnail && !isValidUrl(embed.thumbnail)) {
    errors.push('URL de la miniature invalide.');
  }
  if (embed.image && !isValidUrl(embed.image)) {
    errors.push("URL de l'image invalide.");
  }

  // ── fields ─────────────────────────────────────────────────────────────────
  if (embed.fields.length > 25) {
    errors.push(`Trop de champs : ${embed.fields.length}/25.`);
  }
  if (embed.fields.length > 22) {
    warnings.push(`Proche de la limite de champs : ${embed.fields.length}/25.`);
  }
  for (let i = 0; i < embed.fields.length; i++) {
    const f  = embed.fields[i];
    const nl = countStr(f.name);
    const vl = countStr(f.value);
    total += nl + vl;
    if (!f.name) errors.push(`Champ ${i + 1} : le nom est obligatoire.`);
    else if (nl > 256) errors.push(`Champ ${i + 1} — nom trop long : ${nl}/256.`);
    if (!f.value) errors.push(`Champ ${i + 1} : la valeur est obligatoire.`);
    else if (vl > 1024) errors.push(`Champ ${i + 1} — valeur trop longue : ${vl}/1024.`);
  }

  // ── total ──────────────────────────────────────────────────────────────────
  const LIMIT = 6000;
  if (total > LIMIT) {
    errors.push(`Total de caractères dépassé : ${total}/${LIMIT}.`);
  } else if (total > 5500) {
    warnings.push(`Total de caractères proche de la limite : ${total}/${LIMIT}.`);
  }

  return {
    valid    : errors.length === 0,
    errors,
    warnings,
    totalChars: total,
    remaining : Math.max(0, LIMIT - total),
  };
}

module.exports = { validateEmbed };
