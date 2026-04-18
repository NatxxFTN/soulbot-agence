'use strict';

const { EmbedBuilder } = require('discord.js');
const { db }           = require('../../database');
const { formatNumber } = require('../../utils/format');
const E = require('../../utils/embeds');

const EMOJI_NUMBERS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];

/*
 * ;poll "Question" option1 option2 [option3...] [--duration 24h]
 * ;poll end <id>
 * ;poll results <id>
 */
module.exports = {
  name        : 'poll',
  aliases     : ['sondage', 'vote'],
  description : 'Crée un sondage interactif.',
  usage       : 'poll "Question" option1 option2 [...] [--duration 1h]  |  poll end <id>  |  poll results <id>',
  cooldown    : 5,

  async execute(message, args, client) {
    const guildId = message.guild.id;
    const sub     = args[0]?.toLowerCase();

    // ── ;poll end <id> ────────────────────────────────────────────────────────
    if (sub === 'end' || sub === 'close' || sub === 'fermer') {
      const pollId = parseInt(args[1]);
      if (!pollId) return message.reply({ embeds: [E.error('Usage', '`;poll end <id>`')] });

      const poll = db.prepare('SELECT * FROM polls WHERE id = ? AND guild_id = ?').get(pollId, guildId);
      if (!poll) return message.reply({ embeds: [E.error('Introuvable', `Sondage #${pollId} introuvable.`)] });
      if (!poll.active) return message.reply({ embeds: [E.info('Info', 'Ce sondage est déjà terminé.')] });

      if (poll.creator_id !== message.author.id && !message.member.permissions.has('ManageMessages')) {
        return message.reply({ embeds: [E.error('Permission', 'Tu ne peux pas clore ce sondage.')] });
      }

      db.prepare('UPDATE polls SET active = 0 WHERE id = ?').run(pollId);
      return _showResults(message, poll, guildId, client);
    }

    // ── ;poll results <id> ────────────────────────────────────────────────────
    if (sub === 'results' || sub === 'résultats') {
      const pollId = parseInt(args[1]);
      if (!pollId) return message.reply({ embeds: [E.error('Usage', '`;poll results <id>`')] });

      const poll = db.prepare('SELECT * FROM polls WHERE id = ? AND guild_id = ?').get(pollId, guildId);
      if (!poll) return message.reply({ embeds: [E.error('Introuvable', `Sondage #${pollId} introuvable.`)] });

      return _showResults(message, poll, guildId, client);
    }

    // ── ;poll "Question" opt1 opt2 ... ───────────────────────────────────────
    // Parser : extraire la question entre guillemets, puis les options
    const fullInput = message.content.slice(message.content.indexOf('poll') + 4).trim();

    let question, rawOptions;
    const quotedMatch = fullInput.match(/^"([^"]+)"\s*([\s\S]*)$/);
    if (quotedMatch) {
      question   = quotedMatch[1].trim();
      rawOptions = quotedMatch[2].trim().split(/\s+/);
    } else {
      // Pas de guillemets : premier mot = question, reste = options (peu pratique mais supporté)
      const parts = args.slice();
      question    = parts.shift();
      rawOptions  = parts;
    }

    // Filtrer --duration
    let durationSec = null;
    const durIdx = rawOptions.findIndex(a => a === '--duration' || a === '-d');
    if (durIdx !== -1) {
      const { parseTime } = require('../../utils/format');
      durationSec = parseTime(rawOptions[durIdx + 1]);
      rawOptions.splice(durIdx, 2);
    }

    const options = rawOptions.filter(Boolean);

    if (question && question.length > 200) {
      return message.reply({ embeds: [E.error('Question trop longue', 'Maximum **200 caractères**.')] });
    }
    if (!question || options.length < 2) {
      return message.reply({ embeds: [E.usage(';', 'poll "Question" option1 option2 [--duration 24h]', 'Il faut au moins **2 options**. Entoure la question de guillemets.')] });
    }
    if (options.length > 9) {
      return message.reply({ embeds: [E.error('Trop d\'options', 'Maximum **9 options** par sondage.')] });
    }

    const endsAt = durationSec ? Math.floor(Date.now() / 1000) + durationSec : null;

    // ── Créer l'embed du sondage ───────────────────────────────────────────────
    const desc = options.map((opt, i) => `${EMOJI_NUMBERS[i]}  ${opt}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor(E.COLORS.PRIMARY)
      .setTitle(`📊  ${question}`)
      .setDescription(desc)
      .setFooter({ text: `Sondage par ${message.author.tag}${endsAt ? ` • Ferme <t:${endsAt}:R>` : ''}` })
      .setTimestamp();

    const pollMsg = await message.channel.send({ embeds: [embed] });

    // Ajouter les réactions
    for (let i = 0; i < options.length; i++) {
      await pollMsg.react(EMOJI_NUMBERS[i]).catch(() => {});
    }

    // Supprimer le message de commande pour garder le channel propre
    message.delete().catch(() => {});

    // Sauvegarder en DB
    const result = db.prepare(`
      INSERT INTO polls (guild_id, channel_id, message_id, creator_id, question, options, ends_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, message.channel.id, pollMsg.id, message.author.id, question, JSON.stringify(options), endsAt);

    // Planifier la fermeture automatique
    if (durationSec && durationSec < 24 * 3600) {
      setTimeout(async () => {
        const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(result.lastInsertRowid);
        if (poll?.active) {
          db.prepare('UPDATE polls SET active = 0 WHERE id = ?').run(poll.id);
          const chan = client.channels.cache.get(poll.channel_id);
          if (chan) await _showResults({ channel: chan }, poll, guildId, client);
        }
      }, durationSec * 1000);
    }
  },
};

