'use strict';

// ═══════════════════════════════════════════════
// BOTCONFIG STUDIO — V5
// Studio de personnalisation totale : 6 sous-studios navigables
// (Identité / Thème / Tarifs / Presets / Historique / Aperçu).
// Rendu PUR — aucune écriture DB, le handler agit sur un draft.
// Protocole customId : botconfig:studio:<action>[:param]
//                      modals : botconfig_modal:studio:<champ>
//
// Astuce Aperçu Live : un message IsComponentsV2 ne peut pas porter
// d'embed → on simule le rendu avec un 2e ContainerBuilder dont
// l'accentColor = couleur primaire du draft. Même barre latérale
// colorée qu'un embed, fidèle au résultat final.
// ═══════════════════════════════════════════════

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const { version } = require('../../../package.json');
const { ACCENT } = require('../../utils/panels-v4');
const { THEME_PRESETS } = require('../../utils/response-builder');
const { getGuildSettings } = require('../../database');
const {
  getGuildBotConfig, getConfigLog, getAssetHistory, listPresets,
} = require('../../core/guild-config');
const pricing = require('../../core/pricing');
const { isOwner } = require('../../core/permissions');

const TABS = [
  { key: 'identity', label: 'Identité',   emojiName: 'ui_user' },
  { key: 'profile',  label: 'Profil Bot', emojiName: 'cat_owner' },
  { key: 'theme',    label: 'Thème',      emojiName: 'ui_bulb' },
  { key: 'pricing',  label: 'Tarifs',     emojiName: 'ani_coin' },
  { key: 'presets',  label: 'Presets',    emojiName: 'ui_folder' },
  { key: 'history',  label: 'Historique', emojiName: 'ui_pin' },
  { key: 'preview',  label: 'Aperçu',     emojiName: 'btn_tip' },
];

// Libellés FR des champs — affichage draft + historique.
const FIELD_LABELS = {
  nickname         : 'Nickname',
  banner_url       : 'Bannière',
  embed_color      : 'Couleur primaire',
  accent_color     : 'Couleur accent',
  theme_name       : 'Thème',
  avatar_url       : 'Avatar (global)',
  footer_text      : 'Footer',
  footer_icon_url  : 'Icône footer',
  embed_style      : 'Style d\'embed',
  brand_emoji_id   : 'Emoji de marque',
  prefix           : 'Prefix',
  // V6 — couleurs + emojis sémantiques
  color_success    : 'Couleur succès',
  color_error      : 'Couleur erreur',
  color_warning    : 'Couleur warning',
  color_info       : 'Couleur info',
  emoji_success_id : 'Emoji succès',
  emoji_error_id   : 'Emoji erreur',
  emoji_warning_id : 'Emoji warning',
  emoji_info_id    : 'Emoji info',
  // V6 — profil global (préfixe 'profile:' dans l'historique)
  'profile:bio'            : 'Bio du bot',
  'profile:banner_url'     : 'Bannière de profil',
  'profile:presence_status': 'Statut',
  'profile:presence_type'  : 'Type d\'activité',
  'profile:presence_text'  : 'Texte d\'activité',
  'profile:presence_url'   : 'URL de stream',
  'profile:username'       : 'Username',
};

// Libellés courts profil (clés sans préfixe — draft.profile).
const PROFILE_LABELS = {
  bio: 'Bio', banner_url: 'Bannière de profil', presence_status: 'Statut',
  presence_type: 'Type d\'activité', presence_text: 'Texte d\'activité',
  presence_url: 'URL de stream', username: 'Username',
};

function _fmtValue(field, value) {
  if (value == null || value === '') return '*défaut*';
  if (field === 'embed_color' || field === 'accent_color') return `\`#${value}\``;
  if (String(value).startsWith('http')) return `[lien](${value})`;
  if (field === 'brand_emoji_id') return `<:_:${value}>`;
  return `\`${value}\``;
}

