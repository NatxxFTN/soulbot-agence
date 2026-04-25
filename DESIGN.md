---
version: "alpha"
name: Soulbot
description: "Identité visuelle premium noir/rouge pour le bot Discord Soulbot et ses surfaces connexes (landing page, dashboard web)."

colors:
  primary: "#FF0000"
  primary-dark: "#8B0000"
  primary-glow: "#FF3333"
  secondary: "#FFD700"
  neutral: "#0A0A0A"
  surface: "#141414"
  surface-elevated: "#1A1A1A"
  on-primary: "#FFFFFF"
  on-neutral: "#FFFFFF"
  on-surface: "#FFFFFF"
  text-primary: "#FFFFFF"
  text-secondary: "#AAAAAA"
  text-tertiary: "#666666"
  border-subtle: "#2A2A2A"
  border-glow: "rgba(255, 0, 0, 0.3)"
  error: "#FF3333"
  success: "#00FF88"
  warning: "#FFD700"
  info: "#4499FF"
  discord-embed-accent: "#FF0000"

typography:
  headline-display:
    fontFamily: Instrument Serif
    fontSize: 72px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Instrument Serif
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Instrument Serif
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.2
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.1em
  code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5

rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-glow}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-glass:
    backgroundColor: "rgba(255, 0, 0, 0.05)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  discord-container:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

## Overview

**Premium Dark Minimalism meets Cinematic Intensity.**

Soulbot est un bot Discord premium français. Son identité visuelle s'inspire 
des interfaces high-tech type JARVIS (Iron Man), des studios web 
award-winning (lusion.co, turbulent.ca), et de l'élégance brutalist 
type Linear ou Arc.

L'objectif : faire ressentir à l'utilisateur qu'il interagit avec une 
technologie **puissante, sobre, élite**. Pas "gaming flashy", pas 
"corporate terne" — une troisième voie : **le luxe dark**.

Chaque surface (bot Discord, landing page, dashboard web) doit transmettre 
la même sensation : on entre dans un lieu construit avec soin, où chaque 
détail compte. Le rouge signature n'est pas décoratif — c'est la signature 
de l'urgence maîtrisée.

## Colors

La palette repose sur une tension maîtrisée entre noir profond et rouge vif.

