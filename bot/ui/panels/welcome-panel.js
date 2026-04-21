'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const {
  getWelcomeConfig,
  getFields,
  getAutoRoles,
  getStats,
} = require('../../core/welcome-helper');

// Sources d'image disponibles (thumbnail, image, author icon, footer icon)
const SRC_OPTIONS = [
  { label: 'Avatar du membre',   value: 'user_avatar', emoji: '👤' },
  { label: 'Icône du serveur',   value: 'server_icon', emoji: '🏠' },
  { label: 'Bannière du membre', value: 'user_banner',  emoji: '🖼️' },
  { label: 'URL personnalisée',  value: 'custom',       emoji: '🔗' },
  { label: 'Aucune',             value: 'none',         emoji: '⛔' },
];

function srcLabel(val) {
  const o = SRC_OPTIONS.find(s => s.value === val);
  return o ? `${o.emoji} ${o.label}` : val || 'Non défini';
}

// ─── Panel Principal ──────────────────────────────────────────────────────────

function renderMainPanel(guildId) {
  const cfg   = getWelcomeConfig(guildId) || {};
  const roles = getAutoRoles(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 👋 Welcomer — Configuration'),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Statut + mode ─────────────────────────────────────────────────────────
  const statusEmoji = cfg.enabled ? '🟢' : '🔴';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${statusEmoji} **${cfg.enabled ? 'Activé' : 'Désactivé'}** · Mode : \`${cfg.mode || 'embed'}\``,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:toggle')
          .setLabel(cfg.enabled ? 'Désactiver' : 'Activer')
          .setStyle(cfg.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('welcome:mode')
        .setPlaceholder(`Mode actuel : ${cfg.mode || 'embed'}`)
        .addOptions([
          { label: 'Embed seul',    value: 'embed', emoji: '🎨', default: !cfg.mode || cfg.mode === 'embed' },
          { label: 'Texte seul',    value: 'text',  emoji: '💬', default: cfg.mode === 'text'  },
          { label: 'Texte + Embed', value: 'both',  emoji: '📝', default: cfg.mode === 'both'  },
          { label: 'Image seule',   value: 'image', emoji: '🖼️', default: cfg.mode === 'image' },
        ]),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Salon ────────────────────────────────────────────────────────────────
  const ch1 = cfg.channel_id ? `<#${cfg.channel_id}>` : '*Non défini*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 📍 Salon\n**Principal :** ${ch1}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:channel_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('welcome:channel')
        .setPlaceholder('Sélectionner le salon d\'arrivée')
        .setChannelTypes([ChannelType.GuildText])
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Rôles auto ────────────────────────────────────────────────────────────
  const rolesText = roles.length
    ? roles.map(r => `<@&${r.role_id}>`).join(' ')
    : '*Aucun rôle configuré*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🎭 Rôles auto (${roles.length}/5)\n${rolesText}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:roles_clear')
          .setLabel('Tout supprimer')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(roles.length === 0),
      ),
  );
  if (roles.length < 5) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId('welcome:role_add')
          .setPlaceholder('Ajouter un rôle auto-assigné')
          .setMinValues(1).setMaxValues(1),
      ),
    );
  }
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Texte + mention ───────────────────────────────────────────────────────
  const textPreview = cfg.text_content
    ? '`' + cfg.text_content.slice(0, 80) + (cfg.text_content.length > 80 ? '…' : '') + '`'
    : '*Non configuré*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 💬 Texte\n${textPreview}\nMention : **${cfg.mention_user ? '🟢 Oui' : '🔴 Non'}**`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:text_edit')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Primary),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── DM + auto-delete ──────────────────────────────────────────────────────
  const deleteLabel = cfg.auto_delete_seconds > 0 ? `${cfg.auto_delete_seconds}s` : 'Jamais';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ✉️ DM\n${cfg.dm_enabled ? '🟢 Activé' : '🔴 Désactivé'}\n` +
          `## ⏱️ Auto-delete\n**${deleteLabel}** après envoi`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:dm_toggle')
          .setLabel(cfg.dm_enabled ? 'DM Off' : 'DM On')
          .setStyle(cfg.dm_enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Presets ───────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## ⚡ Preset rapide'));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('welcome:preset')
        .setPlaceholder('Appliquer un preset de configuration…')
        .addOptions([
          { label: 'Modern',  value: 'modern',  emoji: '✨', description: 'Embed épuré avec avatar' },
          { label: 'Gaming',  value: 'gaming',  emoji: '🎮', description: 'Style Gaming violet' },
          { label: 'Minimal', value: 'minimal', emoji: '📝', description: 'Texte simple uniquement' },
          { label: 'Festive', value: 'festive', emoji: '🎊', description: 'Style festif coloré' },
        ]),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Navigation ────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## ⚙️ Panels de configuration'));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('welcome:embed_panel').setLabel('🎨 Embed').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('welcome:fields_panel').setLabel('🏷️ Champs').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('welcome:advanced_panel').setLabel('⚙️ Avancé').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('welcome:preview_panel').setLabel('👁️ Aperçu').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('welcome:reset_confirm').setLabel('🗑️ Reset').setStyle(ButtonStyle.Danger),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Sous-panel Embed ─────────────────────────────────────────────────────────

function renderEmbedPanel(guildId) {
  const cfg = getWelcomeConfig(guildId) || {};
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎨 Configuration de l\'Embed'));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Titre + URL titre
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Titre**\n${cfg.embed_title ? `\`${cfg.embed_title.slice(0, 80)}\`` : '*Non défini*'}\n` +
          `**URL titre**\n${cfg.embed_title_url || '*Aucune*'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_title_edit').setLabel('Modifier titre').setStyle(ButtonStyle.Primary),
      ),
  );

  // Description
  const descPreview = cfg.embed_description
    ? cfg.embed_description.slice(0, 100) + (cfg.embed_description.length > 100 ? '…' : '')
    : '*Non définie*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Description**\n${descPreview}`),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_desc_edit').setLabel('Modifier').setStyle(ButtonStyle.Primary),
      ),
  );

  // Couleur
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Couleur**\n\`${cfg.embed_color || '#F39C12'}\``),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_color_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Thumbnail source
  const thumbSrc = cfg.embed_thumbnail_source || 'none';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Thumbnail**\nSource : ${srcLabel(thumbSrc)}` +
          (thumbSrc === 'custom' && cfg.embed_thumbnail_url ? `\n\`${cfg.embed_thumbnail_url.slice(0, 60)}\`` : ''),
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_thumb_url_edit').setLabel('URL custom').setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('welcome:embed_thumb_src')
        .setPlaceholder(`Thumbnail : ${srcLabel(thumbSrc)}`)
        .addOptions(SRC_OPTIONS.map(o => ({ ...o, default: o.value === thumbSrc }))),
    ),
  );

  // Image principale source
  const imgSrc = cfg.embed_image_source || 'none';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Image principale**\nSource : ${srcLabel(imgSrc)}` +
          (imgSrc === 'custom' && cfg.embed_image_url ? `\n\`${cfg.embed_image_url.slice(0, 60)}\`` : ''),
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_image_url_edit').setLabel('URL custom').setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('welcome:embed_image_src')
        .setPlaceholder(`Image : ${srcLabel(imgSrc)}`)
        .addOptions(SRC_OPTIONS.map(o => ({ ...o, default: o.value === imgSrc }))),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Author
  const authIconSrc = cfg.embed_author_icon_source || 'none';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Author**\nNom : ${cfg.embed_author_name ? `\`${cfg.embed_author_name.slice(0, 60)}\`` : '*Non défini*'}\n` +
          `Icône : ${srcLabel(authIconSrc)}\nURL : ${cfg.embed_author_url || '*Aucune*'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_author_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('welcome:embed_author_icon_src')
        .setPlaceholder(`Author icône : ${srcLabel(authIconSrc)}`)
        .addOptions(SRC_OPTIONS.map(o => ({ ...o, default: o.value === authIconSrc }))),
    ),
  );

  // Footer
  const footIconSrc = cfg.embed_footer_icon_source || 'none';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Footer**\nTexte : ${cfg.embed_footer_text ? `\`${cfg.embed_footer_text.slice(0, 60)}\`` : '*Non défini*'}\n` +
          `Icône : ${srcLabel(footIconSrc)}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder().setCustomId('welcome:embed_footer_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('welcome:embed_footer_icon_src')
        .setPlaceholder(`Footer icône : ${srcLabel(footIconSrc)}`)
        .addOptions(SRC_OPTIONS.map(o => ({ ...o, default: o.value === footIconSrc }))),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Timestamp + retour
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Timestamp**\n${cfg.embed_timestamp ? '🟢 Affiché' : '🔴 Masqué'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:embed_timestamp')
          .setLabel(cfg.embed_timestamp ? 'Désactiver' : 'Activer')
          .setStyle(cfg.embed_timestamp ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('welcome:back_main').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Sous-panel Champs ────────────────────────────────────────────────────────

function renderFieldsPanel(guildId) {
  const fields    = getFields(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 🏷️ Champs personnalisés — ${fields.length}/25`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (fields.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Aucun champ défini. Clique sur \"+ Ajouter\" pour commencer.*'),
    );
  } else {
    for (const f of fields) {
      const inlineTag  = f.inline ? ' *(inline)*' : '';
      const valPreview = f.value.length > 60 ? f.value.slice(0, 60) + '…' : f.value;
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${f.name}**${inlineTag}\n↳ ${valPreview}`),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`welcome:field_remove:${f.id}`)
              .setLabel('❌')
              .setStyle(ButtonStyle.Danger),
          ),
      );
      container.addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`welcome:field_edit:${f.id}`)
            .setLabel('Modifier')
            .setStyle(ButtonStyle.Primary),
        ),
      );
    }
  }
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  const row = new ActionRowBuilder();
  if (fields.length < 25) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('welcome:field_add_modal')
        .setLabel('+ Ajouter un champ')
        .setStyle(ButtonStyle.Success),
    );
  }
  row.addComponents(
    new ButtonBuilder().setCustomId('welcome:back_main').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
  );
  container.addActionRowComponents(row);

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Sous-panel Avancé ────────────────────────────────────────────────────────

