'use strict';

// ═══════════════════════════════════════════════
// BOTCONFIG STUDIO HANDLER — V5
// Routing : botconfig:studio:<action>[:param] (boutons + selects)
//           botconfig_modal:studio:<champ>     (modals)
//
// Draft state : AUCUNE écriture DB tant que "Appliquer" n'est pas
// cliqué. Le draft vit en mémoire (Map guildId:userId, TTL 15 min).
// Apply = transaction better-sqlite3 (applyIdentityDraft) + side
// effects Discord (setNickname natif, setAvatar global rate-limité).
// ═══════════════════════════════════════════════

const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');
const { editableModal } = require('../../utils/panels-v4');
const { renderStudio, FIELD_LABELS, PROFILE_LABELS } = require('../panels/botconfig-studio');
const {
  FIELD_VALIDATORS, PROFILE_VALIDATORS, validatePrefix, validatePresetName,
} = require('../../utils/config-validators');
const { invalidateTheme, THEME_PRESETS } = require('../../utils/response-builder');
const { getGuildSettings, setGuildSetting } = require('../../database');
const {
  getGuildBotConfig, applyIdentityDraft, logConfigChange,
  getAssetHistory, getConfigLog,
  listPresets, getPreset, savePreset, duplicatePreset, deletePreset, setActivePreset,
} = require('../../core/guild-config');
const {
  getBotProfile, applyProfileDraft, applyPresence, applyBio, applyBotBanner,
} = require('../../core/bot-profile');
const pricing = require('../../core/pricing');
const { isOwner } = require('../../core/permissions');

// ─── Draft state ──────────────────────────────────────────────────────────────

const DRAFT_TTL = 15 * 60_000;
const _drafts = new Map(); // `${guildId}:${userId}` → { fields, prefix, tab, ts }

function _draftKey(guildId, userId) { return `${guildId}:${userId}`; }

function getDraft(guildId, userId) {
  const key = _draftKey(guildId, userId);
  const d = _drafts.get(key);
  if (d && Date.now() - d.ts > DRAFT_TTL) { _drafts.delete(key); return null; }
  return d ?? null;
}

function ensureDraft(guildId, userId) {
  let d = getDraft(guildId, userId);
  if (!d) {
    d = { fields: {}, profile: {}, prefix: null, tab: 'identity', ts: Date.now() };
    _drafts.set(_draftKey(guildId, userId), d);
  }
  if (!d.profile) d.profile = {}; // drafts V5 résiduels
  d.ts = Date.now();
  return d;
}

function clearDraft(guildId, userId) {
  _drafts.delete(_draftKey(guildId, userId));
}

// Lazy cleanup : purge des drafts expirés à chaque interaction (pas de timer).
function _sweepDrafts() {
  const now = Date.now();
  for (const [key, d] of _drafts) {
    if (now - d.ts > DRAFT_TTL) _drafts.delete(key);
  }
}

// ─── Rate-limit avatar global (Discord : ~2 changements/h) ───────────────────

const AVATAR_WINDOW = 60 * 60_000;
const AVATAR_MAX = 2;
let _avatarChanges = []; // timestamps des derniers setAvatar

function avatarRateLimited() {
  const now = Date.now();
  _avatarChanges = _avatarChanges.filter((t) => now - t < AVATAR_WINDOW);
  return _avatarChanges.length >= AVATAR_MAX;
}

// Username et bannière de profil : mêmes limites Discord (~2/h chacun).
let _usernameChanges = [];
let _bannerChanges   = [];

function _rateLimited(arr) {
  const now = Date.now();
  const kept = arr.filter((t) => now - t < AVATAR_WINDOW);
  arr.length = 0; arr.push(...kept);
  return kept.length >= AVATAR_MAX;
}

// ─── Helpers réponse ──────────────────────────────────────────────────────────

function _ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

async function _rerender(interaction, tab, draft) {
  const payload = renderStudio(interaction.guild, tab, draft, interaction.user.id);
  if (interaction.isModalSubmit()) {
    if (interaction.isFromMessage()) return interaction.update(payload);
    return interaction.reply({ ...payload, flags: payload.flags | MessageFlags.Ephemeral });
  }
  return interaction.update(payload);
}

// Modals d'édition par champ : placeholder + valeur actuelle préremplie.
const FIELD_MODAL_HINTS = {
  nickname        : 'Soulbot Custom (vide = reset)',
  banner_url      : 'https://… .png/.jpg/.gif/.webp (vide = reset)',
  avatar_url      : 'https://… — global, BotOwner, max 2/h',
  footer_icon_url : 'https://… icône 64×64 (vide = reset)',
  embed_color     : '#B600A8',
  accent_color    : '#E91E63',
  footer_text     : 'Mon serveur — propulsé par Soulbot (vide = défaut)',
  brand_emoji_id  : '<:nom:123456789012345678> ou l\'ID seul',
  prefix          : '; (1-5 caractères sans espace)',
  color_success   : '#00C851 (vide = vert charte)',
  color_error     : '#FF3333 (vide = rouge charte)',
  color_warning   : '#FF8800 (vide = orange charte)',
  color_info      : '#5865F2 (vide = bleu charte)',
  emoji_success_id: '<:nom:id> ou ID seul (vide = emoji Soulbot)',
  emoji_error_id  : '<:nom:id> ou ID seul (vide = emoji Soulbot)',
  emoji_warning_id: '<:nom:id> ou ID seul (vide = emoji Soulbot)',
  emoji_info_id   : '<:nom:id> ou ID seul (vide = emoji Soulbot)',
};

// Hints des modals profil global (onglet Profil Bot).
const PROFILE_MODAL_HINTS = {
  bio          : 'Présentation du bot, 400 caractères max (vide = retire la bio)',
  presence_text: 'Texte affiché sous le nom du bot (vide = Version x.y.z)',
  banner_url   : 'https://… .png/.jpg/.gif — bannière du profil (vide = retire)',
  presence_url : 'https://twitch.tv/… (type Streame uniquement)',
  username     : 'Nouveau nom global — rate-limit Discord 2/h',
};

function _openFieldModal(interaction, field, currentValue) {
  const modal = editableModal({
    customId: `botconfig_modal:studio:${field}`,
    title   : `Studio — ${FIELD_LABELS[field] ?? field}`,
    fields  : [{
      id         : 'value',
      label      : FIELD_LABELS[field] ?? field,
      value      : currentValue ?? undefined,
      required   : false,
      placeholder: FIELD_MODAL_HINTS[field],
      maxLength  : field.endsWith('_url') ? 2048 : 256,
    }],
  });
  return interaction.showModal(modal);
}

// ─── Application atomique du draft ───────────────────────────────────────────

async function _applyDraft(interaction, draft) {
  const { guild, user } = interaction;
  const warnings = [];

  // Avatar global : BotOwner + rate-limit. Retiré du draft si refusé.
  if ('avatar_url' in draft.fields) {
    if (!isOwner(user.id)) {
      delete draft.fields.avatar_url;
      warnings.push('Avatar global ignoré — réservé au BotOwner.');
    } else if (avatarRateLimited()) {
      delete draft.fields.avatar_url;
      warnings.push('Avatar global ignoré — limite Discord (2/h) atteinte, réessaie plus tard.');
    }
  }

  // 1) Side effect Discord d'abord : nickname natif (peut échouer → on n'écrit
  //    pas un état DB que Discord a refusé).
  if ('nickname' in draft.fields) {
    try {
      await guild.members.me.setNickname(draft.fields.nickname);
    } catch {
      delete draft.fields.nickname;
      warnings.push('Nickname refusé par Discord — vérifie **Gérer les pseudos** et la hiérarchie.');
    }
  }

  // 2) Avatar global (side effect Discord, hors transaction).
  if ('avatar_url' in draft.fields && draft.fields.avatar_url) {
    try {
      await interaction.client.user.setAvatar(draft.fields.avatar_url);
      _avatarChanges.push(Date.now());
    } catch (err) {
      delete draft.fields.avatar_url;
      warnings.push(`Avatar refusé par Discord : ${err.message?.slice(0, 80) ?? 'erreur inconnue'}`);
    }
  }

  // 3) Profil global (V6) : BotOwner only, side effects Discord AVANT le
  //    write DB — un refus Discord ne laisse jamais d'état fantôme.
  const profileDraft = { ...(draft.profile ?? {}) };
  if (Object.keys(profileDraft).length && !isOwner(user.id)) {
    for (const k of Object.keys(profileDraft)) delete profileDraft[k];
    warnings.push('Profil global ignoré — réservé au BotOwner.');
  }

  // Username : pas une colonne bot_profile — side effect pur + journal.
  if ('username' in profileDraft) {
    const newName = profileDraft.username;
    delete profileDraft.username;
    if (_rateLimited(_usernameChanges)) {
      warnings.push('Username ignoré — limite Discord (2/h) atteinte.');
    } else {
      try {
        const old = interaction.client.user.username;
        await interaction.client.user.setUsername(newName);
        _usernameChanges.push(Date.now());
        logConfigChange(guild.id, user.id, 'profile:username', old, newName);
      } catch (err) {
        warnings.push(`Username refusé par Discord : ${err.message?.slice(0, 80) ?? 'erreur inconnue'}`);
      }
    }
  }

  // Bannière du profil du bot (≠ banner_url du serveur).
  if ('banner_url' in profileDraft) {
    if (_rateLimited(_bannerChanges)) {
      delete profileDraft.banner_url;
      warnings.push('Bannière de profil ignorée — limite Discord (2/h) atteinte.');
    } else {
      try {
        await applyBotBanner(interaction.client, profileDraft.banner_url);
        _bannerChanges.push(Date.now());
      } catch (err) {
        delete profileDraft.banner_url;
        warnings.push(`Bannière de profil refusée : ${err.message?.slice(0, 80) ?? 'erreur inconnue'}`);
      }
    }
  }

  // Bio "À propos de moi" de l'application.
  if ('bio' in profileDraft) {
    try {
      await applyBio(interaction.client, profileDraft.bio);
    } catch (err) {
      delete profileDraft.bio;
      warnings.push(`Bio refusée par Discord : ${err.message?.slice(0, 80) ?? 'erreur inconnue'}`);
    }
  }

  // 4) Transactions DB : identité serveur, puis profil global.
  const changed = applyIdentityDraft(guild.id, draft.fields, user.id);
  const profileChanged = applyProfileDraft(profileDraft, user.id, guild.id);
  changed.push(...profileChanged.map((f) => `profile:${f}`));

  // 5) Présence : appliquée APRÈS le write (lit la DB à jour). Sans échec
  //    possible côté Discord — setPresence est fire-and-forget gateway.
  if (profileChanged.some((f) => f.startsWith('presence_'))) {
    applyPresence(interaction.client);
  }

  // 6) Prefix (guild_settings, hors guild_bot_config) + journal.
  if (draft.prefix != null) {
    const old = getGuildSettings(guild.id)?.prefix ?? ';';
    if (old !== draft.prefix) {
      setGuildSetting(guild.id, 'prefix', draft.prefix);
      logConfigChange(guild.id, user.id, 'prefix', old, draft.prefix);
      changed.push('prefix');
    }
  }

  invalidateTheme(guild.id);
  clearDraft(guild.id, user.id);

  return { changed, warnings };
}

// ─── Handler principal (boutons + selects) ────────────────────────────────────

/**
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @param {string[]} params - customId splitté après 'botconfig' (['studio', action, param])
 */
async function handleStudioInteraction(interaction, params) {
  _sweepDrafts();
  if (params[0] !== 'studio') return;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply(_ephemeral('Permission **Gérer le serveur** requise.'));
  }

  const [, action, param] = params;
  const { guild, user } = interaction;
  const draft = ensureDraft(guild.id, user.id);

  switch (action) {
    // ── Navigation ──────────────────────────────────────────────────────────
    case 'tab': {
      draft.tab = param;
      return _rerender(interaction, param, draft);
    }

    // ── Édition d'un champ → modal prérempli (draft prioritaire sur DB) ────
    case 'edit': {
      const field = param;
      if (field === 'avatar_url' && !isOwner(user.id)) {
        return interaction.reply(_ephemeral('Avatar global : réservé au **BotOwner**.'));
      }
      if (field === 'prefix') {
        const current = draft.prefix ?? getGuildSettings(guild.id)?.prefix ?? ';';
        return _openFieldModal(interaction, 'prefix', current);
      }
      if (!FIELD_VALIDATORS[field]) {
        return interaction.reply(_ephemeral('Champ inconnu.'));
      }
      const cfg = getGuildBotConfig(guild.id);
      const current = field in draft.fields ? draft.fields[field] : cfg?.[field];
      return _openFieldModal(interaction, field, current);
    }

    // ── Thème : preset intégré → 3 champs d'un coup dans le draft ──────────
    case 'themepreset': {
      const preset = THEME_PRESETS[param];
      if (!preset) return interaction.reply(_ephemeral('Thème inconnu.'));
      draft.fields.theme_name   = param;
      draft.fields.embed_color  = preset.primary.toString(16).toUpperCase().padStart(6, '0');
      draft.fields.accent_color = preset.accent.toString(16).toUpperCase().padStart(6, '0');
      return _rerender(interaction, 'theme', draft);
    }

    case 'style': {
      draft.fields.embed_style = param;
      return _rerender(interaction, 'theme', draft);
    }

    // ── Thème V6 : select unifié → modal (ou galerie) ──────────────────────
    case 'editsel': {
      const choice = interaction.values[0];
      if (choice === 'gallery:color') {
        // Même interaction, re-routée sur le flux galerie existant.
        return handleStudioInteraction(interaction, ['studio', 'gallery', 'color']);
      }
      if (!FIELD_VALIDATORS[choice]) return interaction.reply(_ephemeral('Champ inconnu.'));
      const cfg = getGuildBotConfig(guild.id);
      const current = choice in draft.fields ? draft.fields[choice] : cfg?.[choice];
      return _openFieldModal(interaction, choice, current);
    }

    // ── Profil Bot V6 (GLOBAL — BotOwner) ──────────────────────────────────
    case 'pstatus': {
      if (!isOwner(user.id)) return interaction.reply(_ephemeral('Profil global : réservé au **BotOwner**.'));
      const check = require('../../utils/config-validators').validatePresenceStatus(param);
      if (!check.ok) return interaction.reply(_ephemeral(check.error));
      draft.profile.presence_status = check.value;
      return _rerender(interaction, 'profile', draft);
    }

    case 'ptype': {
      if (!isOwner(user.id)) return interaction.reply(_ephemeral('Profil global : réservé au **BotOwner**.'));
      const check = require('../../utils/config-validators').validatePresenceType(interaction.values[0]);
      if (!check.ok) return interaction.reply(_ephemeral(check.error));
      draft.profile.presence_type = check.value;
      return _rerender(interaction, 'profile', draft);
    }

    case 'peditsel': {
      if (!isOwner(user.id)) return interaction.reply(_ephemeral('Profil global : réservé au **BotOwner**.'));
      const field = interaction.values[0];
      if (!PROFILE_VALIDATORS[field]) return interaction.reply(_ephemeral('Champ inconnu.'));
      const profile = getBotProfile() ?? {};
      const current = field in draft.profile ? draft.profile[field]
        : field === 'username' ? interaction.client.user.username
        : profile[field];
      return interaction.showModal(editableModal({
        customId: `botconfig_modal:studio:profile:${field}`,
        title   : `Profil Bot — ${PROFILE_LABELS[field] ?? field}`,
        fields  : [{
          id         : 'value',
          label      : PROFILE_LABELS[field] ?? field,
          value      : current ?? undefined,
          required   : false,
          placeholder: PROFILE_MODAL_HINTS[field],
          maxLength  : field === 'bio' ? 400 : field.endsWith('_url') ? 2048 : 128,
        }],
      }));
    }

    // ── Galerie d'assets : restaurer une ancienne valeur dans le draft ─────
    case 'gallery': {
      const assets = getAssetHistory(guild.id, param, 20);
      if (!assets.length) {
        return interaction.reply(_ephemeral(`Aucun historique pour \`${param}\` — les anciennes valeurs apparaîtront ici après tes premiers changements.`));
      }
      const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
      const select = new StringSelectMenuBuilder()
        .setCustomId(`botconfig:studio:restore:${param}`)
        .setPlaceholder(`Restaurer un(e) ${param}…`)
        .addOptions(assets.slice(0, 25).map((a) => ({
          label      : param === 'color' ? `#${a.value}` : a.value.slice(0, 100),
          value      : String(a.id),
          description: `Utilisé le ${new Date(a.applied_at * 1000).toLocaleDateString('fr-FR')}`,
        })));
      return interaction.reply({
        content   : `↺ **Galerie ${param}** — la valeur choisie part dans le draft (rien n'est appliqué).`,
        components: [new ActionRowBuilder().addComponents(select)],
        flags     : MessageFlags.Ephemeral,
      });
    }

    case 'restore': {
      const asset = getAssetHistory(guild.id, param, 20).find((a) => String(a.id) === interaction.values[0]);
      if (!asset) return interaction.reply(_ephemeral('Entrée introuvable.'));
      const fieldByType = { avatar: 'avatar_url', banner: 'banner_url', color: 'embed_color' };
      draft.fields[fieldByType[param]] = asset.value;
      return interaction.update({
        content: `↺ Valeur restaurée dans le draft — retourne au Studio et clique **Appliquer**.`,
        components: [],
      });
    }

    // ── Rollback granulaire depuis l'historique ────────────────────────────
    case 'rollback': {
      const entry = getConfigLog(guild.id, 50).find((l) => String(l.id) === interaction.values[0]);
      if (!entry) return interaction.reply(_ephemeral('Entrée introuvable.'));
      if (entry.field === 'prefix') draft.prefix = entry.old_value ?? ';';
      else if (entry.field.startsWith('profile:')) {
        if (!isOwner(user.id)) return interaction.reply(_ephemeral('Rollback profil global : réservé au **BotOwner**.'));
        draft.profile[entry.field.slice('profile:'.length)] = entry.old_value;
      }
      else draft.fields[entry.field] = entry.old_value;
      return _rerender(interaction, 'history', draft);
    }

    // ── Apply / Discard ─────────────────────────────────────────────────────
    case 'apply': {
      const pending = Object.keys(draft.fields).length
        + Object.keys(draft.profile ?? {}).length
        + (draft.prefix != null ? 1 : 0);
      if (!pending) return interaction.reply(_ephemeral('Aucune modification en attente.'));

      await interaction.deferUpdate();
      const { changed, warnings } = await _applyDraft(interaction, draft);

      const payload = renderStudio(guild, 'identity', null, user.id);
      await interaction.editReply(payload);

      const summary = changed.length
        ? `Appliqué : ${changed.map((f) => `**${FIELD_LABELS[f] ?? f}**`).join(', ')}.`
        : 'Aucun champ modifié (valeurs identiques).';
      const warnStr = warnings.length ? `\n${warnings.map((w) => `> ${w}`).join('\n')}` : '';
      return interaction.followUp(_ephemeral(`${summary}${warnStr}`));
    }

    case 'discard': {
      clearDraft(guild.id, user.id);
      return _rerender(interaction, draft.tab ?? 'identity', null);
    }

    // ── Presets ─────────────────────────────────────────────────────────────
    case 'presetsave': {
      return interaction.showModal(editableModal({
        customId: 'botconfig_modal:studio:presetname',
        title   : 'Sauvegarder un preset',
        fields  : [{ id: 'value', label: 'Nom du preset', placeholder: 'Saison Halloween, Mode épuré…', maxLength: 50 }],
      }));
    }

    case 'presetselect': {
      const preset = getPreset(guild.id, Number(interaction.values[0]));
      if (!preset) return interaction.reply(_ephemeral('Preset introuvable.'));
      const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
      return interaction.reply({
        content: `**${preset.name}** — que faire ?`,
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`botconfig:studio:presetload:${preset.id}`).setLabel('Charger').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`botconfig:studio:presetdup:${preset.id}`).setLabel('Dupliquer').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`botconfig:studio:presetdel:${preset.id}`).setLabel('Supprimer').setStyle(ButtonStyle.Danger),
        )],
        flags: MessageFlags.Ephemeral,
      });
    }

    case 'presetload': {
      const preset = getPreset(guild.id, Number(param));
      if (!preset?.payload) return interaction.reply(_ephemeral('Preset corrompu ou introuvable.'));

      // Chargement = remplit le DRAFT (pas la DB) → l'utilisateur voit tout
      // dans l'aperçu et confirme via Appliquer. Cohérent avec le reste.
      const { identity = {}, prefix } = preset.payload;
      for (const [field, value] of Object.entries(identity)) {
        if (FIELD_VALIDATORS[field]) draft.fields[field] = value;
      }
      if (prefix) draft.prefix = prefix;
      setActivePreset(guild.id, preset.id);

      // Tarifs : globaux → BotOwner uniquement, appliqués directement.
      let pricingNote = '';
      if (preset.payload.pricing && isOwner(user.id)) {
        for (const t of preset.payload.pricing) {
          pricing.updatePricing(t.id, { price_usd: t.price_usd, price_discord: t.price_discord, updated_by: user.id });
        }
        pricingNote = ' Tarifs restaurés.';
      } else if (preset.payload.pricing) {
        pricingNote = ' Tarifs ignorés (BotOwner requis).';
      }

      await interaction.update({ content: `**${preset.name}** chargé dans le draft.${pricingNote}\nRetourne au Studio → **Aperçu** pour vérifier, puis **Appliquer**.`, components: [] });
      return;
    }

    case 'presetdup': {
      const result = duplicatePreset(guild.id, Number(param));
      const msg = result.ok ? 'Preset dupliqué.'
        : result.reason === 'limit' ? 'Limite de 10 presets atteinte.'
        : 'Duplication impossible (nom déjà pris ?).';
      return interaction.update({ content: msg, components: [] });
    }

    case 'presetdel': {
      const ok = deletePreset(guild.id, Number(param));
      return interaction.update({ content: ok ? 'Preset supprimé.' : 'Preset introuvable.', components: [] });
    }

    // ── Tarifs (BotOwner) ───────────────────────────────────────────────────
    case 'tierselect': {
      if (!isOwner(user.id)) return interaction.reply(_ephemeral('Réservé au BotOwner.'));
      const tier = pricing.getPricingById(interaction.values[0]);
      if (!tier) return interaction.reply(_ephemeral('Tier introuvable.'));
      return interaction.showModal(editableModal({
        customId: `botconfig_modal:studio:tier:${tier.id}`,
        title   : `Tarif — ${tier.name}`,
        fields  : [
          { id: 'price', label: 'Prix USD (0 = gratuit)', value: String(tier.price_usd), maxLength: 10 },
          { id: 'desc',  label: 'Description', value: tier.description ?? '', required: false, maxLength: 100 },
          { id: 'order', label: 'Position (0 = premier)', value: String(tier.display_order ?? 0), maxLength: 3 },
          { id: 'isdef', label: 'Défaut ? (oui/non)', value: tier.is_default ? 'oui' : 'non', maxLength: 3 },
          { id: 'active', label: 'Actif ? (oui/non — non = retiré)', value: 'oui', maxLength: 3 },
        ],
      }));
    }

    case 'tieradd': {
      if (!isOwner(user.id)) return interaction.reply(_ephemeral('Réservé au BotOwner.'));
      return interaction.showModal(editableModal({
        customId: 'botconfig_modal:studio:tiernew',
        title   : 'Nouveau plan tarifaire',
        fields  : [
          { id: 'name',  label: 'Nom du plan', placeholder: 'Tier Ultra', maxLength: 50 },
          { id: 'price', label: 'Prix USD', placeholder: '29.99', maxLength: 10 },
          { id: 'desc',  label: 'Description', required: false, maxLength: 100 },
        ],
      }));
    }

    case 'tierorder': {
      if (!isOwner(user.id)) return interaction.reply(_ephemeral('Réservé au BotOwner.'));
      const order = pricing.getAllPricing().map((t, i) => `${i}. **${t.name}**`).join('\n');
      return interaction.reply(_ephemeral(`Ordre actuel :\n${order}\n\nPour déplacer un plan : sélectionne-le dans la liste et change sa **Position**.`));
    }

    default:
      return interaction.reply(_ephemeral('Action inconnue.'));
  }
}

// ─── Handler modals ───────────────────────────────────────────────────────────

/**
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {string[]} params - ['studio', champ, param?]
 */
async function handleStudioModal(interaction, params) {
  if (params[0] !== 'studio') return;
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply(_ephemeral('Permission **Gérer le serveur** requise.'));
  }

  const [, field, param] = params;
  const { guild, user } = interaction;
  const draft = ensureDraft(guild.id, user.id);

  // ── Preset : sauvegarde de l'état ACTUEL (DB, pas le draft) ──────────────
  if (field === 'presetname') {
    const check = validatePresetName(interaction.fields.getTextInputValue('value'));
    if (!check.ok) return interaction.reply(_ephemeral(check.error));

    const cfg = getGuildBotConfig(guild.id) ?? {};
    const payload = {
      identity: Object.fromEntries(
        Object.keys(FIELD_VALIDATORS).map((f) => [f, cfg[f] ?? null]),
      ),
      prefix : getGuildSettings(guild.id)?.prefix ?? ';',
      pricing: pricing.getAllPricing().map((t) => ({ id: t.id, price_usd: t.price_usd, price_discord: t.price_discord })),
    };
    const result = savePreset(guild.id, check.value, payload);
    if (!result.ok) {
      return interaction.reply(_ephemeral(
        result.reason === 'limit' ? 'Limite de **10 presets** atteinte — supprime-en un d\'abord.' : `Le nom **${check.value}** est déjà pris.`,
      ));
    }
    return _rerender(interaction, 'presets', draft);
  }

  // ── Tarifs : édition d'un tier existant ──────────────────────────────────
  if (field === 'tier') {
    if (!isOwner(user.id)) return interaction.reply(_ephemeral('Réservé au BotOwner.'));
    const tier = pricing.getPricingById(param);
    if (!tier) return interaction.reply(_ephemeral('Tier introuvable.'));

    const price = Number(interaction.fields.getTextInputValue('price').replace(',', '.').replace(/^\$/, ''));
    if (!Number.isFinite(price) || price < 0 || price > 10_000) {
      return interaction.reply(_ephemeral('Prix invalide — nombre entre 0 et 10000 attendu.'));
    }
    const order = Number(interaction.fields.getTextInputValue('order'));
    const isDef = interaction.fields.getTextInputValue('isdef').trim().toLowerCase() === 'oui';
    const active = interaction.fields.getTextInputValue('active').trim().toLowerCase() !== 'non';

    pricing.updatePricing(tier.id, {
      price_usd    : price,
      price_discord: Math.round(price * 100),
      description  : interaction.fields.getTextInputValue('desc') || tier.description,
      updated_by   : user.id,
    });
    if (Number.isFinite(order)) pricing.setPricingOrder(tier.id, order, user.id);
    pricing.setPricingDefault(tier.id, isDef, user.id);
    if (!active) pricing.deactivatePricing(tier.id, user.id);
    await pricing.syncPricingAcrossBot(tier.id, interaction.client);
    logConfigChange(guild.id, user.id, `pricing:${tier.id}`, String(tier.price_usd), String(price));

    return _rerender(interaction, 'pricing', draft);
  }

  // ── Tarifs : création ─────────────────────────────────────────────────────
  if (field === 'tiernew') {
    if (!isOwner(user.id)) return interaction.reply(_ephemeral('Réservé au BotOwner.'));
    const name  = interaction.fields.getTextInputValue('name').trim();
    const price = Number(interaction.fields.getTextInputValue('price').replace(',', '.').replace(/^\$/, ''));
    if (!name) return interaction.reply(_ephemeral('Nom requis.'));
    if (!Number.isFinite(price) || price < 0 || price > 10_000) {
      return interaction.reply(_ephemeral('Prix invalide — nombre entre 0 et 10000 attendu.'));
    }
    const result = pricing.addPricing(name, price, interaction.fields.getTextInputValue('desc') || null, user.id);
    if (!result.ok) {
      return interaction.reply(_ephemeral(result.reason === 'duplicate' ? 'Un plan avec cet identifiant existe déjà.' : 'Nom invalide.'));
    }
    logConfigChange(guild.id, user.id, `pricing:${result.id}`, null, String(price));
    return _rerender(interaction, 'pricing', draft);
  }

  // ── Profil global V6 → draft.profile (BotOwner) ──────────────────────────
  if (field === 'profile') {
    if (!isOwner(user.id)) return interaction.reply(_ephemeral('Profil global : réservé au **BotOwner**.'));
    const pField = param;
    const validator = PROFILE_VALIDATORS[pField];
    if (!validator) return interaction.reply(_ephemeral('Champ inconnu.'));
    const check = validator(interaction.fields.getTextInputValue('value') ?? '');
    if (!check.ok) return interaction.reply(_ephemeral(check.error));
    draft.profile[pField] = check.value;
    return _rerender(interaction, 'profile', draft);
  }

  // ── Prefix → draft ────────────────────────────────────────────────────────
  const raw = interaction.fields.getTextInputValue('value') ?? '';
  if (field === 'prefix') {
    const check = validatePrefix(raw);
    if (!check.ok) return interaction.reply(_ephemeral(check.error));
    draft.prefix = check.value;
    return _rerender(interaction, 'identity', draft);
  }

  // ── Champ identité/thème générique → validation SecOps → draft ───────────
  const validator = FIELD_VALIDATORS[field];
  if (!validator) return interaction.reply(_ephemeral('Champ inconnu.'));
  if (field === 'avatar_url' && !isOwner(user.id)) {
    return interaction.reply(_ephemeral('Avatar global : réservé au **BotOwner**.'));
  }

  const check = validator(raw);
  if (!check.ok) return interaction.reply(_ephemeral(check.error));

  draft.fields[field] = check.value;
  // Couleur custom à la main → le thème devient 'custom' (cohérence presets).
  if ((field === 'embed_color' || field === 'accent_color')) draft.fields.theme_name = 'custom';

  const tabByField = {
    nickname: 'identity', banner_url: 'identity', avatar_url: 'identity',
    embed_color: 'theme', accent_color: 'theme', footer_text: 'theme',
    footer_icon_url: 'theme', embed_style: 'theme', brand_emoji_id: 'theme', theme_name: 'theme',
    color_success: 'theme', color_error: 'theme', color_warning: 'theme', color_info: 'theme',
    emoji_success_id: 'theme', emoji_error_id: 'theme', emoji_warning_id: 'theme', emoji_info_id: 'theme',
  };
  return _rerender(interaction, tabByField[field] ?? 'identity', draft);
}

module.exports = { handleStudioInteraction, handleStudioModal, getDraft, clearDraft };
