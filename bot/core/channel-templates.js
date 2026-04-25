'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// CHANNEL TEMPLATES — 7 templates hardcodés pour ;channeltemplate
// Format : { label, description, categories: [{ name, channels: [{name, type}] }] }
// type : 'text' | 'voice' | 'announcement' | 'stage' | 'forum'
// ═══════════════════════════════════════════════════════════════════════════

const TEMPLATES = {
  gaming: {
    label: '🎮 Gaming',
    description: 'Salons jeux, voice gaming, ranked, tournois',
    categories: [
      { name: '━━━ INFOS GAMING ━━━', channels: [
        { name: '📢︱annonces',     type: 'text' },
        { name: '🎮︱règles-gaming', type: 'text' },
      ]},
      { name: '━━━ DISCUSSIONS ━━━', channels: [
        { name: '💬︱chat-général',  type: 'text' },
        { name: '🎲︱salon-jeux',    type: 'text' },
        { name: '🏆︱résultats',     type: 'text' },
      ]},
      { name: '━━━ VOCAUX JEUX ━━━', channels: [
        { name: '🎮 Gaming 1',       type: 'voice' },
        { name: '🎮 Gaming 2',       type: 'voice' },
        { name: '🏆 Ranked',         type: 'voice' },
        { name: '⚔️ Tournois',       type: 'voice' },
      ]},
    ],
  },
  esport: {
    label: '🏆 Esport',
    description: 'Staff, équipes, scrims, analyses',
    categories: [
      { name: '━━━ STAFF ESPORT ━━━', channels: [
        { name: '🛠️︱coaching-staff', type: 'text' },
        { name: '📊︱analyses',       type: 'text' },
      ]},
      { name: '━━━ ÉQUIPE A ━━━', channels: [
        { name: '💬︱team-a-chat',    type: 'text' },
        { name: '🎯 Team A',         type: 'voice' },
      ]},
      { name: '━━━ ÉQUIPE B ━━━', channels: [
        { name: '💬︱team-b-chat',    type: 'text' },
        { name: '🎯 Team B',         type: 'voice' },
      ]},
      { name: '━━━ SCRIMS ━━━', channels: [
        { name: '📅︱scrims-planning', type: 'text' },
        { name: '🎮 Scrim 1',        type: 'voice' },
        { name: '🎮 Scrim 2',        type: 'voice' },
      ]},
    ],
  },
  community: {
    label: '🌐 Community',
    description: 'Général, offtopic, memes, events',
    categories: [
      { name: '━━━ BIENVENUE ━━━', channels: [
        { name: '👋︱bienvenue',      type: 'text' },
        { name: '📜︱règles',         type: 'text' },
        { name: '📢︱annonces',       type: 'text' },
      ]},
      { name: '━━━ DISCUSSIONS ━━━', channels: [
        { name: '💬︱général',        type: 'text' },
        { name: '🎲︱offtopic',       type: 'text' },
        { name: '😂︱memes',          type: 'text' },
        { name: '🎉︱events',         type: 'text' },
      ]},
      { name: '━━━ VOCAUX ━━━', channels: [
        { name: '🔊 Salon 1',        type: 'voice' },
        { name: '🔊 Salon 2',        type: 'voice' },
      ]},
    ],
  },
  rp: {
    label: '🎭 RP',
    description: 'Lore, personnages, actions, staff',
    categories: [
      { name: '━━━ RP — OOC ━━━', channels: [
        { name: '📜︱règles-rp',      type: 'text' },
        { name: '💬︱ooc-général',    type: 'text' },
      ]},
      { name: '━━━ RP — LORE ━━━', channels: [
        { name: '📖︱lore',           type: 'text' },
        { name: '👥︱personnages',    type: 'text' },
      ]},
      { name: '━━━ RP — ACTIONS ━━━', channels: [
        { name: '⚔️︱actions-zone-1', type: 'text' },
        { name: '⚔️︱actions-zone-2', type: 'text' },
      ]},
      { name: '━━━ STAFF RP ━━━', channels: [
        { name: '🛠️︱staff-rp',      type: 'text' },
      ]},
    ],
  },
  staff: {
    label: '👷 Staff',
    description: 'Modération, admin, dev, logs',
    categories: [
      { name: '━━━ STAFF GÉNÉRAL ━━━', channels: [
        { name: '👷︱staff-chat',     type: 'text' },
        { name: '📢︱annonces-staff', type: 'text' },
      ]},
      { name: '━━━ MODÉRATION ━━━', channels: [
        { name: '🛡️︱modération',     type: 'text' },
        { name: '🚨︱signalements',   type: 'text' },
        { name: '📋︱sanctions-log',  type: 'text' },
      ]},
      { name: '━━━ ADMIN ━━━', channels: [
        { name: '👑︱admin-privé',    type: 'text' },
        { name: '🔧︱dev-notes',      type: 'text' },
      ]},
      { name: '━━━ LOGS ━━━', channels: [
        { name: '📝︱logs-messages',  type: 'text' },
        { name: '👥︱logs-membres',   type: 'text' },
        { name: '🔨︱logs-modération', type: 'text' },
      ]},
    ],
  },
  ticket: {
    label: '🎫 Ticket',
    description: 'Système de ticket prêt à l\'emploi',
    categories: [
      { name: '━━━ SUPPORT ━━━', channels: [
        { name: '🎫︱ouvrir-ticket',  type: 'text' },
        { name: '📖︱aide-support',   type: 'text' },
      ]},
      { name: '━━━ TICKETS ACTIFS ━━━', channels: [] },
      { name: '━━━ TICKETS ARCHIVÉS ━━━', channels: [
        { name: '📦︱transcripts',    type: 'text' },
      ]},
    ],
  },
  giveaway: {
    label: '🎁 Giveaway',
    description: 'Salons giveaway avec roles',
    categories: [
      { name: '━━━ GIVEAWAYS ━━━', channels: [
        { name: '🎁︱giveaway-officiel', type: 'text' },
        { name: '📜︱règles-giveaway',   type: 'text' },
        { name: '🏆︱gagnants',          type: 'text' },
        { name: '🎉︱célébrations',      type: 'text' },
      ]},
    ],
  },
};

function getTemplate(name) {
  return TEMPLATES[String(name || '').toLowerCase()] || null;
}

function listTemplateNames() {
  return Object.keys(TEMPLATES);
}

function summarize(tpl) {
  if (!tpl) return null;
  const cats = tpl.categories.length;
  const chans = tpl.categories.reduce((s, c) => s + (c.channels?.length || 0), 0);
  return { cats, chans };
}

module.exports = { TEMPLATES, getTemplate, listTemplateNames, summarize };