/** Valeur effective d'un champ : draft prioritaire, sinon DB. */
function _effective(field, draft, cfg) {
  if (draft?.fields && field in draft.fields) return draft.fields[field];
  return cfg?.[field] ?? null;
}

// ─── Rendu principal ──────────────────────────────────────────────────────────

/**
 * Rend le Studio pour un onglet donné.
 * @param {import('discord.js').Guild} guild
 * @param {string} tab - clé TABS
 * @param {?{fields: Object, prefix?: string}} draft - modifs en attente (non commit)
 * @param {string} viewerId
 * @returns {{ components, flags }}
 */
function renderStudio(guild, tab = 'identity', draft = null, viewerId = null) {
  const cfg = getGuildBotConfig(guild.id);
  const container = new ContainerBuilder().setAccentColor(ACCENT);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('cat_configuration')} **Studio Soulbot** — personnalisation totale`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Navigation : 7 onglets sur 2 rows (4 + 3) — actif en Primary.
  const navRows = [[0, 4], [4, 7]].map(([start, end]) => new ActionRowBuilder().addComponents(
    TABS.slice(start, end).map((t) => {
      const btn = new ButtonBuilder()
        .setCustomId(`botconfig:studio:tab:${t.key}`)
        .setLabel(t.label)
        .setStyle(t.key === tab ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(t.key === tab);
      const emoji = forButton(t.emojiName);
      if (typeof emoji === 'object') btn.setEmoji(emoji);
      return btn;
    }),
  ));
  for (const row of navRows) container.addActionRowComponents(row);
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Corps de l'onglet actif.
  const body = {
    identity: _identityBody,
    profile : _profileBody,
    theme   : _themeBody,
    pricing : _pricingBody,
    presets : _presetsBody,
    history : _historyBody,
    preview : _previewBody,
  }[tab] ?? _identityBody;
  const { text, rows } = body(guild, cfg, draft, viewerId);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  for (const row of rows) container.addActionRowComponents(row);

  // Barre de draft : visible dès qu'une modif est en attente (guild + profil).
  const pendingCount = Object.keys(draft?.fields ?? {}).length
    + Object.keys(draft?.profile ?? {}).length
    + (draft?.prefix != null ? 1 : 0);
  if (pendingCount > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e('btn_flag')} **${pendingCount} modification${pendingCount > 1 ? 's' : ''} en attente** — rien n'est enregistré tant que tu n'appliques pas.`,
      ),
    );
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('botconfig:studio:apply')
          .setLabel('Appliquer')
          .setEmoji(forButton('btn_success'))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('botconfig:studio:discard')
          .setLabel('Tout annuler')
          .setStyle(ButtonStyle.Danger),
      ),
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# Soulbot v${version} — Studio`),
  );

  const components = [container];

  // Aperçu live : 2e container simulant l'embed avec le thème du draft.
  if (tab === 'preview') {
    components.push(_buildPreviewContainer(guild, cfg, draft));
  }

  return { components, flags: MessageFlags.IsComponentsV2 };
}

// ─── Onglet Identité ──────────────────────────────────────────────────────────

function _identityBody(guild, cfg, draft, viewerId) {
  const settings = getGuildSettings(guild.id);
  const prefix   = draft?.prefix ?? settings?.prefix ?? ';';
  const nickname = _effective('nickname', draft, cfg) ?? guild.members.me?.nickname;

  const text =
    `${e('ui_user')} **Identité du bot sur ce serveur**\n` +
    `> Nickname : ${nickname ? `**${nickname}**` : '*Par défaut (Soulbot)*'}\n` +
    `> Bannière : ${_fmtValue('banner_url', _effective('banner_url', draft, cfg))}\n` +
    `> Avatar global : ${_fmtValue('avatar_url', _effective('avatar_url', draft, cfg))} ${isOwner(viewerId) ? '' : '*(BotOwner)*'}\n` +
    `> Prefix : \`${prefix}\``;

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('botconfig:studio:edit:nickname').setLabel('Nickname').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('botconfig:studio:edit:banner_url').setLabel('Bannière').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('botconfig:studio:edit:prefix').setLabel('Prefix').setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('botconfig:studio:edit:avatar_url')
        .setLabel('Avatar')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isOwner(viewerId)),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('botconfig:studio:gallery:banner')
        .setLabel('↺ Anciennes bannières')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('botconfig:studio:gallery:avatar')
        .setLabel('↺ Anciens avatars')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
  return { text, rows };
}

