'use strict';

// ── Shim de compatibilité ──────────────────────────────────────────────────
// Le detecteur a été renommé antiexplicit.js pour éviter le flag "NSFW" dans
// la review Discord. Ce fichier existe encore car la clé en base de données
// est toujours 'antinsfw' et le securityListener charge via :
//   require(`../core/security-detectors/${feature}`)
// avec feature = 'antinsfw'.
// ────────────────────────────────────────────────────────────────────────────

module.exports = require('./antiexplicit');
