# UI_UX_GUIDELINES.md
# Conscience Technique — UI/UX Designer & Assistant 3
# Niveau : Obsession du détail. #F39C12 ou retour à zéro.
# Ce fichier est lu AVANT chaque production visuelle. Sans exception.

---

## PHILOSOPHIE DU DESIGNER

Un embed Discord est une affiche publicitaire de 3 secondes.
L'utilisateur lit le titre, scan la couleur, lit la première ligne.
Si ces 3 éléments ne communiquent pas instantanément, l'embed a échoué.
La cohérence n'est pas une option — c'est ce qui transforme un bot en produit.

---

## 1. IDENTITÉ VISUELLE — CHARTE COULEURS

### 1.1 Palette officielle

| Rôle | Valeur HEX | Valeur Décimale | Usage |
|---|---|---|---|
| **Primaire Orange** | `#F39C12` | `15957010` | Couleur par défaut tous embeds |
| **Succès Vert** | `#27AE60` | `2600544` | Confirmation, action réussie |
| **Erreur Rouge** | `#E74C3C` | `15158332` | Erreur, refus, accès refusé |
| **Warning Jaune** | `#F1C40F` | `15849487` | Avertissement, information critique |
| **Info Bleu** | `#3498DB` | `3447003` | Information neutre, aide |
| **Neutre Gris** | `#95A5A6` | `9807238` | Footer, timestamp, texte secondaire |
| **Dark Background** | `#2C2F33` | N/A | Référence — fond Discord dark mode |

### 1.2 RÈGLE ABSOLUE SUR LE ORANGE

```javascript
// ❌ INTERDIT — approximations refusées sans discussion
color: 0xFF8C00  // Ce n'est pas notre orange
color: 0xFFA500  // Ce n'est pas notre orange
color: 'Orange'  // Couleur Discord générique — refus immédiat
color: 'ORANGE'  // Identique

// ✅ SEULE VALEUR ACCEPTÉE pour les embeds standard
color: 0xF39C12  // Notre orange. Rien d'autre.

// POURQUOI cette précision : une différence de 12 niveaux de luminosité
// est perceptible à l'œil nu. La cohérence sur 233 commandes
// dépend de cette rigueur sur chaque fichier.
```

### 1.3 Utilisation des couleurs par contexte

```javascript
// Pattern d'import centralisé — toujours utiliser ces constantes, jamais hardcoder
const COLORS = {
  PRIMARY:  0xF39C12,  // Embed standard, information, listing
  SUCCESS:  0x27AE60,  // Confirmation action, opération réussie
  ERROR:    0xE74C3C,  // Erreur, permission refusée, introuvable
  WARNING:  0xF1C40F,  // Avertissement, action irréversible imminente
  INFO:     0x3498DB,  // Aide, documentation, +help
  NEUTRAL:  0x95A5A6,  // Embed de chargement, état intermédiaire
};
```

---

## 2. STRUCTURE DES EMBEDS — STANDARD "ELITE"

### 2.1 Anatomie d'un Embed Elite

```
┌─────────────────────────────────────────────┐
│ [AUTHOR] • Avatar bot + Nom bot + URL optionnel   │ ← Identité
├─────────────────────────────────────────────┤
│ [TITRE] • Court, impactant, emoji en tête   │ ← Attention
├─────────────────────────────────────────────┤
│ [DESCRIPTION] • Corps principal             │ ← Information
│ Markdown maîtrisé : **gras**, `code`, >quote│
├───────────────────┬─────────────────────────┤
│ [FIELD 1] inline  │ [FIELD 2] inline        │ ← Données structurées
│ Valeur 1          │ Valeur 2                │
├───────────────────┴─────────────────────────┤
│ [IMAGE] ou [THUMBNAIL] si pertinent         │ ← Visuel
├─────────────────────────────────────────────┤
│ [FOOTER] • Texte secondaire • Timestamp     │ ← Contexte
└─────────────────────────────────────────────┘
```

### 2.2 BaseEmbed — Code de référence obligatoire

