'use strict';

// ═══════════════════════════════════════════════
// SOC DASHBOARD RENDERER — Defense Grid 2A
// Fonction PURE : state → Buffer PNG (1000×520). Aucune logique métier,
// aucun fetch — le state arrive prêt (core/soc-state.js).
// @napi-rs/canvas chargé en lazy + try/catch : si indisponible ou rendu
// en échec → null, l'appelant tombe sur le fallback pur-CV2. Jamais de crash.
// Budget temps surveillé : > RENDER_BUDGET_MS → warn console (le cache
// amont à 5 s évite tout rendu en boucle).
// ═══════════════════════════════════════════════

const { SOC_THEMES } = require('../theme');

const W = 1000, H = 520;
const RENDER_BUDGET_MS = 250;
const FONT = 'Consolas, "Courier New", monospace';

let _canvas = null;       // module @napi-rs/canvas
let _canvasChecked = false;

function _loadCanvas() {
  if (_canvasChecked) return _canvas;
  _canvasChecked = true;
  try { _canvas = require('@napi-rs/canvas'); }
  catch (err) {
    _canvas = null;
    console.warn('[soc-renderer] @napi-rs/canvas indisponible — fallback CV2 pur :', err.message);
  }
  return _canvas;
}

function isCanvasAvailable() { return !!_loadCanvas(); }

// ─── Primitives ──────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, T) {
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);
  // Grille subtile
  ctx.strokeStyle = T.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // Scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
}

function drawHeader(ctx, T, state, postureHex) {
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillStyle = T.accent;
  ctx.textAlign = 'left';
  ctx.fillText(state.opName.toUpperCase().slice(0, 34), 40, 48);

  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = T.muted;
  const ts = new Date(state.generatedAt).toLocaleString('fr-FR', { hour12: false });
  ctx.fillText(`MAJ ${ts}`, 40, 70);

  // Posture à droite
  ctx.textAlign = 'right';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = postureHex;
  ctx.fillText(`■ ${state.posture}`, W - 40, 48);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = T.muted;
  ctx.fillText(`DEFCON ${state.defconLabel}`, W - 40, 70);
  ctx.textAlign = 'left';
}

function drawPostureRing(ctx, T, state, postureHex) {
  const cx = 150, cy = 270, r = 85;
  // anneau fond
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 14;
  ctx.stroke();
  // arc de score — clamp à 99,99% : skia (@napi-rs/canvas) ne dessine PAS
  // un arc dont le sweep fait exactement 2π depuis -π/2 (vérifié par test pixel)
  const frac = Math.min(0.9999, Math.max(0.02, state.score / 100));
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.strokeStyle = postureHex;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
  // centre
  ctx.textAlign = 'center';
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillStyle = T.text;
  ctx.fillText(String(state.score), cx, cy + 8);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = T.muted;
  ctx.fillText('/100 SECURITY SCORE', cx, cy + 34);
  ctx.textAlign = 'left';
}

function drawDefconBar(ctx, T, state, postureHex) {
  const x0 = 62, y0 = 412, segW = 32, segH = 14, gap = 6;
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = T.muted;
  ctx.fillText('DEFCON', x0, y0 - 8);
  for (let i = 0; i < 5; i++) {
    const lit = i < state.defcon;
    roundRect(ctx, x0 + i * (segW + gap), y0, segW, segH, 3);
    ctx.fillStyle = lit ? (i >= 3 ? T.bad : postureHex) : T.panel;
    ctx.fill();
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawModuleGrid(ctx, T, state) {
  const x0 = 300, y0 = 110, cols = 3, cw = 218, ch = 56, gap = 10;
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = T.muted;
  ctx.fillText(`GRILLE DE COUVERTURE — ${state.activeCount}/${state.totalCount} ARMÉS`, x0, y0 - 14);

  state.modules.slice(0, 15).forEach((m, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = x0 + col * (cw + gap), y = y0 + row * (ch + gap);
    roundRect(ctx, x, y, cw, ch, 6);
    ctx.fillStyle = T.panel;
    ctx.fill();
    ctx.strokeStyle = m.enabled ? T.ok : T.border;
    ctx.lineWidth = m.enabled ? 1.5 : 1;
    ctx.stroke();
    // pastille
    ctx.beginPath();
    ctx.arc(x + 18, y + ch / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = m.enabled ? T.ok : T.bad;
    ctx.fill();
    if (m.enabled) { // halo armé
      ctx.beginPath();
      ctx.arc(x + 18, y + ch / 2, 10, 0, Math.PI * 2);
      ctx.strokeStyle = T.ok + '44';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = m.enabled ? T.text : T.muted;
    ctx.fillText(m.label.toUpperCase().slice(0, 22), x + 34, y + 24);
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = m.enabled ? T.ok : T.muted;
    ctx.fillText(m.enabled ? 'ARMÉ' : 'DÉSARMÉ', x + 34, y + 42);
  });
}

function drawSparkline(ctx, T, state, postureHex) {
  const x0 = 300, y0 = 452, w = 656, h = 44;
  const max = Math.max(1, ...state.incidents24h);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = T.muted;
  ctx.fillText(`INCIDENTS 24H — ${state.incidents24h.reduce((a, b) => a + b, 0)}`, x0, y0 - 8);
  const bw = Math.floor(w / 24) - 3;
  state.incidents24h.forEach((n, i) => {
    const bh = n === 0 ? 2 : Math.max(4, Math.round((n / max) * h));
    const x = x0 + i * (bw + 3), y = y0 + h - bh;
    ctx.fillStyle = n === 0 ? T.border : (n === max && max > 2 ? T.bad : postureHex);
    ctx.fillRect(x, y, bw, bh);
  });
}

function drawThreatCounter(ctx, T, state) {
  const x = 62, y = 470;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillStyle = T.text;
  ctx.fillText(String(state.blockedTotal), x, y);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = T.muted;
  ctx.fillText('MENACES BLOQUÉES', x, y + 18);
}

// ─── Entrée publique ─────────────────────────────────────────────────────────

/**
 * Rend le dashboard SOC en PNG.
 * @param {object} state - produit par core/soc-state.buildSocState()
 * @returns {?Buffer} null si canvas indisponible ou rendu en échec
 */
function renderDashboard(state) {
  const canvas = _loadCanvas();
  if (!canvas) return null;

  const t0 = Date.now();
  try {
    const T = SOC_THEMES[state.themeKey] ?? SOC_THEMES.red_alert;
    // L'anneau et les éléments vivants suivent la POSTURE (sémantique),
    // le thème ne fournit que la déco.
    const postureHex = `#${state.postureColor.toString(16).padStart(6, '0').toUpperCase()}`;

    const cv = canvas.createCanvas(W, H);
    const ctx = cv.getContext('2d');

    drawBackground(ctx, T);
    drawHeader(ctx, T, state, postureHex);
    drawPostureRing(ctx, T, state, postureHex);
    drawDefconBar(ctx, T, state, postureHex);
    drawThreatCounter(ctx, T, state);
    drawModuleGrid(ctx, T, state);
    drawSparkline(ctx, T, state, postureHex);

    // cadre extérieur
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    const buf = cv.toBuffer('image/png');
    const ms = Date.now() - t0;
    if (ms > RENDER_BUDGET_MS) {
      console.warn(`[soc-renderer] rendu lent : ${ms}ms (budget ${RENDER_BUDGET_MS}ms)`);
    }
    return buf;
  } catch (err) {
    console.error('[soc-renderer] échec rendu — fallback CV2 :', err.message);
    return null;
  }
}

module.exports = { renderDashboard, isCanvasAvailable, W, H, RENDER_BUDGET_MS };
