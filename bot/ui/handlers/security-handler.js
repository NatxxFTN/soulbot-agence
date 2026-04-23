'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/security-storage');
const { renderSecurityPanel, FEATURES_META } = require('../panels/security-panel');

function ensureManageGuild(interaction) {
  if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    interaction.reply({
      content: `${e('btn_error')} Permission requise : **Gérer le serveur**.`,
      flags  : MessageFlags.Ephemeral,
    }).catch(() => {});
    return false;
  }
  return true;
}

async function refreshMain(interaction) {
  const panel = renderSecurityPanel(interaction.guild);
  await interaction.update({ components: [panel], flags: MessageFlags.IsComponentsV2 });
}

// ─── Entrée : dispatcher Button/Select vers le bon sous-handler ───────────────

async function handleSecurityInteraction(interaction, params) {
  const action = params[0];
  if (!ensureManageGuild(interaction)) return;

  try {
    // Select menus
    if (interaction.isStringSelectMenu?.()) {
      if (action === 'toggle') {
        storage.toggleFeature(interaction.guild.id, interaction.values[0]);
        return refreshMain(interaction);
      }
      if (action === 'config') {
        return showFeatureConfig(interaction, interaction.values[0]);
      }
      if (action === 'set_action') {
        const feature   = params[1];
        const newAction = interaction.values[0];
        storage.setConfig(interaction.guild.id, feature, { action: newAction });
        return refreshMain(interaction);
      }
    }

    // Buttons
    if (action === 'back_panel')   return refreshMain(interaction);
    if (action === 'whitelist')    return showWhitelist(interaction);
    if (action === 'logs')         return showLogs(interaction);
    if (action === 'stats')        return showStats(interaction);
    if (action === 'enable_all') {
      for (const m of FEATURES_META) {
        storage.setConfig(interaction.guild.id, m.key, { enabled: 1 });
      }
      return refreshMain(interaction);
    }
    if (action === 'disable_all') {
      for (const m of FEATURES_META) {
        storage.setConfig(interaction.guild.id, m.key, { enabled: 0 });
      }
      return refreshMain(interaction);
    }
  } catch (err) {
    console.error('[security-handler]', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `${e('btn_error')} Erreur : ${err.message}`,
        flags  : MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

// ─── Sous-panels ─────────────────────────────────────────────────────────────

async function showFeatureConfig(interaction, feature) {
  const cfg = storage.getConfig(interaction.guild.id, feature) || { enabled: 0, action: 'delete', threshold: 1 };

  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('cat_configuration')} **Config \`${feature}\`**`),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**État** : ${cfg.enabled ? '🟢 Actif' : '🔴 Inactif'}\n` +
      `**Action** : \`${cfg.action}\`\n` +
      `**Seuil** : ${cfg.threshold}`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`security:set_action:${feature}`)
        .setPlaceholder("⚙️ Choisir l'action automatique")
        .addOptions([
          { label: 'Supprimer seulement', value: 'delete',  emoji: '🗑️' },
          { label: 'Avertir (warn)',       value: 'warn',    emoji: '⚠️' },
          { label: 'Muet 5 minutes',       value: 'mute_5m', emoji: '🔇' },
          { label: 'Muet 1 heure',         value: 'mute_1h', emoji: '🔇' },
          { label: 'Expulser (kick)',      value: 'kick',    emoji: '👢' },
          { label: 'Bannir',               value: 'ban',     emoji: '🔨' },
        ]),
    ),
  );
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:back_panel').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
    ),
  );

  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function showWhitelist(interaction) {
  const wl = storage.listWhitelist(interaction.guild.id).slice(0, 20);
  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ui_lock')} **Whitelist sécurité**`));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (wl.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('btn_tip')} Aucune entrée.\n` +
      `Utilise \`;whitelist add <user|role|channel> @cible [feature]\`.`,
    ));
  } else {
    const lines = wl.map(w => {
      const mention = w.entity_type === 'user'    ? `<@${w.entity_id}>`
                    : w.entity_type === 'role'    ? `<@&${w.entity_id}>`
                    : `<#${w.entity_id}>`;
      const scope = w.feature ? `(pour \`${w.feature}\`)` : '(global)';
      return `• ${mention} ${scope}`;
    });
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:back_panel').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
    ),
  );
  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function showLogs(interaction) {
  const logs = storage.getRecentLogs(interaction.guild.id, 15);
  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('ui_pin')} **Logs sécurité récents**`));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (logs.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Aucune action enregistrée pour le moment.*`));
  } else {
    const lines = logs.map(l =>
      `• <t:${Math.floor(l.triggered_at / 1000)}:R> · <@${l.user_id}> · **${l.feature}** → \`${l.action_taken}\``,
    );
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:back_panel').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
    ),
  );
  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

async function showStats(interaction) {
  const stats = storage.getStats(interaction.guild.id);
  const container = new ContainerBuilder().setAccentColor(0xFF0000);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cat_information')} **Statistiques sécurité**`));
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (stats.length === 0) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Aucune statistique pour le moment.*`));
  } else {
    const sorted = stats.sort((a, b) => b.trigger_count - a.trigger_count).slice(0, 12);
    const medals = ['🥇', '🥈', '🥉'];
    const lines  = sorted.map((s, i) => {
      const prefix = i < 3 ? medals[i] : `**${i + 1}.**`;
      return `${prefix} **${s.feature}** — ${s.trigger_count} déclenchement(s)`;
    });
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
  }

  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('security:back_panel').setLabel('← Retour').setStyle(ButtonStyle.Secondary),
    ),
  );
  await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = { handleSecurityInteraction };
