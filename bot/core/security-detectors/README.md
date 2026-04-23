# Security Detectors

Chaque fichier `bot/core/security-detectors/<feature>.js` est chargé **à la demande** par `bot/events/securityListener.js` lorsqu'une feature est activée sur un serveur.

## Convention de nom

Le nom du fichier doit **exactement** matcher la clé `feature` utilisée dans `security_config` (ex: `antilink.js` pour la feature `antilink`).

Features prévues (Tiers 1 et 2) — créées par les prompts 2/3 du Pack Forteresse :

| Tier | Feature          | Description courte |
|-----:|------------------|--------------------|
| 1    | `antilink`       | Bloque les URLs HTTP/HTTPS |
| 1    | `antiinvite`     | Bloque les invitations Discord (`discord.gg/`, `discord.com/invite/`, …) |
| 1    | `antieveryone`   | Bloque `@everyone` / `@here` |
| 1    | `antimention`    | Anti-spam de mentions user (seuil configurable) |
| 1    | `antibot`        | Refuse qu'un non-admin ajoute un bot |
| 1    | `antiduplicate`  | Anti-flood de messages identiques |
| 2    | `antiwords`      | Filtre de mots interdits (`custom_data` JSON array) |
| 2    | `anticaps`       | Anti-majuscules excessives (seuil en %) |
| 2    | `antiemojispam`  | Anti-spam d'emojis (seuil quantité) |
| 2    | `antinsfw`       | Détection NSFW basique (regex / labels) |
| 2    | `antinewaccount` | Kick/limite comptes trop récents |
| 2    | `antiraid`       | Détection raid avancée (seuil de joins/s) |

## Format d'export

Chaque détecteur exporte un seul objet :

```js
module.exports = {
  /**
   * Analyse le message et décide si la feature se déclenche.
   * @param {import('discord.js').Message} message
   * @param {{ enabled:number, action:string, threshold:number, custom_data:string|null }} config
   * @returns {Promise<{triggered: boolean, reason?: string}>}
   */
  async check(message, config) {
    // Exemple minimal :
    if (/https?:\/\//i.test(message.content)) {
      return { triggered: true, reason: 'Lien détecté' };
    }
    return { triggered: false };
  }
};
```

## Règles

- **Ne PAS** appliquer la punition directement — `security-listener.js` s'en charge via `applyPunishment()`.
- **Ne PAS** accéder à `message.delete()` dans le détecteur — toujours via la punition.
- **Toujours** retourner `{ triggered: false }` en cas de doute (fail-open pour la détection, fail-close pour l'action).
- **Le fichier `README.md` n'est PAS chargé** (require ignore les `.md`).

## Whitelist

Les détecteurs n'ont pas à vérifier la whitelist — le listener filtre les users/rôles/salons whitelistés **avant** de dispatcher. Chaque feature peut aussi définir sa propre whitelist ciblée via la 4e colonne `feature` dans `security_whitelist` (NULL = whitelist globale).
