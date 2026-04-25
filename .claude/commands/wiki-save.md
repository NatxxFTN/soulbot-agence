# /wiki-save — Sauvegarder la dernière réponse comme page de synthèse

Classer la dernière réponse de Claude Code (dans cette conversation) 
comme une page de synthèse permanente dans le wiki Soulbot.

Inspirée du pattern Karpathy "LLM Wiki" où les explorations 
intéressantes ne se perdent pas dans l'historique chat mais 
compound dans la base de connaissance.

## Quand l'utiliser

- Après une réponse de /wiki-query qui est riche et mérite d'être gardée
- Après une analyse/synthèse/comparaison intéressante dans la conversation
- Après une recommandation stratégique importante
- Quand Nathan dit "ça c'est à garder"

## Workflow

### Étape 1 : Identifier le contenu à sauvegarder

Identifier la DERNIÈRE réponse substantielle de Claude Code dans la 
conversation (pas un simple OK ou accusé de réception).

Si plusieurs réponses récentes, demander à Nathan :
- "Tu veux que je sauvegarde ma dernière réponse (résumée) ou une 
  réponse spécifique ?"

### Étape 2 : Proposer un titre et un slug

Proposer :
- Titre clair (ex: "Stratégie pivot identité Soulbot")
- Slug kebab-case (ex: "strategie-pivot-identite-soulbot")
- Type de page : synthesis | comparison | decision

Demander validation à Nathan avant de créer le fichier.

### Étape 3 : Créer la page

Créer le fichier dans le bon sous-dossier :
- wiki/pages/syntheses/ pour type=synthesis
- wiki/pages/comparisons/ pour type=comparison
- wiki/pages/decisions/ pour type=decision

Utiliser le template approprié :
- wiki/templates/synthesis.md
- wiki/templates/comparison.md (si existe)
- wiki/templates/decision.md

Remplir avec le contenu de la réponse, structuré selon le template.

### Étape 4 : Extraction des liens

Identifier dans le contenu les mentions :
- Concepts existants dans le wiki
- Entités existantes dans le wiki
- Sources déjà ingérées

Ajouter les [[liens Obsidian]] bidirectionnels.

### Étape 5 : Frontmatter YAML

Remplir obligatoirement :
- title
- type
- created (date du jour)
- updated (date du jour)
- tags (extraits du contenu)
- sources (contexte de la conversation)
- status : active
- confidence : medium (par défaut, à ajuster)

### Étape 6 : Cross-updates

Si la nouvelle page est liée à des entities/concepts existants :
- Mettre à jour les pages liées pour pointer vers la nouvelle page

### Étape 7 : Index et Log

- Ajouter la nouvelle page dans wiki/index.md section "Synthèses" 
  (ou Comparisons/Decisions selon type)
- Append dans wiki/log.md :
  `## [YYYY-MM-DD] save | Titre de la synthèse`

### Étape 8 : Rapport

Produire un rapport synthétique :
- Page créée : [[nom-de-la-page]] dans wiki/pages/X/
- Type : synthesis | comparison | decision
- Tags appliqués : liste
- Cross-links ajoutés : liste
- Index et log mis à jour

## Règles

- Ne JAMAIS créer une page de synthèse sans l'accord de Nathan sur le titre
- Respecter wiki/SCHEMA.md strictement
- Ne JAMAIS inventer de contenu, uniquement reformuler/structurer la 
  réponse existante
- Si la réponse à sauvegarder contient des claims factuels non sourcés, 
  les marquer [TO CITE] et demander à Nathan d'où ça vient

## Exemples d'usage

Nathan : "Claude, fais-moi une synthèse des 3 packs de commandes 
prévus"
Claude : [produit une synthèse riche]
Nathan : "/wiki-save"
Claude : "Je propose de sauvegarder ça comme 
wiki/pages/syntheses/synthese-3-packs-commandes-prevus.md. Valide ?"
Nathan : "Oui"
Claude : [crée la page + index + log + rapport]
