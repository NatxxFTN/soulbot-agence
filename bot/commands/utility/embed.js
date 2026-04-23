'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { createState, getState, updateState } = require('../../core/embed-state');
const { renderEmbedBuilderPanel } = require('../../ui/panels/embed-builder-panel');

const { hexToDecimal } = require('../../core/embed-colors');

module.exports = {
  name       : 'embed',
  aliases    : ['eb', 'embedbuilder'],
  category   : 'utility',
  description: 'Ouvre le constructeur d\'embeds interactif. Sous-cmds : quick, export, import.',
  usage      : ';embed [quick <titre> | <desc> | [couleur]] | [export] | [import <base64>]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply({ embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer les messages**.')] });
    }

    const sub = args[0]?.toLowerCase();

    // ── Mode rapide ──────────────────────────────────────────────────────────
    if (sub === 'quick' || sub === 'q') {
      const raw   = args.slice(1).join(' ');
      const parts = raw.split('|').map(s => s.trim());
      const title = parts[0] || null;
      const desc  = parts[1] || null;
      const color = parts[2] ? hexToDecimal(parts[2]) : null;

      if (!title && !desc) {
        return message.reply({ embeds: [E.error('Quick embed', 'Format : `;embed quick Titre | Description | #couleur`')] });
      }

      const { buildEmbedFromState } = require('../../ui/handlers/embed-handler');
      const fakeState = {
        embed: {
          title, description: desc, color,
          author: null, footer: null, thumbnail: null, image: null,
          titleUrl: null, timestamp: null, fields: [],
        },
      };

      try {
        const emb = buildEmbedFromState(fakeState);
        return message.channel.send({ embeds: [emb] });
      } catch (err) {
        return message.reply({ embeds: [E.error('Quick embed', `Erreur : ${err.message}`)] });
      }
    }

    // ── Export ────────────────────────────────────────────────────────────────
    if (sub === 'export') {
      const state = getState(message.author.id);
      if (!state) {
        return message.reply({ embeds: [E.error('Pas de session', 'Ouvre d\'abord le builder avec `;embed`.')] });
      }
      const b64 = Buffer.from(JSON.stringify(state.embed)).toString('base64');
      return message.reply({
        embeds: [
          E.success('Export embed')
            .setDescription('Copie ce code pour réimporter ton embed plus tard avec `;embed import <code>`.')
            .addFields({ name: 'Code base64', value: `\`\`\`\n${b64}\n\`\`\`` }),
        ],
      });
    }

    // ── Import ────────────────────────────────────────────────────────────────
    if (sub === 'import') {
      const b64 = args.slice(1).join('').trim();
      if (!b64) {
        return message.reply({ embeds: [E.error('Import embed', 'Fournis le code base64 : `;embed import <code>`')] });
      }

      let embedData;
      try {
        embedData = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      } catch {
        return message.reply({ embeds: [E.error('Import embed', 'Code base64 invalide ou corrompu.')] });
      }

      if (getState(message.author.id)) {
        return message.reply({ embeds: [E.error('Session active', 'Ferme ta session active avant d\'importer.')] });
      }

      const state = createState(message.author.id, message.guild.id, message.channel.id);
      if (embedData.title)       updateState(message.author.id, { title: String(embedData.title).slice(0, 256) });
      if (embedData.description) updateState(message.author.id, { description: String(embedData.description).slice(0, 4096) });
      if (embedData.color !== undefined) updateState(message.author.id, { color: embedData.color });
      if (embedData.author)      updateState(message.author.id, { author: embedData.author });
      if (embedData.footer)      updateState(message.author.id, { footer: embedData.footer });
      if (embedData.thumbnail)   updateState(message.author.id, { thumbnail: embedData.thumbnail });
      if (embedData.image)       updateState(message.author.id, { image: embedData.image });
      if (embedData.titleUrl)    updateState(message.author.id, { titleUrl: embedData.titleUrl });
      if (embedData.timestamp)   updateState(message.author.id, { timestamp: embedData.timestamp });
      if (Array.isArray(embedData.fields)) {
        for (const f of embedData.fields.slice(0, 25)) {
          if (f.name && f.value) state.embed.fields.push(f);
        }
      }

      const panel = renderEmbedBuilderPanel(state);
      const msg   = await message.reply({ ...panel, allowedMentions: { repliedUser: false } });
      state.messageId = msg.id;
      return;
    }

    // ── Builder interactif (défaut) ───────────────────────────────────────────
    if (getState(message.author.id)) {
      return message.reply({
        embeds: [E.error('Session active', 'Tu as déjà une session ouverte. Ferme-la d\'abord ou attends 15 min.')],
      });
    }

    const state = createState(message.author.id, message.guild.id, message.channel.id);
    const panel = renderEmbedBuilderPanel(state);
    const msg   = await message.reply({ ...panel, allowedMentions: { repliedUser: false } });
    state.messageId = msg.id;
  },
};
