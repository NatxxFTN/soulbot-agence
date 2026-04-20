'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { COLORS } = require('../theme');
const { getNukeConfig, getRecentNukes } = require('../../core/nuke-helper');

const MODES = {
  classique : { label: 'Classique', emoji: '🔴', desc: 'Suppression complète avec double confirmation · Cooldown **1h**' },
  rapide    : { label: 'Rapide',    emoji: '🟠', desc: 'Une seule confirmation · Cooldown **30 min**' },
  urgence   : { label: 'Urgence',   emoji: '⚡', desc: 'Exécution immédiate, cibles verrouillées · Cooldown **5 min**' },
};

/**
 * Panel Nuke Premium — Components V2.
 * 23 inner components.
 */
function renderNukePanel(guildId) {
  const cfg = getNukeConfig(guildId) || {};
  const ch  = cfg.targets_channels !== 0;
  const rl  = cfg.targets_roles    !== 0;
  const em  = cfg.targets_emojis   !== 0;

  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 💣 Nuke Premium'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '> ⚠️ **Action irréversible.** Un backup automatique est créé avant chaque exécution.',
    ),
  );
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Cibles ────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Cibles :** Salons ${ch ? '✓' : '✗'} · Rôles ${rl ? '✓' : '✗'} · Emojis ${em ? '✓' : '✗'}`,
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nuke:toggle_channels')
        .setLabel(`Salons ${ch ? 'ON' : 'OFF'}`)
        .setStyle(ch ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('nuke:toggle_roles')
        .setLabel(`Rôles ${rl ? 'ON' : 'OFF'}`)
        .setStyle(rl ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('nuke:toggle_emojis')
        .setLabel(`Emojis ${em ? 'ON' : 'OFF'}`)
        .setStyle(em ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
  );

  // ── Modes ─────────────────────────────────────────────────────────────────
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('**Mode d\'exécution :**'),
  );
  for (const [key, m] of Object.entries(MODES)) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${m.emoji} **${m.label}** — ${m.desc}`),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`nuke:confirm_${key}`)
            .setLabel(`Lancer`)
            .setStyle(ButtonStyle.Danger),
        ),
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nuke:history')
        .setLabel('Historique')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

/**
 * Panel historique des 5 derniers nukes.
 */
function renderNukeHistoryPanel(guildId) {
  const logs      = getRecentNukes(guildId);
  const container = new ContainerBuilder().setAccentColor(COLORS.accent);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 📋 Historique Nuke'),
  );

  if (logs.length === 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('*Aucun nuke enregistré sur ce serveur.*'),
    );
  } else {
    const lines = logs.map(l => {
      const date   = new Date(l.timestamp * 1000).toLocaleString('fr-FR');
      const status = l.success ? '✓' : '✗';
      return `${status} \`${date}\` — <@${l.user_id}> — Salons: ${l.channels_deleted} · Rôles: ${l.roles_deleted} · Emojis: ${l.emojis_deleted}`;
    }).join('\n');
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines),
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nuke:back_main')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = { renderNukePanel, renderNukeHistoryPanel };