```javascript
// POURQUOI une classe BaseEmbed et non un objet littéral :
// 233 commandes doivent avoir exactement le même footer, la même couleur,
// le même author. Une modification centralisée se propage partout.
// Sans BaseEmbed, on modifie 233 fichiers. Inacceptable.

class BaseEmbed {
  static build(options = {}) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY) // #F39C12 — jamais de valeur hardcodée ici

      // Author : identité constante du bot sur tous les embeds
      // POURQUOI setAuthor et non setTitle uniquement :
      // L'author donne une signature visuelle immédiate — l'utilisateur sait
      // quel bot répond avant de lire le contenu.
      .setAuthor({
        name: 'Soulbot',
        iconURL: options.botAvatarURL ?? null,
      })

      // Footer : timestamp et préfixe — trace de contexte toujours présente
      // POURQUOI timestamp : l'utilisateur peut consulter un embed des heures
      // plus tard et savoir exactement quand l'info a été générée.
      .setFooter({
        text: options.footerText ?? `+help pour la liste des commandes`,
        iconURL: options.footerIcon ?? null,
      })
      .setTimestamp();

    // Propriétés optionnelles appliquées proprement
    if (options.title)       embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail)   embed.setThumbnail(options.thumbnail);
    if (options.image)       embed.setImage(options.image);
    if (options.url)         embed.setURL(options.url);
    if (options.fields)      embed.addFields(options.fields);

    return embed;
  }
}
```

### 2.3 ErrorEmbed — Structure standardisée

```javascript
class ErrorEmbed {
  static build(message, details = null) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)           // Rouge — signal universel d'erreur
      .setAuthor({ name: '✗ Erreur' })  // ✗ et non ❌ — plus sobre, plus pro
      .setDescription(`**${message}**`)
      .setTimestamp();

    // POURQUOI details optionnel :
    // Les erreurs utilisateur (mauvais args) n'ont pas besoin de stack trace.
    // Les erreurs système (crash DB) incluent le détail pour le debug.
    if (details) {
      embed.addFields({
        name: 'Détails techniques',
        value: `\`\`\`${details.slice(0, 1000)}\`\`\``, // Tronqué — limite 1024 chars
      });
    }

    return embed;
  }
}
```

### 2.4 SuccessEmbed — Structure standardisée

```javascript
class SuccessEmbed {
  static build(message, fields = []) {
    return new EmbedBuilder()
      .setColor(COLORS.SUCCESS)            // Vert — confirmation visuelle immédiate
      .setAuthor({ name: '✓ Succès' })     // ✓ et non ✅ — cohérence typographique
      .setDescription(`**${message}**`)
      .addFields(fields)
      .setTimestamp();
  }
}
```

### 2.5 HelpEmbed — Structure spécifique (référence image bot)

```javascript
// POURQUOI HelpEmbed séparé :
// La commande +help a une structure en 2 colonnes (Catégories / Syntaxes)
// visible dans l'image de référence. Cette structure ne correspond pas
// à un BaseEmbed standard — elle mérite son propre composant.

