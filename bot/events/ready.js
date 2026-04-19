'use strict';

const { ActivityType } = require('discord.js');
const { ensureGuild }  = require('../database');
const E                = require('../utils/embeds');

module.exports = {
  name : 'clientReady',
  once : true,

  async execute(client) {
    // Initialise l'identité bot dans le module embeds (nom + avatar URL).
    // POURQUOI ici et nulle part ailleurs : client.user n'est disponible
    // qu'après l'event ready. Appeler init() avant = iconURL null permanent.
    E.init(client.user);

    console.log(`[Bot] Connecté en tant que ${client.user.tag}`);
    console.log(`[Bot] ${client.guilds.cache.size} serveur(s) | ${client.users.cache.size} utilisateur(s)`);

    // Présence
    client.user.setPresence({
      activities : [{ name: `${client.guilds.cache.size} serveur(s) | ;help`, type: ActivityType.Watching }],
      status     : 'online',
    });

    // Initialiser chaque guilde en base
    for (const guild of client.guilds.cache.values()) {
      ensureGuild(guild.id);
    }

    // Mettre en cache les invitations (module invitations)
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
      } catch { /* pas de perm MANAGE_GUILD */ }
    }

    // Vérification périodique des rôles anciens (toutes les heures)
    setInterval(() => checkAncientRoles(client), 60 * 60 * 1000);
    // Vérification des anniversaires (tous les jours à minuit approx)
    scheduleBirthdayCheck(client);

    // Démarrer les live StatEmbeds configurés
    const { db } = require('../database');
    const { startLiveUpdate } = require('../commands/stats/statembed');
    const guildsWithEmbed = db.prepare(
      'SELECT guild_id FROM guild_settings WHERE statembed_channel_id IS NOT NULL AND statembed_message_id IS NOT NULL'
    ).all();
    for (const row of guildsWithEmbed) {
      startLiveUpdate(client, row.guild_id, 10 * 60 * 1000);
    }

    // ── Scheduler giveaway (tick 30s) ────────────────────────────────────────
    const { getActiveGiveaways, drawWinners, markEnded } = require('../core/giveaway-helper');
    const { EmbedBuilder } = require('discord.js');

    setInterval(async () => {
      const toEnd = getActiveGiveaways();
      for (const gw of toEnd) {
        try {
          const winners = drawWinners(gw.id, gw.winners_count);
          markEnded(gw.id, winners);
          const ch = await client.channels.fetch(gw.channel_id).catch(() => null);
          if (!ch) continue;
          const mentions = winners.length ? winners.map(w => `<@${w}>`).join(', ') : '*aucun participant*';
          await ch.send({
            content: winners.length ? winners.map(w => `<@${w}>`).join(' ') : '',
            embeds: [
              new EmbedBuilder()
                .setColor(0xF39C12)
                .setTitle('🎉 Giveaway terminé !')
                .setDescription(`**Gain :** ${gw.prize}\n**Gagnant(s) :** ${mentions}`)
                .setTimestamp(),
            ],
          }).catch(() => {});
        } catch (err) {
          console.error(`[Giveaway] Erreur tick #${gw.id}:`, err.message);
        }
      }
    }, 30_000);

    // ── Handlers ticket (bouton panel + select menu type) ────────────────────
    const { createTicket, getConfig } = require('../core/ticket-helper');

    client.buttonHandlers.set('ticket_open', async (interaction) => {
      try {
        const { channel, number } = await createTicket(interaction.guild, interaction.user);
        await interaction.reply({ content: `✓ Ticket créé : ${channel}`, ephemeral: true });
        await channel.send({
          content: interaction.user.toString(),
          embeds : [
            E.base()
              .setTitle(`🎫 Ticket #${String(number).padStart(4, '0')}`)
              .setDescription('Un membre du staff va te répondre sous peu.\nUtilise `;close` pour fermer ce ticket.'),
          ],
        });
      } catch (err) {
        const payload = { content: `✗ ${err.message}`, ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    });

    client.selectHandlers.set('ticket_type', async (interaction) => {
      const type = interaction.values[0];
      const labels = { support: 'Support général', bug: 'Bug / problème', partnership: 'Partenariat', other: 'Autre' };
      try {
        const { channel, number } = await createTicket(interaction.guild, interaction.user, type);
        await interaction.reply({ content: `✓ Ticket créé : ${channel}`, ephemeral: true });
        await channel.send({
          content: interaction.user.toString(),
          embeds : [
            E.base()
              .setTitle(`🎫 Ticket #${String(number).padStart(4, '0')} — ${labels[type] ?? type}`)
              .setDescription('Un membre du staff va te répondre sous peu.\nUtilise `;close` pour fermer ce ticket.'),
          ],
        });
      } catch (err) {
        const payload = { content: `✗ ${err.message}`, ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    });

    // ── Handlers template (boutons confirmation) ─────────────────────────────
    const { loadTemplate, applyTemplate, logAction: logTplAction } = require('../core/template-helper');

    const isOwner = (userId) => {
      const ids = (process.env.OWNER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
      return ids.includes(userId);
    };

    client.buttonHandlers.set('tpl_cancel', async (interaction) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }
      await interaction.update({ embeds: [E.info('Annulé', 'Opération annulée.')], components: [] });
    });

    client.buttonHandlers.set('tpl_confirm', async (interaction, params) => {
      if (!isOwner(interaction.user.id)) {
        return interaction.reply({ content: '✗ Accès refusé.', ephemeral: true });
      }

      const [name, mode, emjflag] = params;
      const template = loadTemplate(name);
      if (!template) {
        return interaction.update({ content: '✗ Template introuvable.', components: [] });
      }

      await interaction.update({
        embeds: [E.info('Chargement en cours...', 'Patience, cela peut prendre 1 à 2 minutes.')],
        components: [],
      });

      const startTime = Date.now();
      let lastUpdate  = Date.now();

      try {
        for await (const progress of applyTemplate(interaction.guild, template, {
          mode,
          includeEmojis: emjflag === 'emj',
        })) {
          if (progress.status !== 'done' && Date.now() - lastUpdate > 2000) {
            lastUpdate = Date.now();
            await interaction.editReply({
              embeds: [E.info('En cours...', progress.message || progress.status)],
            }).catch(() => {});
          }

          if (progress.status === 'done') {
            logTplAction({
              action      : 'load',
              templateName: name,
              userId      : interaction.user.id,
              guildId     : interaction.guild.id,
              guildName   : interaction.guild.name,
              mode,
              stats       : progress.stats,
              success     : true,
              durationMs  : Date.now() - startTime,
            });

            return interaction.editReply({
              embeds: [
                E.success('Template appliqué !')
                  .addFields(
                    { name: 'Rôles',       value: String(progress.stats.rolesCreated),      inline: true },
                    { name: 'Catégories',  value: String(progress.stats.categoriesCreated), inline: true },
                    { name: 'Salons',      value: String(progress.stats.channelsCreated),   inline: true },
                    { name: 'Emojis',      value: String(progress.stats.emojisCreated),     inline: true },
                    { name: 'Erreurs',     value: String(progress.stats.errors.length),     inline: true },
                    { name: 'Durée',       value: `${((Date.now() - startTime) / 1000).toFixed(1)}s`, inline: true },
                  ),
              ],
            });
          }
        }
      } catch (err) {
        logTplAction({
          action      : 'load',
          templateName: name,
          userId      : interaction.user.id,
          guildId     : interaction.guild.id,
          mode,
          success     : false,
          error       : err.message,
        });
        await interaction.editReply({
          embeds: [E.error('Erreur lors du chargement', err.message)],
        }).catch(() => {});
      }
    });

    console.log('[Bot] Prêt !');
  },
};

// ─── Rôles Ancien ─────────────────────────────────────────────────────────────
async function checkAncientRoles(client) {
  const { db } = require('../database');
  const now    = Math.floor(Date.now() / 1000);

  for (const guild of client.guilds.cache.values()) {
    const rules = db.prepare('SELECT * FROM ancient_roles WHERE guild_id = ? ORDER BY days_threshold ASC').all(guild.id);
    if (!rules.length) continue;

    let members;
    try {
      members = await guild.members.fetch();
    } catch { continue; }

    for (const member of members.values()) {
      if (member.user.bot) continue;
      const daysSince = Math.floor((now - member.joinedTimestamp / 1000) / 86400);

      for (const rule of rules) {
        const role = guild.roles.cache.get(rule.role_id);
        if (!role) continue;

        const qualifies = daysSince >= rule.days_threshold;

        if (qualifies && !member.roles.cache.has(rule.role_id)) {
          await member.roles.add(role).catch(() => {});

          // Si non-cumulatif, retirer les paliers inférieurs
          if (!rule.cumulative) {
            const lowerRules = rules.filter(r => r.days_threshold < rule.days_threshold);
            for (const lr of lowerRules) {
              if (member.roles.cache.has(lr.role_id)) {
                await member.roles.remove(lr.role_id).catch(() => {});
              }
            }
          }
        }
      }
    }
  }
}

// ─── Anniversaires ───────────────────────────────────────────────────────────
function scheduleBirthdayCheck(client) {
  const runCheck = async () => {
    const { db } = require('../database');
    const now   = new Date();
    const day   = now.getDate();
    const month = now.getMonth() + 1;

    const rows = db.prepare('SELECT * FROM birthdays WHERE day = ? AND month = ?').all(day, month);

    for (const row of rows) {
      const settings = db.prepare('SELECT role_bday_id FROM guild_settings WHERE guild_id = ?').get(row.guild_id);
      if (!settings?.role_bday_id) continue;

      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) continue;

      try {
        const member = await guild.members.fetch(row.user_id);
        if (!member.roles.cache.has(settings.role_bday_id)) {
          await member.roles.add(settings.role_bday_id);
        }
      } catch { /* membre absent */ }
    }
  };

  // Premier lancement immédiat puis toutes les 24h
  runCheck();
  setInterval(runCheck, 24 * 60 * 60 * 1000);
}