// ─── Affichage des résultats ──────────────────────────────────────────────────
async function _showResults(context, poll, guildId, client) {
  const options   = JSON.parse(poll.options);
  const votes     = db.prepare('SELECT option_index, COUNT(*) AS c FROM poll_votes WHERE poll_id = ? GROUP BY option_index').all(poll.id);
  const totalVotes = votes.reduce((sum, v) => sum + v.c, 0);

  const voteMap = {};
  votes.forEach(v => { voteMap[v.option_index] = v.c; });

  // Essayer de lire les réactions depuis le message Discord
  try {
    const chan    = client.channels.cache.get(poll.channel_id);
    const pollMsg = chan ? await chan.messages.fetch(poll.message_id).catch(() => null) : null;

    if (pollMsg) {
      for (let i = 0; i < options.length; i++) {
        const reaction = pollMsg.reactions.cache.get(EMOJI_NUMBERS[i]);
        if (reaction) voteMap[i] = Math.max(0, (reaction.count ?? 1) - 1); // -1 pour le bot
      }
    }
  } catch {}

  const finalTotal = Object.values(voteMap).reduce((s, v) => s + v, 0);
  const { progressBar, formatNumber } = require('../../utils/format');

  const lines = options.map((opt, i) => {
    const count = voteMap[i] ?? 0;
    const pct   = finalTotal ? ((count / finalTotal) * 100).toFixed(1) : '0.0';
    const bar   = progressBar(count, finalTotal || 1, 10);
    return `${EMOJI_NUMBERS[i]}  **${opt}**\n${bar}  **${pct}%** (${count} vote(s))`;
  });

  const embed = new EmbedBuilder()
    .setColor(E.COLORS.SUCCESS)
    .setTitle(`📊  Résultats — ${poll.question}`)
    .setDescription(lines.join('\n\n'))
    .addFields({ name: '🗳️ Votes totaux', value: formatNumber(finalTotal), inline: true })
    .setFooter({ text: `Sondage #${poll.id} • ${poll.active ? 'En cours' : 'Terminé'}` })
    .setTimestamp();

  return context.channel ? context.channel.send({ embeds: [embed] }) : context.reply({ embeds: [embed] });
}