function renderAdvancedPanel(guildId) {
  const cfg = getWelcomeConfig(guildId) || {};
  const stats   = getStats(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# ⚙️ Configuration Avancée'),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Salon secondaire
  const ch2 = cfg.secondary_channel_id ? `<#${cfg.secondary_channel_id}>` : '*Aucun*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Salon secondaire**\n${ch2}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:channel2_reset')
          .setLabel('Supprimer')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('welcome:channel2')
        .setPlaceholder('Salon secondaire (optionnel)')
        .setChannelTypes([ChannelType.GuildText])
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Filtres membres
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Ignorer les bots**\n${cfg.ignore_bots ? '🟢 Oui' : '🔴 Non'}\n` +
          `**Âge compte minimum**\n${cfg.min_account_age_days > 0 ? `${cfg.min_account_age_days} jour(s)` : 'Aucun'}\n` +
          `**Cooldown**\n${cfg.cooldown_seconds > 0 ? `${cfg.cooldown_seconds}s` : 'Aucun'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:ignore_bots')
          .setLabel(cfg.ignore_bots ? 'Bots On' : 'Bots Off')
          .setStyle(cfg.ignore_bots ? ButtonStyle.Success : ButtonStyle.Secondary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('welcome:min_age_edit').setLabel('Âge min').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('welcome:cooldown_edit').setLabel('Cooldown').setStyle(ButtonStyle.Secondary),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Rôle requis
  const reqRole = cfg.require_role_id ? `<@&${cfg.require_role_id}>` : '*Aucun*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Rôle requis pour déclencher**\n${reqRole}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:require_role_reset')
          .setLabel('Supprimer')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('welcome:require_role')
        .setPlaceholder('Sélectionner un rôle requis')
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Plages horaires + mention + DM delay
  const hoursText = (cfg.active_hours_start >= 0 && cfg.active_hours_end >= 0)
    ? `${String(cfg.active_hours_start).padStart(2, '0')}h → ${String(cfg.active_hours_end).padStart(2, '0')}h`
    : 'Toujours';
  const weekdaysText = cfg.active_weekdays || 'Toujours';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Heures actives**\n${hoursText}\n` +
          `**Jours actifs** (0=dim,1=lun…)\n${weekdaysText}\n` +
          `**DM — délai**\n${cfg.dm_delay_seconds > 0 ? `${cfg.dm_delay_seconds}s` : 'Immédiat'}\n` +
          `**Mention puis supprimer**\n${cfg.mention_then_delete ? '🟢 Oui' : '🔴 Non'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:mention_then_delete')
          .setLabel(cfg.mention_then_delete ? 'MtD Off' : 'MtD On')
          .setStyle(cfg.mention_then_delete ? ButtonStyle.Danger : ButtonStyle.Secondary),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('welcome:hours_edit').setLabel('Heures').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('welcome:weekdays_edit').setLabel('Jours').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('welcome:dm_delay_edit').setLabel('Délai DM').setStyle(ButtonStyle.Secondary),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // Stats
  const lastDate = stats.last
    ? new Date(stats.last.triggered_at).toLocaleDateString('fr-FR')
    : 'jamais';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 📊 Statistiques\n` +
      `Total : **${stats.total}** arrivées loguées\n` +
      `30 derniers jours : **${stats.last30}**\n` +
      `Dernier : **${lastDate}**`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('welcome:back_main').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Sous-panel Aperçu ────────────────────────────────────────────────────────

function renderPreviewPanel(guildId) {
  const cfg       = getWelcomeConfig(guildId) || {};
  const fields    = getFields(guildId);
  const roles     = getAutoRoles(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 👁️ Aperçu & Simulation'),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Résumé config
  const ch1       = cfg.channel_id ? `<#${cfg.channel_id}>` : '⚠️ *Non défini*';
  const mode      = cfg.mode || 'embed';
  const hasEmbed  = (mode === 'embed' || mode === 'both');
  const hasText   = (mode === 'text'  || mode === 'both');
  const rolesLine = roles.length ? roles.map(r => `<@&${r.role_id}>`).join(' ') : '*Aucun*';

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### Résumé de la configuration\n` +
      `**Statut :** ${cfg.enabled ? '🟢 Actif' : '🔴 Inactif'}\n` +
      `**Salon :** ${ch1}\n` +
      `**Mode :** \`${mode}\`\n` +
      (hasText  ? `**Texte :** ${cfg.text_content ? '✓ Défini' : '✗ Manquant'}\n` : '') +
      (hasEmbed ? `**Embed :** ${cfg.embed_title ? '✓ Titre défini' : '~ Sans titre'} · Couleur \`${cfg.embed_color || '#F39C12'}\`\n` : '') +
      `**Champs :** ${fields.length}/25\n` +
      `**Rôles auto :** ${rolesLine}\n` +
      `**DM :** ${cfg.dm_enabled ? '🟢 Activé' : '🔴 Désactivé'}\n` +
      `**Auto-delete :** ${cfg.auto_delete_seconds > 0 ? `${cfg.auto_delete_seconds}s` : 'Non'}`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Variables disponibles
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### 📚 Variables disponibles\n` +
      `\`{user}\` · \`{mention}\` · \`{tag}\` · \`{id}\` · \`{displayname}\`\n` +
      `\`{server}\` · \`{servername}\` · \`{serverid}\`\n` +
      `\`{membercount}\` · \`{membercount_ordinal}\`\n` +
      `\`{account_age}\` · \`{account_age_days}\` · \`{account_created}\`\n` +
      `\`{joined_at}\` · \`{avatar_url}\` · \`{server_icon}\` · \`{random_color}\``,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // Actions
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('welcome:preview')
        .setLabel('Aperçu embed')
        .setEmoji('👁️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('welcome:simulate')
        .setLabel('Simuler arrivée')
        .setEmoji('🧪')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('welcome:back_main')
        .setLabel('← Retour')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
  renderMainPanel,
  renderWelcomePanel: renderMainPanel, // alias rétro-compatibilité
  renderEmbedPanel,
  renderFieldsPanel,
  renderAdvancedPanel,
  renderPreviewPanel,
};
