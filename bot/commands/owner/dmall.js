'use strict';

const E = require('../../utils/embeds');

const BAR_SIZE     = 14;
const SEND_DELAY   = 400;   // ms entre chaque DM
const EDIT_EVERY   = 1500;  // ms max entre chaque mise à jour embed

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bar(done, total) {
  const ratio  = total === 0 ? 1 : Math.min(done / total, 1);
  const filled = Math.round(ratio * BAR_SIZE);
  return '█'.repeat(filled) + '░'.repeat(BAR_SIZE - filled);
}

function eta(remaining, elapsed, done) {
  if (done === 0) return '—';
  const speed = done / (elapsed / 1000);
  const secs  = Math.ceil((remaining / speed));
  if (!isFinite(secs) || secs <= 0) return '< 1s';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, '0')}s`;
}

function progressEmbed(sent, failed, total, startTime, texte) {
  const done      = sent + failed;
  const remaining = total - done;
  const pct       = total === 0 ? 100 : Math.floor((done / total) * 100);
  const elapsed   = Date.now() - startTime;
  const speed     = done > 0 ? (done / (elapsed / 1000)).toFixed(1) : '0.0';
  const etaStr    = eta(remaining, elapsed, done);
  const barStr    = bar(done, total);
  const preview   = texte.length > 60 ? texte.slice(0, 60) + '…' : texte;

  return E.base()
    .setTitle('📨 Envoi DM en cours...')
    .setDescription(
      `**Message :** ${preview}\n\n` +
      `\`${barStr}\`  **${pct}%**  (${done}/${total})`
    )
    .addFields(
      { name: '✓ Envoyés',   value: `\`${sent}\``,        inline: true },
      { name: '✗ Échecs',    value: `\`${failed}\``,      inline: true },
      { name: '⏳ Restants',  value: `\`${remaining}\``,   inline: true },
      { name: '⚡ Vitesse',   value: `\`${speed}/s\``,     inline: true },
      { name: '⏱ ETA',       value: `\`${etaStr}\``,      inline: true },
      { name: '📊 Total',    value: `\`${total}\``,        inline: true },
    );
}

// ─── Commande ─────────────────────────────────────────────────────────────────

module.exports = {
  name       : 'dmall',
  aliases    : ['dma'],
  description: 'Envoie un message privé à tous les membres avec suivi de progression en temps réel.',
  usage      : ';dmall <message>',
  cooldown   : 60,
  ownerOnly  : true,
  guildOnly  : true,

  async execute(message, args) {
    if (!args.length) {
      return message.reply({ embeds: [E.error('Message manquant', 'Usage : `;dmall <message>`')] });
    }

    const texte = args.join(' ');
    if (texte.length > 1800) {
      return message.reply({ embeds: [E.error('Message trop long', 'Maximum 1800 caractères.')] });
    }

    // Récupérer les membres
    const loading = await message.reply({
      embeds: [E.info('Préparation...', 'Récupération de la liste des membres.')],
    });

    let allMembers;
    try {
      allMembers = await message.guild.members.fetch();
    } catch (err) {
      console.error('[dmall] fetch error:', err);
      return loading.edit({ embeds: [E.error('Erreur', `Impossible de récupérer les membres : ${err.message}`)] });
    }

    const targets = [...allMembers.values()].filter(
      m => !m.user.bot && m.id !== message.author.id
    );

    if (targets.length === 0) {
      return loading.edit({
        embeds: [E.warning('Aucun destinataire', 'Aucun membre humain à contacter sur ce serveur (hors toi-même et les bots).')],
      });
    }

    const total     = targets.length;
    const startTime = Date.now();
    let sent        = 0;
    let failed      = 0;
    let lastEdit    = 0;

    // Afficher la barre à 0% dès le départ
    await loading.edit({ embeds: [progressEmbed(0, 0, total, startTime, texte)] });
    lastEdit = Date.now();

    // ─── Boucle d'envoi ──────────────────────────────────────────────────────
    for (const member of targets) {
      try {
        await member.send({
          embeds: [
            E.info(`Message de ${message.guild.name}`, texte)
              .setFooter({ text: `Envoyé par ${message.author.tag}` }),
          ],
        });
        sent++;
      } catch {
        failed++;
      }

      const done = sent + failed;
      const pct  = Math.floor((done / total) * 100);
      console.log(`[dmall] ${done}/${total} (${pct}%) | ✓${sent} ✗${failed}`);

      // Mise à jour : au moins toutes les EDIT_EVERY ms
      if (Date.now() - lastEdit >= EDIT_EVERY) {
        lastEdit = Date.now();
        await loading.edit({
          embeds: [progressEmbed(sent, failed, total, startTime, texte)],
        }).catch(e => console.error('[dmall] edit error:', e.message));
      }

      await new Promise(r => setTimeout(r, SEND_DELAY));
    }

    // ─── Rapport final ────────────────────────────────────────────────────────
    const durationS = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgSpeed  = (total / ((Date.now() - startTime) / 1000)).toFixed(2);
    const barFull   = bar(total, total);

    let finalEmbed;

    if (failed === 0) {
      finalEmbed = E.success('Envoi terminé')
        .setDescription(
          `\`${barFull}\` **100%**\n\n` +
          'Tous les membres ont reçu le message.'
        );
    } else if (sent === 0) {
      finalEmbed = E.error('Envoi échoué')
        .setDescription(
          `\`${barFull}\` **100%**\n\n` +
          'Aucun membre n\'a pu être contacté.\n' +
          'Probable cause : les DMs sont désactivés sur ce serveur, ou le bot est bloqué.'
        );
    } else {
      finalEmbed = E.warning('Envoi partiel')
        .setDescription(
          `\`${barFull}\` **100%**\n\n` +
          `${failed} membre(s) ont les DMs fermés ou ont bloqué le bot.`
        );
    }

    finalEmbed.addFields(
      { name: '✓ Envoyés',   value: `\`${sent}\``,          inline: true },
      { name: '✗ Échecs',    value: `\`${failed}\``,        inline: true },
      { name: '📊 Total',    value: `\`${total}\``,          inline: true },
      { name: '⏱ Durée',    value: `\`${durationS}s\``,     inline: true },
      { name: '⚡ Vitesse',  value: `\`${avgSpeed} msg/s\``, inline: true },
    );

    return loading.edit({ embeds: [finalEmbed] });
  },
};
