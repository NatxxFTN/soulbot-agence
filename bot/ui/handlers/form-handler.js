'use strict';

const {
  PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder,
} = require('discord.js');
const { e } = require('../../core/emojis');
const storage = require('../../core/form-storage');

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function buildStyle(name) {
  const map = {
    Primary: ButtonStyle.Primary,
    Success: ButtonStyle.Success,
    Danger : ButtonStyle.Danger,
    Secondary: ButtonStyle.Secondary,
  };
  return map[name] || ButtonStyle.Primary;
}

async function handleFormInteraction(interaction, params, _client) {
  try {
    const action = params[0];

    // ── Ouverture modal de création ─────────────────────────────────────────
    if (action === 'open_create') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: `${e('btn_error')} Permission **Gérer le serveur** requise.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const modal = new ModalBuilder()
        .setCustomId('form_modal:create')
        .setTitle('Création d\'un formulaire');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Titre du formulaire')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(80)
            .setRequired(true)
            .setPlaceholder('Candidature staff'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description (optionnel)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(500)
            .setRequired(false)
            .setPlaceholder('Décris brièvement l\'objet du formulaire.'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q1')
            .setLabel('Question 1')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(200)
            .setRequired(true)
            .setPlaceholder('Ton pseudo + âge ?'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q2')
            .setLabel('Question 2 (optionnel)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(200)
            .setRequired(false),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('q3')
            .setLabel('Question 3 (optionnel)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(200)
            .setRequired(false),
        ),
      );

      return interaction.showModal(modal).catch(() => {});
    }

    // ── Bouton public : remplir formulaire ─────────────────────────────────
    if (action === 'fill') {
      const formId = parseInt(params[1], 10);
      const form = storage.getForm(formId);
      if (!form) {
        return interaction.reply({
          content: `${e('btn_error')} Formulaire introuvable.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      if (form.closed) {
        return interaction.reply({
          content: `${e('ui_lock')} Ce formulaire est fermé.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      if (form.one_per_user && storage.hasUserSubmitted(formId, interaction.user.id)) {
        return interaction.reply({
          content: `${e('btn_tip')} Tu as déjà rempli ce formulaire.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const modal = new ModalBuilder()
        .setCustomId(`form_modal:submit:${formId}`)
        .setTitle(truncate(form.title || 'Formulaire', 45));

      const questions = (form.questions || []).slice(0, 5);
      if (questions.length === 0) {
        return interaction.reply({
          content: `${e('btn_error')} Aucune question configurée.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`answer_${i}`)
            .setLabel(truncate(q.label || q.text || `Question ${i + 1}`, 45))
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(q.required !== false),
        ));
      }

      return interaction.showModal(modal).catch(() => {});
    }

    // ── Confirmation suppression ───────────────────────────────────────────
    if (action === 'confirm_delete') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: `${e('btn_error')} Permission requise.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      const formId = parseInt(params[1], 10);
      const form = storage.getForm(formId);
      if (!form || form.guild_id !== interaction.guild.id) {
        return interaction.update({
          content: `${e('btn_error')} Formulaire introuvable.`,
          components: [],
        }).catch(() => {});
      }

      // Tenter de supprimer le message Discord associé
      if (form.message_channel_id && form.message_id) {
        try {
          const ch = await interaction.guild.channels.fetch(form.message_channel_id).catch(() => null);
          const msg = ch && await ch.messages.fetch(form.message_id).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        } catch {}
      }

      const ok = storage.deleteForm(formId);
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        ok
          ? `${e('btn_success')} Formulaire **#${formId}** supprimé.`
          : `${e('btn_error')} Échec de la suppression.`,
      ));
      return interaction.update({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }

    if (action === 'cancel_delete') {
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Suppression annulée.`,
      ));
      return interaction.update({
        components: [ct],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[form-handler] interaction:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

async function handleFormModal(interaction, params, _client) {
  try {
    const action = params[0];

    // ── Création inline d'un formulaire ────────────────────────────────────
    if (action === 'create') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: `${e('btn_error')} Permission requise.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const title = interaction.fields.getTextInputValue('title').trim();
      const description = (interaction.fields.getTextInputValue('description') || '').trim();
      const q1 = interaction.fields.getTextInputValue('q1').trim();
      const q2 = (interaction.fields.getTextInputValue('q2') || '').trim();
      const q3 = (interaction.fields.getTextInputValue('q3') || '').trim();

      const questions = [];
      if (q1) questions.push({ label: q1, required: true });
      if (q2) questions.push({ label: q2, required: false });
      if (q3) questions.push({ label: q3, required: false });

      if (questions.length === 0) {
        return interaction.reply({
          content: `${e('btn_error')} Au moins une question est requise.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const name = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)) || 'form';
      const formId = storage.createForm({
        guild_id: interaction.guild.id,
        name,
        title,
        description: description || null,
        questions,
        log_channel_id: interaction.channel.id,
        message_channel_id: interaction.channel.id,
        created_by: interaction.user.id,
      });

      if (!formId) {
        return interaction.reply({
          content: `${e('btn_error')} Erreur lors de la création.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      // Poster le message avec bouton "Remplir"
      const ct = new ContainerBuilder().setAccentColor(0xFF0000);
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('ui_pin')} **${title}**`,
      ));
      ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      if (description) {
        ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
        ct.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      }
      ct.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('btn_tip')} Clique sur le bouton ci-dessous pour répondre.`,
      ));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`form:fill:${formId}`)
          .setLabel('Remplir le formulaire')
          .setStyle(ButtonStyle.Primary),
      );
      ct.addActionRowComponents(row);

      const posted = await interaction.channel.send({
        components: [ct, row],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => null);

      if (posted) {
        storage.updateForm(formId, { message_id: posted.id, message_channel_id: posted.channelId });
      }

      return interaction.reply({
        content: `${e('btn_success')} Formulaire **#${formId}** créé. Le bouton a été posté ici.`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }

    // ── Soumission d'une réponse ────────────────────────────────────────────
    if (action === 'submit') {
      const formId = parseInt(params[1], 10);
      const form = storage.getForm(formId);
      if (!form) {
        return interaction.reply({
          content: `${e('btn_error')} Formulaire introuvable.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
      if (form.closed) {
        return interaction.reply({
          content: `${e('ui_lock')} Ce formulaire est fermé.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }

      const answers = {};
      const questions = form.questions || [];
      for (let i = 0; i < questions.length; i++) {
        try {
          answers[questions[i].label || `Q${i + 1}`] = interaction.fields.getTextInputValue(`answer_${i}`) || '';
        } catch {
          answers[questions[i].label || `Q${i + 1}`] = '';
        }
      }

      const subId = storage.recordSubmission(formId, interaction.user.id, answers);

      // Log embed dans log_channel
      if (form.log_channel_id) {
        try {
          const logCh = await interaction.guild.channels.fetch(form.log_channel_id).catch(() => null);
          if (logCh) {
            const embed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle(`${form.title || form.name} · Réponse #${subId}`)
              .setTimestamp();

            if (!form.anonymous) {
              embed.setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL(),
              });
              embed.setFooter({ text: `ID : ${interaction.user.id}` });
            } else {
              embed.setAuthor({ name: 'Réponse anonyme' });
            }

            for (const q of questions) {
              const label = q.label || 'Question';
              const val = answers[label] || '*(vide)*';
              embed.addFields({
                name: truncate(label, 256),
                value: truncate(val, 1024),
                inline: false,
              });
            }
            await logCh.send({ embeds: [embed] }).catch(() => {});
          }
        } catch (err) {
          console.error('[form-handler] log:', err);
        }
      }

      return interaction.reply({
        content: `${e('btn_success')} Ta réponse a bien été enregistrée. Merci !`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[form-handler] modal:', err);
    try {
      await interaction.reply({
        content: `${e('btn_error')} Erreur interne.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
  }
}

module.exports = {
  handleFormInteraction,
  handleFormModal,
};
