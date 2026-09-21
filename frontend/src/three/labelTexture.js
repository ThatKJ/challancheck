// Tiny canvas->texture helpers for the 3D scene. Everything is drawn locally:
// no font files, no fetch, nothing to cache-bust. Textures are cached by key so
// repeated chips reuse one GPU texture.

import * as THREE from "three";

const cache = new Map();

function texture(key, build) {
  if (cache.has(key)) return cache.get(key);
  const tex = build();
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const CHIP_H = 128;
const PAD = 44;

/**
 * A label plate: optional leading accent bar, an eyebrow line and a main line.
 * @param {object} o
 * @param {string} o.key
 * @param {string[]} o.lines  [eyebrow?, main] or [main]
 * @param {string} [o.ink]    main text colour
 * @param {string} [o.bg]     plate background
 * @param {string|null} [o.accent] left accent bar colour (mutually exclusive with o.accentRight)
 * @param {string|null} [o.accentRight] right accent chip colour
 * @param {string[]} [o.colors] per-line colour overrides
 * @param {boolean} [o.outline]
 * @returns {{texture: THREE.CanvasTexture, aspect: number}}
 */
export function labelPlate({ key, lines, ink = "#1a1d24", bg = "#fbfaf6", accent = null, accentRight = null, colors, outline = false }) {
  const font = "'JetBrains Mono', ui-monospace, monospace";
  const measure = document.createElement("canvas").getContext("2d");
  const textLines = lines.map((text, i) => ({
    text,
    font: i === 0 && lines.length > 1 ? `500 ${46}px ${font}` : `600 ${52}px ${font}`,
    color: colors?.[i] ?? ink,
    isEyebrow: i === 0 && lines.length > 1,
  }));
  const widths = textLines.map((l) => Math.ceil(measure.measureText(l.text).width + PAD * 2));
  const w = Math.max(...widths) + (accent ? 34 : 0);
  const h = textLines.length === 1 ? CHIP_H - 16 : CHIP_H + 26;
  const c = canvas(w, h);
  const ctx = c.getContext("2d");

  roundRect(ctx, 0, 0, w, h, 26);
  ctx.fillStyle = bg;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = "rgba(26,29,36,0.16)";
    ctx.lineWidth = 6;
    roundRect(ctx, 3, 3, w - 6, h - 6, 23);
    ctx.stroke();
  }

  if (accent) {
    roundRect(ctx, 10, 16, 16, h - 32, 8);
    ctx.fillStyle = accent;
    ctx.fill();
  }
  if (accentRight) {
    roundRect(ctx, w - 40, 16, 22, h - 32, 8);
    ctx.fillStyle = accentRight;
    ctx.fill();
  }

  ctx.save();
  ctx.textBaseline = "middle";
  let y = h / 2;
  if (textLines.length > 1) y = h / 2 - 20;
  for (const [i, l] of textLines.entries()) {
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    if (l.isEyebrow) ctx.globalAlpha = 0.6;
    const x = (w - ctx.measureText(l.text).width) / 2;
    ctx.fillText(l.text, x, i === 0 && textLines.length > 1 ? y : y + (textLines.length > 1 ? 44 : 0));
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const tex = texture(key, () => new THREE.CanvasTexture(c));
  return { texture: tex, aspect: w / h };
}

/** Simple arrow texture used between pipeline steps. */
export function stepArrow({ key, color = "#b9bdb4" } = {}) {
  const w = 220;
  const h = 110;
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(18, h / 2);
  ctx.lineTo(w - 26, h / 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(w - 34, h / 2 - 26);
  ctx.lineTo(w - 2, h / 2);
  ctx.lineTo(w - 34, h / 2 + 26);
  ctx.closePath();
  ctx.fill();
  const tex = texture(key, () => new THREE.CanvasTexture(c));
  return { texture: tex, aspect: w / h };
}

/** Thin vertical rail texture. */
export function railTexture({ key, color = "rgba(35,64,180,0.5)" }) {
  const w = 44;
  const h = 640;
  const c = canvas(w, h);
  const ctx = c.getContext("2d");
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.setLineDash([8, 16]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 12);
  ctx.lineTo(w / 2, h - 12);
  ctx.stroke();
  const tex = texture(key, () => new THREE.CanvasTexture(c));
  return { texture: tex, aspect: w / h };
}

/** Clear cached textures (used on unmount during tests / hot reload). */
export function clearTextureCache() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}