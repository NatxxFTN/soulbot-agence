'use strict';

const { e } = require('./emojis');

async function withLoading(message, loadingText, workFn) {
  const loadingMsg = await message.reply({
    content: `${e('ani_loading')} ${loadingText}`,
    allowedMentions: { repliedUser: false },
  });
  try {
    const result = await workFn();
    return { loadingMsg, result };
  } catch (err) {
    await loadingMsg.edit({ content: `❌ Erreur : ${err.message}` }).catch(() => {});
    throw err;
  }
}

module.exports = { withLoading };
