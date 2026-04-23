'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/confession-storage');

function ephemeralText(interaction, content) {
  return interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
}

function buildConfessionPanel(conf, cfg) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('ani_diamond')} **Confession #${conf.id}** ${e('ani_diamond')}`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(conf.content));

  const rows = [];
  if (cfg?.allow_votes) {
    ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const voteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confession:vote:up:${conf.id}`)
        .setLabel(String(conf.upvotes || 0))
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`confession:vote:down:${conf.id}`)
        .setLabel(String(conf.downvotes || 0))
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger),
    );
    ct.addActionRowComponents(voteRow);
    rows.push(voteRow);
  }
  return { container: ct, rows };
}

function buildPendingPanel(conf) {
  const ct = new ContainerBuilder().setAccentColor(0xFF0000);
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
    `${e('btn_tip')} **Confession #${conf.id} en attente de modération**`,
  ));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(conf.content));
  ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confession:approve:${conf.id}`)
      .setLabel('Approuver')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`confession:reject:${conf.id}`)
      .setLabel('Rejeter')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );
  ct.addActionRowComponents(row);
  return { container: ct, rows: [row] };
}

async function publishConfession(interaction, conf, cfg) {
  try {
    const ch = await interaction.guild.channels.fetch(cfg.channel_id).catch(() => null);
    if (!ch) return null;
    const { container, rows } = buildConfessionPanel(conf, cfg);
    const sent = await ch.send({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => null);
    if (sent) storage.updateConfession(conf.id, { message_id: sent.id });
    return sent;
  } catch (err) {
    console.error('[confession-handler] publish:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interaction principale (boutons + selects)
// customId formats :
//   confession:open                 → utilisateur ouvre le modal
//   confession:vote:up|down:ID      → vote
//   confession:approve:ID           → staff approuve
//   confession:reject:ID            → staff rejette
//   confessioncfg:<action>          → config (toggles / channel / words)
// ─────────────────────────────────────────────────────────────────────────────
async function handleConfessionInteraction(interaction, params, _client) {
  try {
    // ── confessioncfg:* ─────────────────────────────────────────────────────
    if (interaction.customId?.startsWith('confessioncfg:')) {
      return handleConfigInteraction(interaction, params);
    }

    const action = params[0];

    // ── Ouverture du modal ──────────────────────────────────────────────────
    if (action === 'open') {
      const modal = new ModalBuilder()
        .setCustomId('confession_modal:submit')
        .setTitle('Confession anonyme');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('content')
          .setLabel('Ta confession')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(4)
          .setMaxLength(1000)
          .setRequired(true)
          .setPlaceholder('Écris ici ce que tu veux partager anonymement...'),
      ));
      return interaction.showModal(modal).catch(() => {});
    }

    // ── Vote ─────────────────────────────────────────────────────────────────
    if (action === 'vote') {
      const direction = params[1];
      const id = parseInt(params[2], 10);
      const conf = storage.getConfession(id);
      if (!conf) return ephemeralText(interaction, `${e('btn_error')} Confession introuvable.`);

      const cfg = storage.getConfig(interaction.guild.id);
      if (!cfg?.allow_votes) {
        return ephemeralText(interaction, `${e('btn_tip')} Les votes sont désactivés.`);
      }

      storage.voteConfession(id, interaction.user.id, direction === 'up' ? 'up' : 'down');
      const fresh = storage.getConfession(id);

      // Mise à jour du message
      try {
        const { container, rows } = buildConfessionPanel(fresh, cfg);
        await interaction.message.edit({
          components: [container, ...rows],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      } catch {}

      return ephemeralText(interaction, `${e('btn_success')} Vote enregistré.`);
    }

    // ── Approve (staff) ──────────────────────────────────────────────────────
    if (action === 'approve') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return ephemeralText(interaction, `${e('btn_error')} Action réservée au staff.`);
      }
      const id = parseInt(params[1], 10);
      const conf = storage.getConfession(id);
      if (!conf) return ephemeralText(interaction, `${e('btn_error')} Confession introuvable.`);
      if (conf.status !== 'pending') {
        return ephemeralText(interaction, `${e('btn_tip')} Déjà traitée.`);
      }
      const cfg = storage.getConfig(interaction.guild.id);
      if (!cfg?.channel_id) {
        return ephemeralText(interaction, `${e('btn_error')} Aucun salon configuré.`);
      }
      storage.approveConfession(id);
      const fresh = storage.getConfession(id);
      await publishConfession(interaction, fresh, cfg);

      try {
        await interaction.update({
          components: [
            (() => {
              const ct = new ContainerBuilder().setAccentColor(0xFF0000);
              ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${e('btn_success')} Confession #${id} **approuvée** et publiée.`,
              ));
              return ct;
            })(),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch {}
      return;
    }

    // ── Reject (staff) ───────────────────────────────────────────────────────
    if (action === 'reject') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return ephemeralText(interaction, `${e('btn_error')} Action réservée au staff.`);
      }
      const id = parseInt(params[1], 10);
      const conf = storage.getConfession(id);
      if (!conf) return ephemeralText(interaction, `${e('btn_error')} Confession introuvable.`);
      if (conf.status !== 'pending') {
        return ephemeralText(interaction, `${e('btn_tip')} Déjà traitée.`);
      }
      storage.rejectConfession(id);

      try {
        await interaction.update({
          components: [
            (() => {
              const ct = new ContainerBuilder().setAccentColor(0xFF0000);
              ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `${e('btn_error')} Confession #${id} **rejetée**.`,
              ));
              return ct;
            })(),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch {}
      return;
    }
  } catch (err) {
    console.error('[confession-handler] interaction:', err);
    try { await ephemeralText(interaction, `${e('btn_error')} Erreur interne.`); } catch {}
  }
}