// ─── Onglet Thème ─────────────────────────────────────────────────────────────

function _themeBody(guild, cfg, draft) {
  const primary = _effective('embed_color', draft, cfg) ?? 'B600A8';
  const accent  = _effective('accent_color', draft, cfg);
  const style   = _effective('embed_style', draft, cfg) ?? 'rich';
  const themeNm = _effective('theme_name', draft, cfg) ?? 'magenta';
  const footerT = _effective('footer_text', draft, cfg);
  const emojiId = _effective('brand_emoji_id', draft, cfg);

  // V6 — couleurs + emojis sémantiques (null = charte Soulbot).
  const semColor = (f, def) => {
    const v = _effective(f, draft, cfg);
    return v ? `\`#${v}\`` : `*${def}*`;
  };
  const semEmoji = (f, fallbackName) => {
    const v = _effective(f, draft, cfg);
    return v ? `<:_:${v}>` : e(fallbackName);
  };

  const text =
    `${e('ui_bulb')} **Thème visuel** — hérité par TOUTES les commandes\n` +
    `> Thème : \`${themeNm}\` · Style : \`${style}\`\n` +
    `> Primaire : \`#${primary}\` · Accent : ${accent ? `\`#${accent}\`` : '*auto*'}\n` +
    `> Succès : ${semEmoji('emoji_success_id', 'btn_success')} ${semColor('color_success', 'vert')} · ` +
    `Erreur : ${semEmoji('emoji_error_id', 'ui_alert')} ${semColor('color_error', 'rouge')}\n` +
    `> Warning : ${semEmoji('emoji_warning_id', 'btn_flag')} ${semColor('color_warning', 'orange')} · ` +
    `Info : ${semEmoji('emoji_info_id', 'btn_tip')} ${semColor('color_info', 'bleu')}\n` +
    `> Footer : ${footerT ? `\`${footerT}\`` : '*Soulbot v' + version + '*'}\n` +
    `> Emoji de marque : ${emojiId ? `<:_:${emojiId}>` : '*aucun*'}`;

  const presetRow = new ActionRowBuilder().addComponents(
    Object.keys(THEME_PRESETS).map((name) => new ButtonBuilder()
      .setCustomId(`botconfig:studio:themepreset:${name}`)
      .setLabel(name.charAt(0).toUpperCase() + name.slice(1))
      .setStyle(themeNm === name ? ButtonStyle.Primary : ButtonStyle.Secondary)),
  );

  const styleRow = new ActionRowBuilder().addComponents(
    ['compact', 'rich', 'minimal'].map((s) => new ButtonBuilder()
      .setCustomId(`botconfig:studio:style:${s}`)
      .setLabel(s.charAt(0).toUpperCase() + s.slice(1))
      .setStyle(style === s ? ButtonStyle.Primary : ButtonStyle.Secondary)),
  );

  // Tout le reste passe par UN select (limite Discord : 40 composants/message).
  const editSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('botconfig:studio:editsel')
      .setPlaceholder('Modifier un élément du thème…')
      .addOptions([
        { label: 'Couleur primaire',   value: 'embed_color',      description: `Actuel : #${primary}` },
        { label: 'Couleur accent',     value: 'accent_color',     description: accent ? `Actuel : #${accent}` : 'Auto' },
        { label: 'Couleur succès',     value: 'color_success',    description: 'Embeds de confirmation' },
        { label: 'Couleur erreur',     value: 'color_error',      description: 'Embeds d\'erreur / refus' },
        { label: 'Couleur warning',    value: 'color_warning',    description: 'Embeds d\'avertissement' },
        { label: 'Couleur info',       value: 'color_info',       description: 'Embeds d\'information' },
        { label: 'Emoji succès',       value: 'emoji_success_id', description: 'Remplace l\'emoji de confirmation' },
        { label: 'Emoji erreur',       value: 'emoji_error_id',   description: 'Remplace l\'emoji d\'erreur' },
        { label: 'Emoji warning',      value: 'emoji_warning_id', description: 'Remplace l\'emoji d\'avertissement' },
        { label: 'Emoji info',         value: 'emoji_info_id',    description: 'Remplace l\'emoji d\'information' },
        { label: 'Emoji de marque',    value: 'brand_emoji_id',   description: 'Affiché en tête des panels' },
        { label: 'Texte du footer',    value: 'footer_text',      description: footerT ?? 'Soulbot v' + version },
        { label: 'Icône du footer',    value: 'footer_icon_url',  description: 'Petite image 64×64' },
        { label: 'Galerie des anciennes couleurs', value: 'gallery:color', description: 'Restaurer une couleur passée' },
      ]),
  );

  return { text, rows: [presetRow, styleRow, editSelect] };
}