class HelpEmbed {
  static build(categories, page, totalPages, syntaxInfo) {
    return new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setAuthor({
        name: 'Information',
        // POURQUOI logo Discord orange : identité visuelle immédiate du bot
        // comme sur l'image de référence (carré orange + logo Discord blanc)
        iconURL: 'URL_LOGO_BOT',
      })

      // Version en titre — copie fidèle de l'image de référence
      .setDescription(`▶ Version 2.24.0`)

      // 2 fields inline : Catégories | Syntaxes — layout identique à l'image
      .addFields(
        {
          name: 'Catégories',
          // POURQUOI couleur dans le texte Discord :
          // Les noms de catégories sont en couleur dans l'image (bleu/orange).
          // Discord Markdown ne supporte pas la couleur — on utilise des emojis
          // ou le formatage gras pour hiérarchiser visuellement.
          value: categories.map(c => `${c.emoji} ${c.name}`).join('\n'),
          inline: true,
        },
        {
          name: 'Syntaxes',
          value: [
            `▶ \`${syntaxInfo.botName}\``,
            `- +help <commande>`,
            `<> • Obligatoire`,
            `[] • Optionnel`,
            `() • Spécification`,
            `/ • Sépare syntaxes`,
          ].join('\n'),
          inline: true,
        }
      )

      // Compteurs en bas — comme sur l'image
      .addFields({
        name: '\u200B', // Séparateur invisible
        value: [
          `**Nombre de commandes: ${syntaxInfo.total}**`,
          `**Commandes custom: ${syntaxInfo.custom}**`,
        ].join('\n'),
      })

      .setFooter({ text: `Page ${page}/${totalPages} | | ${categories[0]?.name ?? ''}` })
      .setTimestamp();
  }
}
```

---

## 3. COMPOSANTS INTERACTIFS — BOUTONS

### 3.1 PaginationRow — Standard obligatoire

```javascript
// POURQUOI ces 4 boutons dans cet ordre :
// L'image de référence montre << < > >> — standard de pagination universelle.
// L'utilisateur comprend instinctivement sans explication.
class PaginationRow {
  static build(currentPage, totalPages, baseId) {
    const isFirst = currentPage === 1;
    const isLast = currentPage === totalPages;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${baseId}_first`)
        .setEmoji('⏪')          // POURQUOI emoji et non label : économie d'espace
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(isFirst),   // POURQUOI disabled : UX — pas de bouton inutile actif

      new ButtonBuilder()
        .setCustomId(`${baseId}_prev`)
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(isFirst),

      new ButtonBuilder()
        .setCustomId(`${baseId}_next`)
        .setEmoji('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(isLast),

      new ButtonBuilder()
        .setCustomId(`${baseId}_last`)
        .setEmoji('⏩')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(isLast),
    );
  }

  // POURQUOI une méthode disabled séparée :
  // Après timeout du collector, on désactive tous les boutons.
  // Cette méthode reconstruit la row avec tous les boutons grisés.
  static buildDisabled(baseId) {
    return new ActionRowBuilder().addComponents(
      ['first', 'prev', 'next', 'last'].map(action =>
        new ButtonBuilder()
          .setCustomId(`${baseId}_${action}`)
          .setEmoji(action === 'first' ? '⏪' : action === 'prev' ? '◀' : action === 'next' ? '▶' : '⏩')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      )
    );
  }
}
```

### 3.2 ConfirmRow — Standard obligatoire

```javascript
// POURQUOI Danger sur Confirmer et non sur Annuler :
// Le style Danger (rouge) attire l'attention. L'action irréversible
// doit avoir la friction visuelle maximale — l'utilisateur doit voir
// qu'il s'apprête à faire quelque chose de définitif.
class ConfirmRow {
  static build(baseId, action = 'action irréversible') {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${baseId}_confirm`)
        .setLabel('Confirmer')
        .setStyle(ButtonStyle.Danger),  // Rouge = attention = irréversible

      new ButtonBuilder()
        .setCustomId(`${baseId}_cancel`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary), // Gris = sortie de secours évidente
    );
  }
}
```

---

## 4. TYPOGRAPHIE ET MARKDOWN DISCORD

### 4.1 Hiérarchie textuelle

```
# Titre principal      → Réservé aux titres d'embed (setTitle)
## Sous-titre          → Ne pas utiliser dans les descriptions
**Texte important**    → Mise en valeur — pas plus de 20% du texte
*Texte secondaire*     → Italique pour les notes, les précisions
`code inline`          → Valeurs techniques, IDs, commandes
\`\`\`code block\`\`\` → Blocs de code multi-lignes
> Citation             → Instructions ou exemples contextuels
```

### 4.2 Règles de casse — Non négociables

```
TITRES D'EMBED    : Première lettre majuscule uniquement
                    ✅ "Statistiques du serveur"
                    ❌ "Statistiques Du Serveur"
                    ❌ "STATISTIQUES DU SERVEUR"

NOMS DE FIELDS    : Première lettre majuscule
                    ✅ "Nombre de messages"
                    ❌ "nombre de messages"

BOUTONS LABELS    : Première lettre majuscule, reste minuscule
                    ✅ "Confirmer" / "Annuler"
                    ❌ "CONFIRMER" / "annuler"

FOOTER TEXT       : Minuscule, sauf acronymes et noms propres
                    ✅ "+help pour la liste des commandes"
                    ❌ "+Help Pour La Liste Des Commandes"

EMOJIS            : Toujours EN TÊTE du titre si utilisé, jamais au milieu
                    ✅ "📊 Statistiques du serveur"
                    ❌ "Statistiques 📊 du serveur"
```

### 4.3 Espacement — Règles d'espace insécable

