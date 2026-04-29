'use strict';

const E = require('../../utils/embeds');

module.exports = {
  name       : 'serverrestore',
  aliases    : ['srvrestore'],
  description: 'Aperçu d\'un backup JSON (suite à `;serverbackup`). Restore réel manuel pour sécurité.',
  usage      : ';serverrestore (avec fichier .json en attachment)',
  cooldown   : 60,
  guildOnly  : true,
  permissions: ['Administrator'],

  async execute(message) {
    const att = message.attachments.first();
    if (!att) {
      return message.reply({ embeds: [E.error('Fichier manquant', 'Joins le fichier `.json` produit par `;serverbackup`.')] });
    }
    if (!att.name?.endsWith('.json')) {
      return message.reply({ embeds: [E.error('Format invalide', 'Le fichier doit être un `.json`.')] });
    }
    if (att.size > 5 * 1024 * 1024) {
      return message.reply({ embeds: [E.error('Trop gros', 'Maximum 5 MB.')] });
    }

    let data;
    try {
      const res = await fetch(att.url);
      const text = await res.text();
      data = JSON.parse(text);
    } catch (err) {
      return message.reply({ embeds: [E.error('JSON invalide', `Impossible de parser : ${err.message}`)] });
    }

    if (!data.meta || data.meta.version !== 'serverbackup-v1') {
      return message.reply({ embeds: [E.error('Format inconnu', 'Backup non reconnu (format `serverbackup-v1` attendu).')] });
    }

    return message.reply({
      embeds: [
        E.warning('Aperçu backup — restore manuel pour sécurité')
          .setDescription(
            `**Origine** : ${data.meta.guild_name} (\`${data.meta.guild_id}\`)\n` +
            `**Exporté le** : ${data.meta.exported_at}\n` +
            `**Par** : ${data.meta.exported_by}\n\n` +
            `📊 **Contenu :**\n` +
            `• ${data.rolesCount || 0} rôles\n` +
            `• ${data.channelsCount || 0} salons\n` +
            `• ${data.categoriesCount || 0} catégories\n\n` +
            `⚠️ **Restore automatique non implémenté** (risque destructif). Utilise les templates Soulbot (\`;template apply\`) ou recrée manuellement.`,
          ),
      ],
    });
  },
};