// ─── Onglet Profil Bot (GLOBAL — BotOwner) ────────────────────────────────────

function _profileBody(guild, cfg, draft, viewerId) {
  const { getBotProfile } = require('../../core/bot-profile');
  const profile = getBotProfile() ?? {};
  const owner   = isOwner(viewerId);

  const eff = (f) => (draft?.profile && f in draft.profile) ? draft.profile[f] : profile[f] ?? null;
  const status = eff('presence_status') ?? 'online';
  const ptype  = eff('presence_type') ?? 'custom';
  const ptext  = eff('presence_text');
  const bio    = eff('bio');

  const STATUS_LABELS = { online: 'En ligne', idle: 'Inactif', dnd: 'Ne pas déranger', invisible: 'Invisible' };
  const TYPE_LABELS   = { playing: 'Joue à', watching: 'Regarde', listening: 'Écoute', competing: 'En compétition', streaming: 'Streame', custom: 'Custom' };

  const text =
    `${e('cat_owner')} **Profil global du bot** — s'applique sur TOUS les serveurs ${owner ? '' : '*(lecture seule — BotOwner requis)*'}\n` +
    `> Bio : ${bio ? `\`${bio.slice(0, 80)}${bio.length > 80 ? '…' : ''}\`` : '*vide*'}\n` +
    `> Bannière de profil : ${_fmtValue('banner_url', eff('banner_url'))}\n` +
    `> Statut : **${STATUS_LABELS[status] ?? status}** · Activité : **${TYPE_LABELS[ptype] ?? ptype}** ${ptext ? `\`${ptext}\`` : '*Version ' + version + '*'}\n` +
    `> Username : **${guild.client?.user?.username ?? 'Soulbot'}**`;

  if (!owner) return { text, rows: [] };

  const statusRow = new ActionRowBuilder().addComponents(
    Object.entries(STATUS_LABELS).map(([key, label]) => new ButtonBuilder()
      .setCustomId(`botconfig:studio:pstatus:${key}`)
      .setLabel(label)
      .setStyle(status === key ? ButtonStyle.Primary : ButtonStyle.Secondary)),
  );

  const typeSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('botconfig:studio:ptype')
      .setPlaceholder(`Type d'activité : ${TYPE_LABELS[ptype] ?? ptype}`)
      .addOptions(Object.entries(TYPE_LABELS).map(([key, label]) => ({
        label, value: key, default: ptype === key,
      }))),
  );

  const editSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('botconfig:studio:peditsel')
      .setPlaceholder('Modifier le profil…')
      .addOptions([
        { label: 'Bio ("À propos de moi")', value: 'bio',           description: '400 caractères max' },
        { label: 'Texte d\'activité',       value: 'presence_text', description: 'Affiché sous le nom du bot' },
        { label: 'Bannière de profil',      value: 'banner_url',    description: 'Image en haut du profil du bot' },
        { label: 'URL de stream',           value: 'presence_url',  description: 'Twitch/YouTube — type Streame' },
        { label: 'Username global',         value: 'username',      description: 'Rate-limit Discord 2/h — prudence' },
      ]),
  );

  return { text, rows: [statusRow, typeSelect, editSelect] };
}

