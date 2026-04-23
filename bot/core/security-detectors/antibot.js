'use strict';

// ── Détecteur antibot — s'applique à guildMemberAdd (pas messageCreate) ──────
// La fonction check() existe pour respecter le format standard mais retourne
// toujours false. L'event guildMemberAdd sera câblé au Prompt 3/3 via
// checkNewMember().

module.exports = {
  async check(_message, _config) {
    return { triggered: false };
  },

  /**
   * Appelé depuis bot/events/guildMemberAdd.js (à créer au prompt 3).
   * Déclenche si le nouveau membre est un bot.
   */
  async checkNewMember(member, _config) {
    if (!member.user?.bot) return { triggered: false };
    return {
      triggered: true,
      reason   : `Bot ${member.user.tag} tenté d'être ajouté au serveur`,
    };
  },
};
