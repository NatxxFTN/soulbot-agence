'use strict';

const { ChannelType } = require('discord.js');
const { getTemplate, listTemplateNames, summarize, TEMPLATES } = require('../../core/channel-templates');
const {
  newContainer, buildHeader, separator, text, toV2Payload,
  successEmbed, errorEmbed, warningEmbed, toEmbedReply,
} = require('../../ui/panels/_premium-helpers');

const TYPE_MAP = {
  text    : ChannelType.GuildText,
  voice   : ChannelType.GuildVoice,
  forum   : ChannelType.GuildForum,
  stage   : ChannelType.GuildStageVoice,
  announcement: ChannelType.GuildAnnouncement,
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  name        : 'channeltemplate',
  aliases     : ['chtpl', 'ctpl'],
  description : 'Crée une structure de salons depuis un template (gaming, esport, community, rp, staff, ticket, giveaway)',
  usage       : ';channeltemplate <nom_template>',
  guildOnly   : true,
  permissions : ['ManageChannels'],

  async execute(message, args) {
    const name = (args[0] || '').toLowerCase();

    // ── Panel V2 — liste des templates disponibles ──────────────────────
    if (!name) {
      const container = newContainer();
      buildHeader(container, {
        emojiKey : 'ui_folder',
        title    : 'Templates de salons disponibles',
        subtitle : `**${listTemplateNames().length}** templates pré-définis`,
      });

      for (const tplName of listTemplateNames()) {
        const tpl = TEMPLATES[tplName];
        const sum = summarize(tpl);
        container.addTextDisplayComponents(
          text(
            `### ${tpl.label} — \`${tplName}\`\n` +
            `${tpl.description}\n` +
            `*${sum.cats} catégorie(s) · ${sum.chans} salon(s)*`,
          ),
        );
      }
      container.addSeparatorComponents(separator('Small'));
      container.addTextDisplayComponents(
        text(`## Utilisation\n\`;channeltemplate <nom>\` — ex : \`;channeltemplate gaming\``),
      );
      container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Channel Templates v1.0`));
      return message.reply(toV2Payload(container));
    }

    const tpl = getTemplate(name);
    if (!tpl) {
      return message.reply(toEmbedReply(errorEmbed({
        title: 'Template inconnu',
        description: `\`${name}\` n'existe pas. Tape \`;channeltemplate\` pour voir la liste.`,
        category: 'Innovation',
      })));
    }

    const sum = summarize(tpl);
    const estSec = Math.ceil((sum.cats + sum.chans) * 0.7);

    await message.channel.sendTyping().catch(() => {});

    let okCats = 0, okChans = 0, failed = 0;
    const errors = [];

    for (const cat of tpl.categories) {
      try {
        const categoryCh = await message.guild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          reason: `[channeltemplate] ${name} par ${message.author.tag}`,
        });
        okCats++;
        await sleep(600);

        for (const ch of (cat.channels || [])) {
          try {
            await message.guild.channels.create({
              name  : ch.name,
              type  : TYPE_MAP[ch.type] || ChannelType.GuildText,
              parent: categoryCh.id,
              reason: `[channeltemplate] ${name}`,
            });
            okChans++;
            await sleep(600);
          } catch (err) {
            failed++;
            errors.push(`Salon \`${ch.name}\` : ${err.message}`);
          }
        }
      } catch (err) {
        failed++;
        errors.push(`Catégorie \`${cat.name}\` : ${err.message}`);
      }
    }

    // Rapport final — V2 panel
    const container = newContainer();
    buildHeader(container, {
      emojiKey : 'btn_success',
      title    : `Template \`${name}\` appliqué`,
      subtitle : `${tpl.label} · ${tpl.description}`,
    });

    container.addTextDisplayComponents(
      text(
        `## Résultat\n` +
        `• 📂 **Catégories créées :** ${okCats}/${tpl.categories.length}\n` +
        `• 💬 **Salons créés :** ${okChans}/${sum.chans}\n` +
        (failed ? `• 🔴 **Échecs :** ${failed}\n` : '') +
        `• ⏱ **Durée approx. :** ~${estSec}s`,
      ),
    );

    if (errors.length) {
      container.addSeparatorComponents(separator('Small'));
      container.addTextDisplayComponents(
        text(
          `## ⚠️ Erreurs (${errors.length})\n` +
          errors.slice(0, 8).map(e => `• ${e}`).join('\n') +
          (errors.length > 8 ? `\n*…et ${errors.length - 8} autres*` : ''),
        ),
      );
    }

    container.addTextDisplayComponents(text(`-# Soulbot • Innovation • Channel Templates v1.0 · par ${message.author.tag}`));

    return message.reply(toV2Payload(container));
  },
};
