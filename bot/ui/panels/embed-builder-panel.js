'use strict';

// ── Embed Builder — Panel V3 (StringSelectMenu) ───────────────────────────────

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');

function _ok(val) { return val ? '✓' : '·'; }

function _colorHex(num) {
  if (num === null || num === undefined) return null;
  return '#' + num.toString(16).toUpperCase().padStart(6, '0');
}

function _short(str, max = 35) {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function _totalChars(em) {
  let total = 0;
  if (em.title)        total += em.title.length;
  if (em.description)  total += em.description.length;
  if (em.author?.name) total += em.author.name.length;
  if (em.footer?.text) total += em.footer.text.length;
  for (const f of em.fields) total += (f.name?.length ?? 0) + (f.value?.length ?? 0);
  return total;
}

/**
 * @param {object} state — embed-state.js state object
 * @returns {{ components, flags }}
 */
function renderEmbedBuilderPanel(state) {
  const em    = state.embed;
  const hex   = _colorHex(em.color);
  const chars = _totalChars(em);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // ── En-tête ────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 🖼️ Embed Builder'),
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const pct      = Math.round((chars / 6000) * 100);
  const warnings = [];
  if (chars > 5500)             warnings.push('⚠ Limite de caractères proche');
  if (em.fields.length >= 25)   warnings.push('⚠ Limite de champs atteinte');
  if (!em.title && !em.description) warnings.push('⚠ Titre et description vides');

  const statsStr = `📊 **${chars}/6000 car.** (${pct}%) · **${em.fields.length}/25 champs**`;
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      warnings.length > 0 ? `${statsStr}\n${warnings.join(' · ')}` : statsStr,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── État courant ───────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `${_ok(em.title)}  **Titre**       ${em.title        ? `\`${_short(em.title)}\``       : '*vide*'}`,
        `${_ok(em.description)} **Description** ${em.description ? `*${em.description.length} car.*` : '*vide*'}`,
        `${_ok(em.color)}  **Couleur**     ${hex             ? `\`${hex}\``                     : '*défaut*'}`,
        `${_ok(em.author)} **Auteur**      ${em.author?.name ? `\`${_short(em.author.name)}\`` : '*vide*'}`,
        `${_ok(em.footer)} **Footer**      ${em.footer?.text ? `\`${_short(em.footer.text)}\`` : '*vide*'}`,
        `${_ok(em.thumbnail)} **Miniature**  ${em.thumbnail  ? '*définie*'                      : '*vide*'}`,
        `${_ok(em.image)}  **Image**       ${em.image        ? '*définie*'                      : '*vide*'}`,
        `${_ok(em.titleUrl)} **URL titre** ${em.titleUrl     ? '*définie*'                      : '*vide*'}`,
        `${_ok(em.timestamp)} **Timestamp** ${em.timestamp   ? '*activé*'                       : '*désactivé*'}`,
      ].join('\n'),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Menu d'édition principal ───────────────────────────────────────────────
  const options = [
    { label: 'Titre (+ URL du titre)', description: em.title ? `Actuel : ${_short(em.title, 50)}` : 'Non défini', value: 'title',     emoji: '✏️' },
    { label: 'Description',            description: em.description ? `${em.description.length} car.` : 'Non définie', value: 'desc', emoji: '📝' },
    { label: 'Couleur',                description: hex ? `Actuelle : ${hex}` : 'Non définie', value: 'color',     emoji: '🎨' },
    { label: 'Auteur',                 description: em.author?.name ? `Actuel : ${_short(em.author.name, 40)}` : 'Non défini', value: 'author', emoji: '👤' },
    { label: 'Footer',                 description: em.footer?.text ? `Actuel : ${_short(em.footer.text, 40)}` : 'Non défini', value: 'footer', emoji: '📌' },
    { label: 'Miniature (URL)',         description: em.thumbnail ? 'Définie' : 'Non définie', value: 'thumbnail', emoji: '🖼️' },
    { label: 'Image (URL)',             description: em.image ? 'Définie' : 'Non définie',     value: 'image',     emoji: '🖼️' },
    { label: `Timestamp ${em.timestamp ? '✓' : ''}`,
                                        description: em.timestamp ? 'Activé — cliquer pour désactiver' : 'Désactivé', value: 'timestamp', emoji: '⏰' },
  ];

  if (em.fields.length < 25) {
    options.push({ label: '+ Ajouter un champ', description: `${em.fields.length}/25 champs`, value: 'field_add', emoji: '➕' });
  }
  if (em.fields.length > 0) {
    options.push({ label: '✏️ Éditer un champ',    description: `${em.fields.length} champ(s)`, value: 'field_edit' });
    options.push({ label: '🗑️ Supprimer un champ', description: `${em.fields.length} champ(s)`, value: 'field_remove' });
  }

  options.push(
    { label: '💾 Templates',   description: 'Sauvegarder, charger, gérer',  value: 'tpl' },
    { label: '😀 Emojis',     description: 'Parcourir les emojis du serveur', value: 'emojis' },
    { label: '🗑️ Vider tout', description: 'Réinitialiser l\'embed complet', value: 'reset' },
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('emb_select:edit_menu')
        .setPlaceholder('Choisir un champ à éditer…')
        .addOptions(options),
    ),
  );

  // ── Liste des champs existants ─────────────────────────────────────────────
  if (em.fields.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const fieldLines = em.fields
      .slice(0, 10)
      .map((f, idx) => {
        const icon = f.inline ? '↔️' : '⬇️';
        const name = f.name.length > 40 ? f.name.slice(0, 40) + '…' : f.name;
        return `${idx + 1}. ${icon} **${name}**`;
      })
      .join('\n');
    const suffix = em.fields.length > 10 ? `\n*…et ${em.fields.length - 10} autre(s)*` : '';
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(fieldLines + suffix),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Actions principales ────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('emb:preview').setLabel('👁 Aperçu').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('emb:send').setLabel('📤 Envoyer').setStyle(ButtonStyle.Success),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('emb:reset').setLabel('🗑️ Vider').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('emb:close').setLabel('✕ Fermer').setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderEmbedBuilderPanel };
