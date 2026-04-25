'use strict';

const { runAudit } = require('../../core/audit-helper');
const { renderAuditPanel } = require('../../ui/panels/audit-panel');
const { e } = require('../../core/emojis');

module.exports = {
  name        : 'auditserver',
  aliases     : ['audit', 'auditsrv', 'serveraudit', 'serverscan'],
  description : 'Audit complet du serveur avec score par section',
  usage       : ';auditserver',
  guildOnly   : true,
  permissions : ['ManageGuild'],

  async execute(message) {
    // POURQUOI pas de loading message "legacy" puis edit en V2 :
    // Discord refuse de mélanger content (legacy) et IsComponentsV2 sur
    // un même message. Conversion impossible via edit → on envoie
    // directement la réponse V2 finale. Le typing indicator couvre les 2-3s.
    try {
      await message.channel.sendTyping().catch(() => {});

      // Fetch members pour avoir un cache complet côté audit
      await message.guild.members.fetch().catch(() => {});

      const report = await runAudit(message.guild);

      return message.reply({
        ...renderAuditPanel(message.guild, report),
        allowedMentions: { repliedUser: false },
      });
    } catch (err) {
      console.error('[auditserver]', err);
      return message.reply({
        content: `${e('btn_error')} Échec de l'audit : ${err.message}`,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }
  },
};
