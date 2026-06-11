'use strict';

const { PermissionFlagsBits } = require('discord.js');
const E = require('../../utils/embeds');
const { e } = require('../../core/emojis');
const { renderBotConfigPanel } = require('../../ui/panels/botconfig-panel');
const { getGuildSettings, setGuildSetting } = require('../../database');
const { setGuildNickname, resetGuildBotConfig } = require('../../core/guild-config');
const pricing = require('../../core/pricing');
const { isOwner } = require('../../core/permissions');

module.exports = {
  name       : 'botconfig',
  aliases    : ['botcfg', 'bcfg'],
  category   : 'configuration',
  description: 'Panneau central de configuration Soulbot (prefix, nickname, tarifs).',
  usage      : ';botconfig [prefix <p> | nickname <nom> | pricing set <tier> <prix> | reset]',
  cooldown   : 3,
  guildOnly  : true,
  ownerOnly  : false,
  permissions: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply({
        embeds: [E.error('Accès refusé', 'Tu as besoin de la permission **Gérer le serveur**.')],
      });
    }

    const sub = (args[0] ?? '').toLowerCase();

    // ── ;botconfig prefix <nouveau> ──────────────────────────────────────────
    if (sub === 'prefix') {
      const value = args[1];
      if (!value || value.length > 5 || /\s/.test(value)) {
        return message.reply({
          embeds: [E.error('Prefix invalide', 'Usage : `;botconfig prefix <1-5 caractères sans espace>`')],
        });
      }
      const old = getGuildSettings(message.guild.id)?.prefix ?? ';';
      setGuildSetting(message.guild.id, 'prefix', value);
      return message.reply({
        embeds: [E.success('Prefix mis à jour', `Ancien : \`${old}\`\nNouveau : \`${value}\``)],
      });
    }

    // ── ;botconfig nickname <nom...> (vide = reset) ──────────────────────────
    if (sub === 'nickname') {
      const value = args.slice(1).join(' ').trim() || null;
      try {
        await message.guild.members.me.setNickname(value);
      } catch {
        return message.reply({
          embeds: [E.error('Échec', 'Vérifie la permission **Gérer les pseudos** et la hiérarchie des rôles.')],
        });
      }
      setGuildNickname(message.guild.id, value, message.author.id);
      return message.reply({
        embeds: [E.success('Nickname', value ? `Nouveau nickname : **${value}**` : 'Nickname réinitialisé.')],
      });
    }

    // ── ;botconfig pricing set <tier> <prix> (BotOwner) ──────────────────────
    if (sub === 'pricing') {
      if (!isOwner(message.author.id)) {
        return message.reply({
          embeds: [E.error('Accès refusé', 'Les tarifs ne sont modifiables que par le **BotOwner**.')],
        });
      }
      if ((args[1] ?? '').toLowerCase() !== 'set' || !args[2] || !args[3]) {
        const tiers = pricing.getAllPricing().map(t => `\`${t.id}\``).join(', ');
        return message.reply({
          embeds: [E.info('Usage', `\`;botconfig pricing set <tier> <prix>\`\nTiers : ${tiers}`)],
        });
      }
      const tier = pricing.getPricingById(args[2]);
      if (!tier) {
        return message.reply({ embeds: [E.error('Tier inconnu', `\`${args[2]}\` n'existe pas.`)] });
      }
      const price = Number(args[3].replace(',', '.').replace(/^\$/, ''));
      if (!Number.isFinite(price) || price < 0 || price > 10_000) {
        return message.reply({ embeds: [E.error('Prix invalide', `\`${args[3]}\` — nombre attendu (ex. 12.99).`)] });
      }
      const oldPrice = tier.price_usd;
      pricing.updatePricing(tier.id, {
        price_usd    : price,
        price_discord: Math.round(price * 100),
        updated_by   : message.author.id,
      });
      await pricing.syncPricingAcrossBot(tier.id, message.client);
      return message.reply({
        embeds: [E.success('Tarif mis à jour', `**${tier.name}** : $${oldPrice.toFixed(2)} → $${price.toFixed(2)}\nSynchronisé sur tous les affichages.`)],
      });
    }

    // ── ;botconfig reset ─────────────────────────────────────────────────────
    if (sub === 'reset') {
      setGuildSetting(message.guild.id, 'prefix', ';');
      resetGuildBotConfig(message.guild.id);
      await message.guild.members.me?.setNickname(null).catch(() => {});
      return message.reply({
        embeds: [E.success('Config réinitialisée', 'Prefix `;`, nickname et couleur par défaut restaurés.')],
      });
    }

    // ── ;botconfig legacy : ancien panel 3 onglets ───────────────────────────
    if (sub === 'legacy') {
      const payload = renderBotConfigPanel(message.guild, 'general', message.author.id);
      return message.reply({ ...payload, allowedMentions: { repliedUser: false } });
    }

    // ── Défaut : Studio V5 (personnalisation totale) ─────────────────────────
    const { renderStudio } = require('../../ui/panels/botconfig-studio');
    const payload = renderStudio(message.guild, 'identity', null, message.author.id);
    await message.reply({ ...payload, allowedMentions: { repliedUser: false } });
  },
};