// ─── Onglet Tarifs ────────────────────────────────────────────────────────────

function _pricingBody(guild, cfg, draft, viewerId) {
  const tiers = pricing.getAllPricing();
  const owner = isOwner(viewerId);

  const lines = tiers.map((t) => {
    const price = t.price_usd > 0 ? `$${t.price_usd.toFixed(2)}` : 'Gratuit';
    const badge = t.is_default ? ` ${e('btn_success')}` : '';
    return `${e('ani_diamond')} **${t.name}** — ${price}${badge}\n-# ${t.description ?? ''}`;
  });

  const text =
    `${e('ani_coin')} **Plans tarifaires** ${owner ? '*(édition BotOwner)*' : '*(lecture seule)*'}\n` +
    (lines.join('\n') || '*Aucun plan configuré.*') +
    '\n\n-# Monétisation conforme aux conditions Discord — voir `legalFields`.';

  const rows = [];
  if (owner && tiers.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('botconfig:studio:tierselect')
        .setPlaceholder('Modifier un tarif…')
        .addOptions(tiers.map((t) => ({
          label      : t.name,
          value      : t.id,
          description: t.price_usd > 0 ? `$${t.price_usd.toFixed(2)}` : 'Gratuit',
        }))),
    ));
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('botconfig:studio:tieradd').setLabel('Ajouter un plan').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('botconfig:studio:tierorder').setLabel('Réordonner').setStyle(ButtonStyle.Secondary),
    ));
  }
  return { text, rows };
}

// ─── Onglet Presets ───────────────────────────────────────────────────────────

function _presetsBody(guild) {
  const presets = listPresets(guild.id);

  const lines = presets.map((p) => {
    const active = p.is_active ? ` ${e('btn_success')} *actif*` : '';
    return `${e('ui_folder')} **${p.name}**${active} — <t:${p.created_at}:d>`;
  });

  const text =
    `${e('ui_folder')} **Presets** — snapshots complets (identité + thème + tarifs + prefix)\n` +
    `> ${presets.length}/10 emplacements utilisés\n\n` +
    (lines.join('\n') || '*Aucun preset — sauvegarde ton état actuel pour commencer.*');

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('botconfig:studio:presetsave')
        .setLabel('Sauvegarder l\'état actuel')
        .setEmoji(forButton('btn_success'))
        .setStyle(ButtonStyle.Success)
        .setDisabled(presets.length >= 10),
    ),
  ];
  if (presets.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('botconfig:studio:presetselect')
        .setPlaceholder('Charger / gérer un preset…')
        .addOptions(presets.slice(0, 25).map((p) => ({
          label      : p.name.slice(0, 100),
          value      : String(p.id),
          description: p.is_active ? 'Preset actif' : undefined,
        }))),
    ));
  }
  return { text, rows };
}

// ─── Onglet Historique ────────────────────────────────────────────────────────