- **Primary (#FF0000) — Rouge Soulbot :** Le pouls vital du bot. Utilisé 
  pour les actions critiques, les accents Components V2, les CTA, les 
  états actifs. Jamais en fond, toujours en accent.
  
- **Primary-Dark (#8B0000) — Rouge Sang :** Pour les hover states, les 
  gradients, les backgrounds accentués. Apporte de la profondeur sans 
  saturer la rétine.

- **Primary-Glow (#FF3333) — Rouge Lumineux :** Réservé aux effets de 
  glow, halos, animations pulse. Jamais utilisé pour du texte.

- **Secondary (#FFD700) — Or :** Accent rare pour les achievements, 
  boosts, featured. À utiliser avec parcimonie — l'or doit rester un 
  événement, pas un décor.

- **Neutral (#0A0A0A) — Noir Profond :** Le fond principal. Pas #000000 
  (trop dur), pas #111111 (trop gris). Le #0A0A0A a cette profondeur 
  légèrement nuancée qui absorbe la lumière sans être creuse.

- **Surface (#141414) / Surface-Elevated (#1A1A1A) :** Niveaux de 
  profondeur pour les cards, panels, overlays. Plus la surface est 
  "en avant", plus elle est claire.

- **Text-Primary (#FFFFFF) :** Le blanc pur pour le texte principal. 
  Contraste maximum avec le noir profond.

- **Text-Secondary (#AAAAAA) / Tertiary (#666666) :** Niveaux de 
  hiérarchie texte. Le secondaire pour les sous-titres, le tertiaire 
  pour les métadonnées (timestamps, IDs).

- **Border-Glow (rgba(255, 0, 0, 0.3)) :** Bordure rouge translucide 
  pour les éléments qui doivent "respirer" le rouge sans saturer.

### Contexte Discord (Components V2)

Sur Discord, l'accent color des ContainerBuilder est TOUJOURS 
`0xFF0000`. Jamais une autre couleur. C'est la signature Soulbot 
reconnaissable au premier coup d'œil.

## Typography

Deux familles de polices, deux rôles distincts.

- **Instrument Serif** pour les titres majeurs (headlines) : 
  élégante, intemporelle, avec une italique cinématique. Elle apporte 
  le côté "journalistique premium" qui différencie Soulbot des bots 
  gaming génériques.

- **Inter** pour tout le corps de texte : lisible, moderne, française 
  de qualité (support accents parfait). C'est la voix parlée du bot.

- **JetBrains Mono** pour le code, les IDs, les timestamps techniques. 
  La monospace qui inspire le sérieux technique.

Hiérarchie :
- `headline-display` (72px) : Hero uniquement, une fois par page
- `headline-lg` (48px) : Titres de section majeure
- `headline-md` (32px) : Sous-sections
- `body-md` (16px) : Texte courant (défaut)
- `label-caps` (12px, uppercase, letter-spacing 0.1em) : Metadata, 
  timestamps, étiquettes techniques

## Layout

Spacing basé sur une échelle de 4/8px pour une rigueur visuelle stricte.

- `xs` (4px) : Espacements internes micro (entre icône et texte)
- `sm` (8px) : Gaps dans les groupes de boutons
- `md` (16px) : Padding cards, spacing entre sections liées
- `lg` (24px) : Séparation entre composants indépendants
- `xl` (32px) : Marges de section
- `xxl` (48px) : Espacements héroïques (hero sections)

## Elevation & Depth

La profondeur se crée par **trois leviers**, jamais par l'ombre portée 
classique (trop "Material Design") :

1. **Stratification de surface** : surface (#141414) < surface-elevated (#1A1A1A)
2. **Bordures glow** : `rgba(255, 0, 0, 0.1)` à `rgba(255, 0, 0, 0.5)` 
   selon l'importance
3. **Backdrop-filter blur** : glassmorphism rouge subtil pour les 
   panels superposés

## Shapes

Arrondis cohérents avec une esthétique "tech premium" :

- `rounded.sm` (4px) : Petits boutons, badges
- `rounded.md` (8px) : Boutons standards, inputs, cards
- `rounded.lg` (12px) : Panels majeurs, cards hero
- `rounded.xl` (16px) : Modals, surfaces principales
- `rounded.full` (9999px) : Avatars, tags circulaires

## Components

### Button Primary

Le CTA roi. Rouge plein, texte blanc, arrondi moyen, padding généreux. 
Hover : passe au rouge-glow (#FF3333) avec un léger pulse animation.

### Button Secondary

Glassmorphism rouge : fond transparent, bordure rouge subtile, hover 
allume la bordure en plein rouge.

### Card Glass

Fond rgba rouge 5% d'opacité + backdrop blur. Parfait pour les features 
highlights et les sections "about".

### Discord Container (Components V2)

ContainerBuilder avec `setAccentColor(0xFF0000)`. Toujours. Peut contenir 
TextDisplayBuilder, SeparatorBuilder, Sections avec composants.

### Input Field

Fond surface-elevated, bordure subtile, focus state : bordure rouge glow.

## Do's and Don'ts

### ✅ Do's

- Utiliser #FF0000 PARTOUT comme accent signature (Discord, web, dashboard)
- Tester chaque écran en noir et blanc d'abord (si ça ne marche pas sans 
  couleur, ça ne marchera pas avec)
- Respecter la hiérarchie spatiale (xs → xxxl) sans pixel off-grid
- Utiliser Instrument Serif UNIQUEMENT pour les headlines majeurs
- Garder les effets pulsation/glow SOBRES (2s ease-in-out max)
- Privilégier le vide (espace négatif) à l'accumulation

### ❌ Don'ts

- JAMAIS utiliser du rouge en fond plein (ça devient agressif)
- JAMAIS mixer avec bleu, vert, violet saturés (casse l'identité)
- JAMAIS utiliser plus de 2 polices sur un même écran
- JAMAIS de drop-shadow Material Design classique (on utilise des 
  bordures glow)
- JAMAIS d'emoji Unicode quand un emoji custom existe (utiliser e())
- JAMAIS de gradient rainbow ou multicolore (l'identité est binaire 
  noir/rouge)
- JAMAIS utiliser #000000 pur comme fond (trop dur, préférer #0A0A0A)

## Accessibilité

- Contraste minimum WCAG AA (4.5:1) pour tout texte sur fond
- Text-Primary (#FFFFFF) sur Neutral (#0A0A0A) : ratio 19.05:1 ✅
- Primary (#FF0000) sur Neutral (#0A0A0A) : ratio 5.25:1 ✅
- Ne jamais utiliser le rouge comme SEUL indicateur (toujours texte 
  ou icône en plus) — daltonisme

## Surfaces cibles

Ce design system s'applique à :

1. **Bot Discord** (surface principale)
   - Components V2 partout
   - Accent color ContainerBuilder : 0xFF0000
   - Emojis custom prioritaires sur Unicode

2. **Landing Page** (surface promotionnelle)
   - Single page HTML premium
   - Hero avec Instrument Serif + particules rouges
   - Glassmorphism pour les cards

3. **Dashboard Web** (surface administration)
   - Interface gestion serveurs
   - Components identiques landing
   - Data-dense mais aéré
