'use strict';

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const { e } = require('../../core/emojis');

function panel(title, body, options = {}) {
  const container = new ContainerBuilder().setAccentColor(0xFF0000);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(title));

  if (body) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  }

  if (options.image) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(options.image)
          .setDescription(options.imageDescription || title.replace(/\*/g, '')),
      ),
    );
  }

  if (options.footer) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options.footer));
  }

  return container;
}

function fieldBlock(fields) {
  return fields
    .filter(field => field && field.name && field.value !== undefined && field.value !== null)
    .map(field => `**${field.name}**\n${field.value}`)
    .join('\n\n');
}

function payload(container, options = {}) {
  const extraComponents = options.components || [];
  const out = {
    components: [container, ...extraComponents],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: options.allowedMentions || { parse: [] },
  };
  if (options.files) out.files = options.files;
  return out;
}

function reply(message, container, options = {}) {
  return message.reply(payload(container, options));
}

function send(channel, container, options = {}) {
  return channel.send(payload(container, options));
}

function edit(target, container, options = {}) {
  return target.edit(payload(container, options));
}

function success(title, body) {
  return panel(`${e('btn_success')} **${title}**`, body);
}

function error(title, body) {
  return panel(`${e('btn_error')} **${title}**`, body);
}

function info(title, body) {
  return panel(`${e('cat_information')} **${title}**`, body);
}

function usage(prefix, usageText, description) {
  return panel(
    `${e('ui_pin')} **Utilisation**`,
    `\`\`\`\n${prefix}${usageText}\n\`\`\`${description ? `\n${description}` : ''}`,
  );
}

module.exports = {
  MessageFlags,
  panel,
  fieldBlock,
  payload,
  reply,
  send,
  edit,
  success,
  error,
  info,
  usage,
};