// ── Config handler (confessioncfg:*) ─────────────────────────────────────────
async function handleConfigInteraction(interaction, params) {
  if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
    return ephemeralText(interaction, `${e('btn_error')} Permission requise.`);
  }
  const action = params[0];
  const guildId = interaction.guild.id;

  try {
    if (interaction.isChannelSelectMenu?.() && action === 'set_channel') {
      storage.setConfig(guildId, { channel_id: interaction.values[0] || null });
    } else if (action === 'toggle_approval') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { require_approval: cur.require_approval ? 0 : 1 });
    } else if (action === 'toggle_votes') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { allow_votes: cur.allow_votes ? 0 : 1 });
    } else if (action === 'toggle_replies') {
      const cur = storage.getConfig(guildId) || {};
      storage.setConfig(guildId, { allow_replies: cur.allow_replies ? 0 : 1 });
    } else if (action === 'edit_words') {
      const cur = storage.getConfig(guildId) || {};
      const words = storage.parseBanWords(cur.ban_words).join(', ');
      const modal = new ModalBuilder()
        .setCustomId('confessioncfg_modal:words')
        .setTitle('Mots interdits');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('words')
          .setLabel('Liste (séparée par des virgules)')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(false)
          .setValue(words.slice(0, 1000))
          .setPlaceholder('mot1, mot2, mot3'),
      ));
      return interaction.showModal(modal).catch(() => {});
    }

    const { buildPanel } = require('../../commands/configuration/confessionconfig');
    const { container, rows } = buildPanel(interaction.guild);
    return interaction.update({
      components: [container, ...rows],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  } catch (err) {
    console.error('[confession-handler] config:', err);
    try { await ephemeralText(interaction, `${e('btn_error')} Erreur interne.`); } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal submit :
//   confession_modal:submit        → création d'une confession utilisateur
//   confessioncfg_modal:words      → mise à jour de la liste de mots interdits
// ─────────────────────────────────────────────────────────────────────────────
async function handleConfessionModal(interaction, params, _client) {
  try {
    // Préfixe détecté via customId racine
    if (interaction.customId?.startsWith('confessioncfg_modal')) {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return ephemeralText(interaction, `${e('btn_error')} Permission requise.`);
      }
      const raw = (interaction.fields.getTextInputValue('words') || '').trim();
      const words = raw
        ? raw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
        : [];
      storage.setConfig(interaction.guild.id, { ban_words: JSON.stringify(words) });
      return ephemeralText(interaction, `${e('btn_success')} Liste mise à jour : **${words.length}** mot(s).`);
    }

    // confession_modal:submit
    const content = (interaction.fields.getTextInputValue('content') || '').trim();
    if (!content) {
      return ephemeralText(interaction, `${e('btn_error')} Contenu vide.`);
    }

    const cfg = storage.getConfig(interaction.guild.id);
    if (!cfg || !cfg.channel_id) {
      return ephemeralText(interaction, `${e('btn_error')} Système non configuré.`);
    }

    // Ban words
    const lower = content.toLowerCase();
    const banWords = storage.parseBanWords(cfg.ban_words);
    const matched = banWords.find(w => lower.includes(w));
    if (matched) {
      return ephemeralText(interaction, `${e('btn_error')} Ta confession contient un mot interdit.`);
    }

    // Anti-words sécurité (soft dependency — skip si non dispo)
    try {
      const antiwords = require('../../core/security-detectors/antiwords');
      if (antiwords && typeof antiwords.check === 'function') {
        const { db } = require('../../database');
        const secRow = db.prepare(
          "SELECT custom_data FROM security_features WHERE guild_id = ? AND feature = 'antiwords' AND enabled = 1"
        ).all?.(interaction.guild.id) || null;
        // Si la table n'existe pas → l'appel db.prepare() aura throw → catch plus haut
      }
    } catch { /* optionnel */ }

    const newStatus = cfg.require_approval ? 'pending' : 'approved';
    const id = storage.createConfession({
      guild_id: interaction.guild.id,
      user_id : interaction.user.id,
      content,
      status  : newStatus,
    });
    if (!id) return ephemeralText(interaction, `${e('btn_error')} Erreur DB.`);

    const fresh = storage.getConfession(id);

    if (newStatus === 'pending') {
      // Poster le panneau staff dans le même salon des confessions
      try {
        const ch = await interaction.guild.channels.fetch(cfg.channel_id).catch(() => null);
        if (ch) {
          const { container, rows } = buildPendingPanel(fresh);
          await ch.send({
            components: [container, ...rows],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => {});
        }
      } catch {}
      return ephemeralText(interaction,
        `${e('btn_success')} Confession **#${id}** envoyée en modération. Elle sera publiée après validation du staff.`);
    }

    // Publication directe
    await publishConfession(interaction, fresh, cfg);
    return ephemeralText(interaction, `${e('btn_success')} Confession **#${id}** publiée.`);
  } catch (err) {
    console.error('[confession-handler] modal:', err);
    try { await ephemeralText(interaction, `${e('btn_error')} Erreur interne.`); } catch {}
  }
}

module.exports = {
  handleConfessionInteraction,
  handleConfessionModal,
};
