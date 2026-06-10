'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * /generate — ServerForge
 * ═══════════════════════════════════════════════════════════════════════════════
 * Génère un serveur complet à partir du template.
 *
 * Deux modes :
 *   1. Dans un serveur où le bot EST présent → modifie le serveur existant
 *   2. En DM / serveur sans le bot → CRÉE un nouveau serveur de zéro
 *
 * Options :
 *   name (string, optionnel) — surcharge le nom du serveur
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const path = require('path');
const fs = require('fs');
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  PermissionsBitField, MessageFlags, EmbedBuilder,
} = require('discord.js');
const { THEME } = require('../../config/theme');
const { validateTemplate } = require('../../core/serverforge/templateValidator');
const { generateServer } = require('../../core/serverforge/generator');
const logger = require('../../utils/logger');

const TEMPLATES_DIR = path.join(__dirname, '../../templates');
const DEFAULT_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'default.template.json');

module.exports = {
  name: 'generate',
  description: 'Génère un serveur complet à partir du template ServerForge',
  options: [
    {
      name: 'name',
      description: 'Nom du serveur (optionnel)',
      type: 3,
      required: false,
    },
    {
      name: 'reset',
      description: '⚠️ Supprime tout avant de générer (mode serveur uniquement)',
      type: 5,
      required: false,
    },
  ],

  /**
   * Exécution de la commande /generate.
   * @param {import('discord.js').CommandInteraction} interaction
   * @param {string[]} args
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, args, client) {
    // NOTE : Pas de deferReply ici !
    // Chaque handler gère sa propre réponse :
    //   - handleInGuild    → deferReply() (besoin de boutons)
    //   - handleNewServer  → showModal()  (besoin d'une réponse initiale)

    // ── Charge et valide le template ──────────────────────────────────────────
    const template = await loadTemplate(interaction);
    if (!template) return;

    const options = {
      name: interaction.options.getString('name') || undefined,
    };

    // ── MODE 1 : Bot présent dans le serveur → modification directe ──────────
    if (interaction.inGuild() && interaction.guild) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return handleInGuild(interaction, client, template, options);
    }

    // ── MODE 2 : Bot PAS dans le serveur / DM → créer un nouveau serveur ────
    return handleNewServer(interaction, client, template, options);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 1 : Génération dans un serveur existant
// ═══════════════════════════════════════════════════════════════════════════════

async function handleInGuild(interaction, client, template, options) {
  const member = interaction.member;
  const botMember = interaction.guild.members.me;

  // Vérifie que l'utilisateur est Admin
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.editReply({
      embeds: [
        require('../../utils/embeds').error(
          'Permission refusée',
          'Tu dois être **Administrateur** du serveur pour utiliser cette commande.'
        ),
      ],
    });
  }

  // Vérifie les permissions du bot
  const neededBotPerms = [
    { flag: PermissionsBitField.Flags.ManageGuild, name: 'Gérer le serveur' },
    { flag: PermissionsBitField.Flags.ManageChannels, name: 'Gérer les salons' },
    { flag: PermissionsBitField.Flags.ManageRoles, name: 'Gérer les rôles' },
  ];

  const missingBotPerms = neededBotPerms
    .filter(p => !botMember.permissions.has(p.flag))
    .map(p => `• ${p.name}`);

  if (missingBotPerms.length > 0) {
    return interaction.editReply({
      embeds: [
        require('../../utils/embeds').error(
          'Permissions insuffisantes',
          `Le bot a besoin de ces permissions :\n${missingBotPerms.join('\n')}`
        ),
      ],
    });
  }

  // Confirmation si reset demandé
  const reset = interaction.options.getBoolean('reset') || false;
  if (reset) {
    const confirmed = await requestResetConfirmation(interaction);
    if (!confirmed) return;
  }

  // Lance la génération
  logger.info('ServerForge:Generate',
    `Génération in-guild: "${interaction.guild.name}" par ${interaction.user.tag}`
  );

  try {
    const result = await generateServer(interaction.guild, template, interaction, { name: options.name, reset });

    await interaction.editReply({
      embeds: [
        result.success
          ? require('../../utils/embeds').success(
              '✅ Génération terminée',
              `**${result.stats.rolesCreated}** rôles · **${result.stats.channelsCreated}** salons créés`
            )
          : require('../../utils/embeds').warning(
              '⚠️ Génération partielle',
              `${result.errors.length} erreur(s) :\n${result.errors.slice(0, 5).map(e => `• ${e}`).join('\n')}`
            ),
      ],
    });
  } catch (err) {
    logger.errorStack('ServerForge:Generate', err);
    await interaction.editReply({
      embeds: [
        require('../../utils/embeds').error('Erreur critique', `\`${err.message}\``),
      ],
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE 2 : Création d'un nouveau serveur
// ═══════════════════════════════════════════════════════════════════════════════

async function handleNewServer(interaction, client, template, options) {
  const serverName = options.name || template.meta?.name || 'Mon Serveur';

  // Demande confirmation via Modal (fonctionne en User-Install et DM)
  const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

  const modal = new ModalBuilder()
    .setCustomId('sf_confirm_create')
    .setTitle('🏗️ Confirmation — Nouveau serveur');

  const input = new TextInputBuilder()
    .setCustomId('server_name')
    .setLabel('Tape OUI pour confirmer la création')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('OUI')
    .setRequired(true)
    .setMaxLength(3);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);

  // On attend la réponse via un collecteur sur l'interaction
  try {
    const modalSubmit = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === 'sf_confirm_create' && i.user.id === interaction.user.id,
      time: 60000,
    });

    const answer = modalSubmit.fields.getTextInputValue('server_name');
    if (answer.toUpperCase() !== 'OUI') {
      return modalSubmit.reply({
        content: '❌ Création annulée.',
        ephemeral: true,
      });
    }

    await modalSubmit.deferReply({ ephemeral: true });

    await modalSubmit.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(THEME.COLOR_INFO)
          .setTitle('🏗️ Création du serveur en cours...')
          .setDescription('Cela prend environ 30 secondes.')
          .setFooter({ text: THEME.FOOTER_TEXT }),
      ],
    });

    // Remplace interaction par modalSubmit pour la suite (même user, même session)
    interaction = modalSubmit;
  } catch {
    // Timeout
    return interaction.editReply({
      content: '❌ Temps écoulé. Relance `/generate`.',
    }).catch(() => {});
  }

  // ── Étape 1 : Créer le serveur via l'API REST ──────────────────────────────
  let guildData;
  try {
    guildData = await client.rest.post('/guilds', {
      body: {
        name: serverName,
        verification_level: 1, // LOW
        default_message_notifications: 0, // ALL_MESSAGES
      },
    });
    logger.info('ServerForge:Create', `Serveur créé: ${guildData.name} (${guildData.id})`);
  } catch (err) {
    logger.error('ServerForge:Create', `Échec création serveur: ${err.message}`);
    return interaction.editReply({
      embeds: [
        require('../../utils/embeds').error(
          '❌ Erreur',
          `Impossible de créer le serveur : \`${err.message}\``
        ),
      ],
    }).catch(() => {});
  }

  // ── Étape 2 : Attendre que le guild arrive dans le cache ──────────────────
  let guild;
  try {
    guild = await waitForGuild(client, guildData.id, 15000);
  } catch {
    try {
      guild = await client.guilds.fetch(guildData.id);
    } catch {
      return sendErrorDM(interaction, client, 'Le serveur a été créé mais le bot n\'a pas pu le rejoindre. Regarde dans ta liste de serveurs.');
    }
  }

  // ── Étape 3 : Appliquer le template ──────────────────────────────────────
  try {
    const result = await generateServer(guild, template, null, { name: options.name });

    // ── Étape 4 : Créer un lien d'invitation ─────────────────────────────────
    let inviteLink = 'https://discord.com/channels/@me';
    try {
      const channels = await guild.channels.fetch();
      const firstText = channels.find(c => c.type === 0);
      if (firstText) {
        const invite = await firstText.createInvite({
          maxAge: 86400, // 24h
          maxUses: 1,
          reason: 'Invitation pour la génération ServerForge',
        });
        inviteLink = invite.url;
      }
    } catch {
      // fallback
    }

    // ── Étape 5 : Résultat ─────────────────────────────────────────────────
    const successEmbed = new EmbedBuilder()
      .setColor(THEME.COLOR_SUCCESS)
      .setTitle('✅ Serveur créé avec succès !')
      .setDescription(
        `**${guild.name}** est prêt !\n\n` +
        `**📊 Statistiques :**\n` +
        `• 👥 **${result.stats.rolesCreated}** rôles\n` +
        `• 💬 **${result.stats.channelsCreated}** salons\n` +
        `• 📋 **${result.stats.logsCreated || 0}** logs\n\n` +
        `**🔗 Lien d\'invitation :**\n${inviteLink}\n\n` +
        `Le lien expire dans **24h** et n'est utilisable **qu'une fois**.`
      )
      .setFooter({ text: THEME.FOOTER_TEXT });

    // Répond dans le channel (DM ou serveur)
    await interaction.editReply({ embeds: [successEmbed] }).catch(() => {});

    // DM aussi au cas où
    try {
      await interaction.user.send({ embeds: [successEmbed] });
    } catch { /* DM fermés */ }

    logger.info('ServerForge:Create',
      `Succès: ${guild.name} — ${result.stats.rolesCreated} rôles, ${result.stats.channelsCreated} salons`
    );

  } catch (err) {
    logger.errorStack('ServerForge:Create', err);
    await sendErrorDM(interaction, client,
      `Le serveur **${guild.name}** a été créé mais la configuration a échoué : \`${err.message}\``
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utilitaires
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Charge et valide le template depuis le disque.
 * @param {import('discord.js').CommandInteraction} interaction
 * @returns {object|null}
 */
async function loadTemplate(interaction) {
  try {
    if (!fs.existsSync(DEFAULT_TEMPLATE_PATH)) {
      await interaction.reply({
        embeds: [
          require('../../utils/embeds').error(
            'Template introuvable',
            'Le fichier `default.template.json` est manquant.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    const raw = fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf-8');
    const template = JSON.parse(raw);

    const errors = validateTemplate(template);
    if (errors.length > 0) {
      await interaction.reply({
        embeds: [
          require('../../utils/embeds').error(
            'Template invalide',
            `**${errors.length} erreur(s) :**\n${errors.map(e => `• ${e}`).join('\n')}`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    return template;
  } catch (err) {
    await interaction.reply({
      embeds: [
        require('../../utils/embeds').error(
          'Erreur de chargement',
          `\`${err.message}\``
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
}

/**
 * Attend qu'un guild soit disponible dans le cache.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {number} timeout
 * @returns {Promise<import('discord.js').Guild>}
 */
function waitForGuild(client, guildId, timeout) {
  return new Promise((resolve, reject) => {
    const existing = client.guilds.cache.get(guildId);
    if (existing) return resolve(existing);

    const timer = setTimeout(() => {
      client.removeListener('guildCreate', handler);
      reject(new Error('Timeout en attendant le serveur'));
    }, timeout);

    const handler = (guild) => {
      if (guild.id === guildId) {
        clearTimeout(timer);
        resolve(guild);
      }
    };

    client.on('guildCreate', handler);
  });
}

/**
 * Envoie un message d'erreur en DM à l'utilisateur.
 */
async function sendErrorDM(interaction, client, message) {
  try {
    await interaction.user.send({
      embeds: [require('../../utils/embeds').error('❌ Erreur', message)],
    });
  } catch { /* ignoré */ }
}

/**
 * Demande confirmation avant un reset (mode in-guild).
 * @param {import('discord.js').CommandInteraction} interaction
 * @returns {Promise<boolean>}
 */
async function requestResetConfirmation(interaction) {
  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sf_confirm_reset')
      .setLabel('🗑️ Confirmer le reset')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('sf_cancel_reset')
      .setLabel('✗ Annuler')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({
    embeds: [
      require('../../utils/embeds').warning(
        '⚠️ Confirmation requise — Reset du serveur',
        `Tu es sur le point de **supprimer TOUS** les salons, rôles et emojis du serveur **${interaction.guild.name}**.\n\n` +
        'Cette action est **irréversible**.\n\n' +
        '**Clique sur "Confirmer le reset" pour continuer.**'
      ),
    ],
    components: [confirmRow],
  });

  try {
    const filter = (btnInt) =>
      btnInt.user.id === interaction.user.id &&
      ['sf_confirm_reset', 'sf_cancel_reset'].includes(btnInt.customId);

    const confirmation = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });

    if (confirmation.customId === 'sf_cancel_reset') {
      await confirmation.update({
        embeds: [require('../../utils/embeds').info('Annulé', 'Génération annulée.')],
        components: [],
      });
      return false;
    }

    await confirmation.update({
      embeds: [require('../../utils/embeds').info('Reset confirmé', 'Démarrage de la génération avec reset...')],
      components: [],
    });
    return true;
  } catch {
    await interaction.editReply({
      embeds: [require('../../utils/embeds').error('Temps écoulé', 'La confirmation a expiré.')],
      components: [],
    });
    return false;
  }
}