function _historyBody(guild) {
  const log = getConfigLog(guild.id, 8);

  const lines = log.map((entry) => {
    const label = FIELD_LABELS[entry.field] ?? entry.field;
    return `> <t:${entry.ts}:d> **${label}** : ${_fmtValue(entry.field, entry.old_value)} → ${_fmtValue(entry.field, entry.new_value)} — <@${entry.user_id}>`;
  });

  const text =
    `${e('ui_pin')} **Historique des changements** — audit trail complet\n` +
    (lines.join('\n') || '*Aucun changement enregistré pour le moment.*') +
    '\n\n-# Sélectionne une entrée pour restaurer son ancienne valeur (rollback granulaire).';

  const rows = [];
  if (log.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('botconfig:studio:rollback')
        .setPlaceholder('Rollback une entrée…')
        .addOptions(log.map((entry) => ({
          label      : `${FIELD_LABELS[entry.field] ?? entry.field} — restaurer l'ancienne valeur`,
          value      : String(entry.id),
          description: (entry.old_value ?? 'défaut').slice(0, 100),
        }))),
    ));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('botconfig:studio:gallery:color').setLabel('↺ Couleurs').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('botconfig:studio:gallery:banner').setLabel('↺ Bannières').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('botconfig:studio:gallery:avatar').setLabel('↺ Avatars').setStyle(ButtonStyle.Secondary),
  ));
  return { text, rows };
}

// ─── Onglet Aperçu ────────────────────────────────────────────────────────────

function _previewBody(guild, cfg, draft) {
  const pendingCount = Object.keys(draft?.fields ?? {}).length;
  const text =
    `${e('btn_tip')} **Aperçu live** — rendu réel avec ${pendingCount ? 'le draft en cours' : 'la config enregistrée'}.\n` +
    '> Le bloc ci-dessous est affiché EXACTEMENT comme tes futurs panels.\n' +
    '> Modifie le thème puis reviens ici — l\'aperçu suit le draft, pas la DB.';
  return { text, rows: [] };
}

function _buildPreviewContainer(guild, cfg, draft) {
  const primary = _effective('embed_color', draft, cfg) ?? 'B600A8';
  const style   = _effective('embed_style', draft, cfg) ?? 'rich';
  const footerT = _effective('footer_text', draft, cfg) ?? `Soulbot v${version}`;
  const emojiId = _effective('brand_emoji_id', draft, cfg);
  const banner  = _effective('banner_url', draft, cfg);
  const nick    = _effective('nickname', draft, cfg) ?? 'Soulbot';

  const colorInt = parseInt(String(primary).replace(/^#/, ''), 16);
  const preview = new ContainerBuilder()
    .setAccentColor(Number.isFinite(colorInt) ? colorInt : 0xB600A8);

  const brand = emojiId ? `<:_:${emojiId}> ` : '';
  preview.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${brand}**${nick} — Démo du thème**`),
  );
  if (style !== 'compact') {
    const semEmoji = (f, fallbackName) => {
      const v = _effective(f, draft, cfg);
      return v ? `<:_:${v}>` : e(fallbackName);
    };
    const semHex = (f, def) => `#${(_effective(f, draft, cfg) ?? def).toUpperCase()}`;
    preview.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Voici à quoi ressemblera chaque réponse du bot sur ce serveur.\n' +
        `> Couleur primaire : \`#${String(primary).toUpperCase()}\`\n` +
        `> Style : \`${style}\`\n` +
        `> ${semEmoji('emoji_success_id', 'btn_success')} Succès \`${semHex('color_success', '00C851')}\` · ` +
        `${semEmoji('emoji_error_id', 'ui_alert')} Erreur \`${semHex('color_error', 'FF3333')}\`\n` +
        `> ${semEmoji('emoji_warning_id', 'btn_flag')} Warning \`${semHex('color_warning', 'FF8800')}\` · ` +
        `${semEmoji('emoji_info_id', 'btn_tip')} Info \`${semHex('color_info', '5865F2')}\``,
      ),
    );
  }
  if (banner) {
    preview.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Bannière : ${banner}`),
    );
  }
  if (style !== 'minimal') {
    preview.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    preview.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${footerT}`),
    );
  }
  return preview;
}

module.exports = { renderStudio, TABS, FIELD_LABELS, PROFILE_LABELS };
