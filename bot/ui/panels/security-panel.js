'use strict';

const {
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { e, forButton } = require('../../core/emojis');
const storage = require('../../core/security-storage');

const FEATURES_META = [
  { key: 'antilink',       label: 'Anti-Link',       emoji: 'ui_antileak',    tier: 1, desc: 'Bloque les liens HTTP/HTTPS' },
  { key: 'antiinvite',     label: 'Anti-Invite',     emoji: 'ui_lock',        tier: 1, desc: 'Bloque les invitations Discord' },
  { key: 'antieveryone',   label: 'Anti-@everyone',  emoji: 'ui_members',     tier: 1, desc: 'Bloque @everyone / @here' },
  { key: 'antimention',    label: 'Anti-Mention',    emoji: 'ui_user',        tier: 1, desc: 'Anti-spam de mentions' },
  { key: 'antibot',        label: 'Anti-Bot',        emoji: 'cat_protection', tier: 1, desc: "Bloque l'ajout de bots" },
  { key: 'antiduplicate',  label: 'Anti-Duplicate',  emoji: 'ui_chat',        tier: 1, desc: 'Anti-flood messages identiques' },
  { key: 'antiwords',      label: 'Filtre de mots',  emoji: 'btn_edit',       tier: 2, desc: 'Mots interdits custom' },
  { key: 'anticaps',       label: 'Anti-Caps',       emoji: 'btn_edit',       tier: 2, desc: 'Anti-majuscules excessives' },
  { key: 'antiemojispam',  label: 'Anti-Emoji',      emoji: 'ui_smiley',      tier: 2, desc: 'Anti-spam emojis' },
  { key: 'antinsfw',       label: 'Anti-NSFW',       emoji: 'btn_error',      tier: 2, desc: 'Détection NSFW basique' },
  { key: 'antinewaccount', label: 'Anti-Newaccount', emoji: 'ui_pin',         tier: 2, desc: 'Refuse comptes récents' },
  { key: 'antiraid',       label: 'Anti-Raid',       emoji: 'cat_protection', tier: 2, desc: 'Détection raid avancée' },
];

function renderSecurityPanel(guild) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  // ── Header ──────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('ani_diamond')} **Panel Sécurité Soulbot** ${e('ani_diamond')}`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── État global ─────────────────────────────────────────────────────────
  const allFeatures = storage.getAllFeatures(guild.id);
  const featuresMap = new Map(allFeatures.map(f => [f.feature, f]));
  const activeCount = allFeatures.filter(f => f.enabled).length;
  const totalCount  = FEATURES_META.length;

  const whitelistCount = storage.countWhitelist(guild.id);
  const stats = storage.getStats(guild.id);
  const totalTriggers = stats.reduce((s, r) => s + (r.trigger_count || 0), 0);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('cat_information')} **État** : ${activeCount}/${totalCount} protections actives\n` +
      `${e('ui_lock')} **Whitelist** : ${whitelistCount.users} users · ${whitelistCount.roles} rôles · ${whitelistCount.channels} salons\n` +
      `${e('btn_tip')} **Total actions** : ${totalTriggers} déclenchement(s)`,
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // ── Liste par tier ─────────────────────────────────────────────────────
  for (const tier of [1, 2]) {
    const tierFeatures = FEATURES_META.filter(f => f.tier === tier);
    const tierLabel = tier === 1 ? '🔴 Essentielles (Tier 1)' : '🟡 Avancées (Tier 2)';

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${tierLabel}**`),
    );

    const lines = tierFeatures.map(meta => {
      const cfg = featuresMap.get(meta.key);
      const statusIcon = cfg?.enabled ? '🟢' : '🔴';
      const actionPart = cfg?.enabled ? ` · action \`${cfg.action}\`` : '';
      return `${statusIcon} ${e(meta.emoji)} **${meta.label}** — ${meta.desc}${actionPart}`;
    });
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // ── Select : toggle ─────────────────────────────────────────────────────
  const toggleOpts = FEATURES_META.slice(0, 25).map(meta => {
    const cfg = featuresMap.get(meta.key);
    return {
      label      : `${cfg?.enabled ? '🟢' : '🔴'} ${meta.label}`,
      description: meta.desc.slice(0, 100),
      value      : meta.key,
    };
  });
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security:toggle')
        .setPlaceholder('⚡ Activer / Désactiver une protection')
        .addOptions(toggleOpts),
    ),
  );

  // ── Select : config ─────────────────────────────────────────────────────
  const configOpts = FEATURES_META.slice(0, 25).map(meta => ({
    label      : meta.label,
    description: `Config ${meta.label}`,
    value      : meta.key,
  }));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security:config')
        .setPlaceholder('⚙️ Configurer une protection (action, seuil…)')
        .addOptions(configOpts),
    ),
  );

  // ── Actions globales ────────────────────────────────────────────────────
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:whitelist').setLabel('Whitelist').setEmoji(forButton('ui_unlock')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('security:logs').setLabel('Logs').setEmoji(forButton('ui_pin')).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('security:stats').setLabel('Stats').setEmoji(forButton('cat_information')).setStyle(ButtonStyle.Primary),
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:enable_all').setLabel('Activer tout').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('security:disable_all').setLabel('Désactiver tout').setStyle(ButtonStyle.Danger),
    ),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('btn_tip')} *Les 12 détecteurs seront câblés par les prompts 2/3 du Pack Forteresse. Le panel + routing sont déjà fonctionnels.*`,
    ),
  );

  return container;
}

module.exports = { renderSecurityPanel, FEATURES_META };
