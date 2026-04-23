'use strict';

let cachedToken = null;
let tokenExpiresAt = 0;

function hasCredentials() {
  return !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
}

async function getAppToken() {
  if (!hasCredentials()) {
    throw new Error('TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET requis dans .env');
  }
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(`Twitch OAuth KO: ${res.status}`);
  }
  const json = await res.json();
  cachedToken = json.access_token;
  tokenExpiresAt = now + (json.expires_in || 3600) * 1000;
  return cachedToken;
}

async function getUserByLogin(login) {
  if (!hasCredentials()) {
    throw new Error('TWITCH_CLIENT_ID manquant.');
  }
  const token = await getAppToken();
  const url = `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login.toLowerCase())}`;
  const res = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Twitch users KO: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) && json.data[0] ? json.data[0] : null;
}

async function getStreamsByUserIds(ids) {
  if (!hasCredentials()) {
    throw new Error('TWITCH_CLIENT_ID manquant.');
  }
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const token = await getAppToken();
  const params = ids.slice(0, 100).map(id => `user_id=${encodeURIComponent(id)}`).join('&');
  const url = `https://api.twitch.tv/helix/streams?${params}`;
  const res = await fetch(url, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Twitch streams KO: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

module.exports = {
  hasCredentials,
  getAppToken,
  getUserByLogin,
  getStreamsByUserIds,
};
