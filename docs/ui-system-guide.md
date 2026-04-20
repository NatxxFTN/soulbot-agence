# Guide Système UI Soulbot

## Structure

```
bot/ui/
├── theme.js              — charte visuelle (COLORS, EMOJIS, LABELS)
├── builders/
│   ├── panel-builder.js  — construit embed + components
│   └── toggle-section.js — bouton toggle + texte de section
├── components/
│   ├── buttons.js        — reset, configure, back, save, cancel
│   ├── selects.js        — channel, role, string select menus
│   └── modals.js         — popup de saisie texte
├── panels/
│   └── greeting-panel.js — panel ;greeting (modèle à suivre)
└── handlers/
    └── greeting-handler.js — interactions greeting:*
```

## Créer un nouveau panel

1. Créer `bot/ui/panels/<nom>-panel.js`
   - Utiliser `buildPanel`, `buildToggleButton`, `buttons`, `selects`
   - Toujours importer couleurs/emojis depuis `theme.js`

2. Créer `bot/ui/handlers/<nom>-handler.js`
   - Exporter `handleXxxInteraction(interaction)` + `register(client)`
   - Permission check en tête, try/catch global, ephemeral sur erreur

3. Dans `bot/index.js`, après `registerUIHandlers` :
   ```js
   const { register: registerXxxHandlers } = require('./ui/handlers/<nom>-handler');
   registerXxxHandlers(client);
   ```

4. Refactoriser `bot/commands/<cat>/<nom>.js` :
   ```js
   const { renderMainPanel } = require('../../ui/panels/<nom>-panel');
   // execute() → message.reply(renderMainPanel(guild.id))
   ```

## Convention custom_id

Format : `<panel>:<section>:<action>[:<arg>]`

| Exemple | Signification |
|---|---|
| `greeting:join:toggle` | toggle arrivée |
| `greeting:join:channel` | select salon arrivée |
| `greeting:join:message_modal` | ouvre la modal |
| `greeting:join:message_save` | soumet la modal |
| `greeting:back` | retour menu principal |

## Routing des interactions

Le `interactionCreate.js` dispatche via `client.buttonHandlers.get(action)` où `action = customId.split(':')[0]`.

La fonction `register(client)` inscrit le handler dans :
- `client.buttonHandlers` (boutons)
- `client.selectHandlers` (select menus)
- `client.modalHandlers`  (modals)

## Exemple panel complet — ;antileak (Étape 2)

```js
// bot/ui/panels/antileak-panel.js
function renderMainPanel(guildId) {
  // sections token / ip / email / numero
  // dropdown sanction par section
}

// bot/ui/handlers/antileak-handler.js
function register(client) {
  client.buttonHandlers.set('antileak', handler);
  client.selectHandlers.set('antileak', handler);
}
```
