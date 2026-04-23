'use strict';

// ── Embed Builder — Update helper ─────────────────────────────────────────────
// Rafraîchit le panel principal depuis un message existant (après interactions
// éphémères qui ne peuvent pas update le message d'origine directement).

const { renderEmbedBuilderPanel } = require('../ui/panels/embed-builder-panel');

async function updatePanelFromMessage(client, state) {
  if (!state.messageId || !state.channelId) return;
  try {
    const channel = await client.channels.fetch(state.channelId);
    if (!channel) return;
    const message = await channel.messages.fetch(state.messageId);
    if (!message) return;
    await message.edit(renderEmbedBuilderPanel(state));
  } catch (err) {
    console.error('[embed-update]', err.message);
  }
}

module.exports = { updatePanelFromMessage };
