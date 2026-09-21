// Procedural "traffic camera" evidence artwork. Single source of truth for the
// street frame shown on the landing page and inside the 3D evidence prism.
// No photographic assets, no identifiable people, no download surface.
// Deterministic for a given seed so textures are stable across renders.

export const EVIDENCE_W = 1024;
export const EVIDENCE_H = 768;

function rand(seed) {
  // Mulberry32 — deterministic pseudo-random noise per seed.
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

function horizonY(h) {
  return h * 0.46;
}

export function drawEvidence(ctx, w, h, { seed = 7, blur = 0 } = {}) {
  const rng = rand(seed);
  const W = w;
  const H = h;
  const hy = horizonY(H);

  if (blur > 0) {
    ctx.filter = `blur(${blur}px)`;
  }

  // Cool off-white sky, warm distant haze.
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, "#d7dad3");
  sky.addColorStop(1, "#e6e4d8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hy);

  // Distant tree line / roadside band.
  ctx.fillStyle = "#b7b9a6";
  ctx.fillRect(0, hy - 26, W, 30);
  ctx.fillStyle = "#9aa089";
  ctx.beginPath();
  for (let x = -20; x < W + 40; x += 46) {
    const hgt = 22 + rng() * 26;
    ctx.rect(x + rng() * 20, hy - 26 - hgt, 26, hgt + 26);
  }
  ctx.fill();

  // Asphalt plane below the horizon.
  const road = ctx.createLinearGradient(0, hy - 2, 0, H);
  road.addColorStop(0, "#9d9d92");
  road.addColorStop(1, "#76766c");
  ctx.fillStyle = road;
  ctx.fillRect(0, hy - 6, W, H - hy + 6);

  // Road shoulders.
  ctx.fillStyle = "#8b8b80";
  ctx.beginPath();
  ctx.moveTo(0, hy);
  ctx.lineTo(W * 0.18, hy + 26);
  ctx.lineTo(W * 0.18, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, hy);
  ctx.lineTo(W * 0.82, hy + 26);
  ctx.lineTo(W * 0.82, H);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  // Lane markings with perspective.
  ctx.strokeStyle = "rgba(240,238,222,0.85)";
  ctx.lineWidth = 4;
  const lines = 6;
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const y = hy + 30 + t * (H - hy - 30);
    const spread = 90 + t * 300;
    const cx = W / 2;
    for (const side of [-1, 1]) {
      // Outer dashed edges.
      ctx.beginPath();
      ctx.moveTo(cx + side * 150 - spread * 0.35, y);
      ctx.lineTo(cx + side * 170 - spread * 0.6, y + 86);
      ctx.lineWidth = 3 + t * 5;
      ctx.strokeStyle = "rgba(238,236,222,0.7)";
      ctx.stroke();
    }
    // Centre dashed line.
    ctx.beginPath();
    ctx.moveTo(cx - spread * 0.04, y);
    ctx.lineTo(cx + spread * 0.02, y + 92);
    ctx.lineWidth = 4 + t * 6;
    ctx.strokeStyle = "rgba(232,222,178,0.95)";
    ctx.setLineDash([26, 40]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // A street vehicle with rider + helmet near the centre of frame.
  drawVehicle(ctx, W, H, rng);

  // Ambient shading under the vehicle.
  const under = ctx.createRadialGradient(W * 0.5, H * 0.62, 10, W * 0.5, H * 0.62, 240);
  under.addColorStop(0, "rgba(30,30,34,0.28)");
  under.addColorStop(1, "rgba(30,30,34,0)");
  ctx.fillStyle = under;
  ctx.fillRect(0, 0, W, H);

  // Sensor grain.
  ctx.fillStyle = "rgba(40,40,48,0.05)";
  for (let i = 0; i < 2400; i++) {
    ctx.fillRect(rng() * W, rng() * H, 1.5, 1.5);
  }

  // Vignette.
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.85);
  vig.addColorStop(0, "rgba(20,22,26,0)");
  vig.addColorStop(1, "rgba(20,22,26,0.34)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Camera metadata chrome.
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "500 22px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("SECTOR 04 · CAM 17", 42, H - 54);
  ctx.fillText("14:32:05 +0530", 42, H - 26);
  ctx.textAlign = "right";
  ctx.fillText("SAFE_CITY", W - 42, H - 54);
  ctx.textAlign = "left";

  // Rec light.
  ctx.fillStyle = "#c2431f";
  ctx.beginPath();
  ctx.arc(62, 84, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(194,67,31,0.28)";
  ctx.beginPath();
  ctx.arc(62, 84, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 22px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("REC", 84, 84);

  ctx.filter = "none";
}

function drawVehicle(ctx, W, H, _rng) {
  // Rider sits around frame centre; the bike leans slightly right.
  const cx = W * 0.52;
  const cy = H * 0.66;
  const scale = 1.15;

  // Tyres.
  ctx.fillStyle = "#1d1f22";
  for (const [tx, ty] of [
    [cx - 46 * scale, cy + 26 * scale],
    [cx + 58 * scale, cy + 22 * scale],
  ]) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, 40 * scale, 40 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#33373c";
    ctx.beginPath();
    ctx.ellipse(tx, ty, 24 * scale, 24 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d1f22";
  }

  // Body.
  ctx.fillStyle = "#39406b";
  roundRect(ctx, cx - 34 * scale, cy - 30 * scale, 118 * scale, 40 * scale, 18 * scale);
  ctx.fill();
  // Tank highlight.
  ctx.fillStyle = "#4a5286";
  roundRect(ctx, cx - 8 * scale, cy - 26 * scale, 46 * scale, 32 * scale, 10 * scale);
  ctx.fill();

  // Stem + handlebars.
  ctx.strokeStyle = "#25282c";
  ctx.lineWidth = 8 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 6 * scale, cy - 26 * scale);
  ctx.lineTo(cx + 10 * scale, cy - 92 * scale);
  ctx.stroke();
  ctx.lineWidth = 10 * scale;
  ctx.beginPath();
  ctx.moveTo(cx - 18 * scale, cy - 100 * scale);
  ctx.lineTo(cx + 44 * scale, cy - 88 * scale);
  ctx.stroke();

  // Rider torso (jacket).
  ctx.fillStyle = "#3f5c6b";
  roundRect(ctx, cx + 30 * scale, cy - 128 * scale, 40 * scale, 74 * scale, 16 * scale);
  ctx.fill();

  // Head.
  ctx.fillStyle = "#c9b293";
  ctx.beginPath();
  ctx.arc(cx + 50 * scale, cy - 140 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Helmet over the head.
  ctx.fillStyle = "#e7ece9";
  ctx.beginPath();
  ctx.arc(cx + 50 * scale, cy - 140 * scale, 26 * scale, Math.PI * 0.95, Math.PI * 2.02 - 0.2);
  ctx.fill();
  ctx.fillStyle = "#d3d9d5";
  roundRect(ctx, cx + 34 * scale, cy - 142 * scale, 34 * scale, 16 * scale, 8 * scale);
  ctx.fill();
  // Helmet stripe.
  ctx.strokeStyle = "#33507f";
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.arc(cx + 50 * scale, cy - 140 * scale, 27 * scale, Math.PI * 0.7, Math.PI * 1.7);
  ctx.stroke();

  // Arm to handlebar.
  ctx.strokeStyle = "#37464f";
  ctx.lineWidth = 11 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 34 * scale, cy - 96 * scale);
  ctx.lineTo(cx + 6 * scale, cy - 112 * scale);
  ctx.lineTo(cx + 8 * scale, cy - 128 * scale);
  ctx.stroke();

  // Rear plate.
  ctx.fillStyle = "#f4f4ef";
  roundRect(ctx, cx - 46 * scale, cy - 12 * scale, 26 * scale, 34 * scale, 4 * scale);
  ctx.fill();
  ctx.fillStyle = "#2c3a63";
  ctx.font = "600 20px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText("KA", cx - 39 * scale, cy + 3 * scale);
}

/**
 * @param {{ seed?: number, blur?: number, size?: number }} [options]
 * @returns {{ url: string, w: number, h: number }}
 */
export function evidenceImage({ seed = 7, blur = 0, size = 1 } = {}) {
  const w = Math.round(EVIDENCE_W * size);
  const h = Math.round(EVIDENCE_H * size);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  drawEvidence(ctx, w, h, { seed, blur });
  return { url: canvas.toDataURL("image/png"), w, h };
}

export function evidenceCanvas({ seed = 7, size = 1 } = {}) {
  const w = Math.round(EVIDENCE_W * size);
  const h = Math.round(EVIDENCE_H * size);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  drawEvidence(ctx, w, h, { seed });
  return canvas;
}