```javascript
// POURQUOI les espaces comptent dans Discord :
// Discord compresse les espaces multiples dans certains contextes.
// Utiliser \u200B (zero-width space) pour les séparateurs visuels.

// Séparateur de section dans une description
description: `**Section A**\n${content}\n\u200B\n**Section B**\n${content2}`,
//                                           ↑ Ligne vide visible sans être vide

// Footer avec séparateur visible (style image de référence "Page 1/19 | | Protection")
footer: { text: `Page ${p}/${t} | | ${category}` },
//                              ↑↑ Double pipe — style référence image
```

---

## 5. CHECKLIST DE VALIDATION UI — ASSISTANT 3

Avant toute livraison d'un composant visuel, cocher ces 15 points :

### Couleurs
- [ ] Couleur primaire = `0xF39C12` exactement → sinon REFUS
- [ ] Couleur succès = `0x27AE60` → sinon REFUS
- [ ] Couleur erreur = `0xE74C3C` → sinon REFUS
- [ ] Aucune couleur littérale (`'Orange'`, `'Red'`) → sinon FLAG

### Structure Embed
- [ ] `setAuthor()` présent sur tous les embeds → sinon FLAG
- [ ] `setTimestamp()` présent → sinon FLAG
- [ ] `setFooter()` présent avec texte utile → sinon FLAG
- [ ] Aucun field avec value vide ou `undefined` → sinon CRASH DISCORD

### Typographie
- [ ] Titres : première lettre majuscule uniquement → sinon FLAG
- [ ] Boutons : première lettre majuscule uniquement → sinon FLAG
- [ ] Emojis : en tête du titre si présent → sinon FLAG
- [ ] Aucun `#`, `##` dans description (markdown H1/H2 non rendu) → sinon FLAG

### Limites Discord
- [ ] Titre ≤ 256 chars → sinon CRASH
- [ ] Description ≤ 4096 chars → sinon CRASH
- [ ] Fields ≤ 25 par embed → sinon CRASH

### Boutons
- [ ] Boutons de pagination désactivés après timeout collector → sinon FLAG UX
- [ ] Bouton destructif = style `Danger` (rouge) → sinon FLAG UX

---

## 6. ANTI-PATTERNS UI — LISTE NOIRE

Ces patterns sont refusés dès leur détection. Pas de discussion.

```javascript
// ❌ COULEUR APROXIMATIVE
.setColor('#FF8C00')  // Pas notre orange

// ❌ EMBED SANS AUTHOR
new EmbedBuilder().setTitle('Stats').setDescription('...')
// Résultat : embed anonyme, pas d'identité bot

// ❌ EMBED SANS TIMESTAMP
// Résultat : l'utilisateur ne sait pas quand l'info a été générée

// ❌ FIELD AVEC VALUE VIDE
.addFields({ name: 'Serveurs', value: '' })
// Résultat : erreur Discord 400, message non envoyé

// ❌ DESCRIPTION TROP DENSE
// Bloc de texte sans structure → illisible en 3 secondes
// Utiliser des fields inline pour structurer les données tabulaires

// ❌ EMOJI AU MILIEU D'UN TITRE
.setTitle('Statistiques 📊 du serveur')
// Rompt la hiérarchie visuelle — l'emoji doit être en tête

// ❌ BOUTON SANS CUSTOMID UNIQUE
.setCustomId('confirm')  // Collision garantie si 2 collectors actifs simultanément
// TOUJOURS inclure userId ou messageId dans le customId
.setCustomId(`confirm_${userId}_${Date.now()}`)
```

---

## 7. RÉFÉRENCE IMAGE BOT — Éléments à reproduire fidèlement

D'après l'analyse de l'image de référence (`image/image.png`) :

```
✅ Header "Information" avec flèche ▶
✅ Version affichée : "▶ Version X.X.X"
✅ 2 colonnes : Catégories (avec couleurs distinctes) / Syntaxes
✅ Compteur "Nombre de commandes: 233"
✅ Compteur "Commandes custom: 0"
✅ Pagination "Page X/19 | | Catégorie"
✅ 4 boutons << < > >> en Secondary style
✅ Logo Discord blanc sur fond carré orange en thumbnail
✅ Fond général dark (#2C2F33 reference)
✅ Noms de catégories : Owner, Modération, Information, Configuration,
   Protection, Fun, Statistique, Ticket, Game, +6 catégories
```

Toute déviation de ce standard est signalée par l'Assistant 3 avant livraison.
