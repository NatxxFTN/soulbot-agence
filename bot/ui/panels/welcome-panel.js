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
const { getWelcomeConfig, getFields } = require('../../core/welcome-helper');

// ─── Panel Principal ──────────────────────────────────────────────────────────

function renderWelcomePanel(guildId) {
  const cfg    = getWelcomeConfig(guildId) || {};
  const fields = getFields(guildId);

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  // En-tête
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 👋 Configuration Welcomer'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('Personnalise le message de bienvenue affiché à chaque arrivée.'),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 1 : Statut + mode ──────────────────────────────────────────────
  const statusEmoji = cfg.enabled ? '🟢' : '🔴';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${statusEmoji} Statut : **${cfg.enabled ? 'Activé' : 'Désactivé'}**\nMode : **${cfg.mode || 'embed'}**`,
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
          { label: 'Texte seul',    value: 'text',  emoji: '💬', default: cfg.mode === 'text'  },
          { label: 'Embed seul',    value: 'embed', emoji: '🎨', default: !cfg.mode || cfg.mode === 'embed' },
          { label: 'Texte + Embed', value: 'both',  emoji: '📝', default: cfg.mode === 'both'  },
          { label: 'Image seule',   value: 'image', emoji: '🖼️', default: cfg.mode === 'image' },
        ]),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 2 : Salon ─────────────────────────────────────────────────────
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 📍 Salon & Rôle auto'));
  const channelText = cfg.channel_id ? `<#${cfg.channel_id}>` : '*Non défini*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Salon :** ${channelText}`),
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
        .setPlaceholder('Sélectionner le salon welcomer')
        .setChannelTypes([ChannelType.GuildText])
        .setMinValues(1).setMaxValues(1),
    ),
  );

  // ── Section 3 : Rôle auto ─────────────────────────────────────────────────
  const roleText = cfg.auto_role_id ? `<@&${cfg.auto_role_id}>` : '*Aucun*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Rôle auto :** ${roleText}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:role_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger),
      ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('welcome:role')
        .setPlaceholder('Sélectionner le rôle auto-assigné')
        .setMinValues(1).setMaxValues(1),
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 4 : Message texte ─────────────────────────────────────────────
  const textPreview = cfg.text_content
    ? '```\n' + cfg.text_content.slice(0, 150) + (cfg.text_content.length > 150 ? '...' : '') + '\n```'
    : '*Aucun message texte configuré.*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 💬 Message texte\n${textPreview}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:text_edit')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Primary),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 5 : Embed ─────────────────────────────────────────────────────
  const embedSummary = cfg.embed_title
    ? `Titre : **${cfg.embed_title.slice(0, 60)}**\nCouleur : \`${cfg.embed_color || '#F39C12'}\``
    : `*Non configuré* · Couleur : \`${cfg.embed_color || '#F39C12'}\``;
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🎨 Embed\n${embedSummary}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:embed_panel')
          .setLabel('Configurer →')
          .setStyle(ButtonStyle.Primary),
      ),
  );

  // ── Section 6 : Champs ────────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🏷️ Champs personnalisés\n**${fields.length}**/25 champ${fields.length > 1 ? 's' : ''} configuré${fields.length > 1 ? 's' : ''}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:fields_panel')
          .setLabel('Gérer →')
          .setStyle(ButtonStyle.Primary),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 7 : DM privé ─────────────────────────────────────────────────
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ✉️ DM privé\n${cfg.dm_enabled ? '🟢 Activé' : '🔴 Désactivé'}`,
        ),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:dm_toggle')
          .setLabel(cfg.dm_enabled ? 'Désactiver' : 'Activer')
          .setStyle(cfg.dm_enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  if (cfg.dm_enabled) {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('welcome:dm_edit')
          .setLabel('Modifier message DM')
          .setEmoji('✉️')
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  }
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 8 : Auto-delete ───────────────────────────────────────────────
  const deleteStatus = (cfg.auto_delete_seconds > 0)
    ? `Supprimer après **${cfg.auto_delete_seconds}s**`
    : '**Jamais** (0s)';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ⏱️ Auto-delete\n${deleteStatus}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:autodelete_edit')
          .setLabel('Modifier')
          .setStyle(ButtonStyle.Secondary),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // ── Section 9 : Test & Aperçu ─────────────────────────────────────────────
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🔬 Test & Aperçu'));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('welcome:preview')
        .setLabel('Aperçu')
        .setEmoji('👁️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('welcome:simulate')
        .setLabel('Simuler arrivée')
        .setEmoji('🧪')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('welcome:vars')
        .setLabel('Variables')
        .setEmoji('📚')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Sous-panel Embed détaillé ────────────────────────────────────────────────

function renderEmbedPanel(guildId) {
  const cfg = getWelcomeConfig(guildId) || {};
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎨 Configuration de l\'Embed'));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('Personnalise chaque champ de l\'embed de bienvenue.'),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // Titre
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Titre**\n${cfg.embed_title ? `\`${cfg.embed_title.slice(0, 80)}\`` : '*Non défini*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_title_edit').setLabel('Modifier').setStyle(ButtonStyle.Primary)),
  );

  // Description
  const descPreview = cfg.embed_description
    ? cfg.embed_description.slice(0, 100) + (cfg.embed_description.length > 100 ? '...' : '')
    : '*Non définie*';
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Description**\n${descPreview}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_desc_edit').setLabel('Modifier').setStyle(ButtonStyle.Primary)),
  );

  // Couleur
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Couleur**\n\`${cfg.embed_color || '#F39C12'}\``),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_color_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );

  // URL (clic titre)
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**URL clic titre**\n${cfg.embed_url ? `\`${cfg.embed_url.slice(0, 60)}\`` : '*Aucune*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_url_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Thumbnail
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Thumbnail**\n${cfg.embed_thumbnail_url || '*Aucune*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_thumb_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );

  // Image principale
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Image principale**\n${cfg.embed_image_url ? `\`${cfg.embed_image_url.slice(0, 60)}\`` : '*Aucune*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_image_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Author name
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Author nom**\n${cfg.embed_author_name ? `\`${cfg.embed_author_name.slice(0, 60)}\`` : '*Non défini*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_author_name_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );

  // Author icon
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Author icône**\n${cfg.embed_author_icon || '*Aucune*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_author_icon_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );

  // Author URL
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Author URL**\n${cfg.embed_author_url || '*Aucune*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_author_url_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Footer text
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Footer texte**\n${cfg.embed_footer_text ? `\`${cfg.embed_footer_text.slice(0, 60)}\`` : '*Non défini*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_footer_text_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );

  // Footer icon
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Footer icône**\n${cfg.embed_footer_icon || '*Aucune*'}`),
      )
      .setButtonAccessory(new ButtonBuilder().setCustomId('welcome:embed_footer_icon_edit').setLabel('Modifier').setStyle(ButtonStyle.Secondary)),
  );

  // Timestamp toggle
  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Timestamp**\n${cfg.embed_timestamp ? '🟢 Affiché' : '🔴 Masqué'}`),
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setCustomId('welcome:embed_timestamp')
          .setLabel(cfg.embed_timestamp ? 'Désactiver' : 'Activer')
          .setStyle(cfg.embed_timestamp ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

  // Retour
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('welcome:back_main')
        .setLabel('← Retour')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ─── Sous-panel Champs personnalisés ─────────────────────────────────────────

function renderFieldsPanel(guildId) {
  const fields    = getFields(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# 🏷️ Champs personnalisés\n**${fields.length}**/25 champs configurés`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (fields.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Aucun champ. Clique sur "+ Ajouter" pour commencer.*'),
    );
  } else {
    for (const f of fields) {
      const inlineTag = f.inline ? ' *(inline)*' : '';
      const valPreview = f.value.length > 60 ? f.value.slice(0, 60) + '...' : f.value;
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${f.name}**${inlineTag}\n↳ ${valPreview}`,
            ),
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
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Ajouter + Retour
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
    new ButtonBuilder()
      .setCustomId('welcome:back_main')
      .setLabel('← Retour')
      .setStyle(ButtonStyle.Secondary),
  );
  container.addActionRowComponents(row);

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderWelcomePanel, renderEmbedPanel, renderFieldsPanel };
