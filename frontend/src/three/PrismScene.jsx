// The ChallanCheck "evidence prism": one composed object that evolves as the
// page scrolls. The story is
//   evidence enters -> observation markers -> CLAIM / EVIDENCE / OBSERVATION
//   separate -> a structured data layer -> a deterministic rule engine ->
//   a single result -> the assembled pipeline CLAIM..EVALUATION -> RESULT.
// Pure procedural geometry (boxes/planes/torus) plus canvas-painted textures:
// no downloaded models, no external HDR, no network dependency.
//
// This scene is rendered directly with THREE.WebGLRenderer (a plain RAF loop)
// instead of @react-three/fiber so the output is fully deterministic and
// verifiable in any browser. The 3D is only ever a visual layer: every beat is
// also stated in the HTML narrative (HeroStory). The canvas is aria-hidden.

import * as THREE from "three";
import { useEffect, useRef } from "react";
import { evidenceCanvas } from "../landing/evidenceArt.js";
import { labelPlate, stepArrow, railTexture } from "./labelTexture.js";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const ramp = (p, a, b) => smooth((p - a) / (b - a));
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = clamp01(x) - 1;
  return 1 + c3 * t * t * t + c1 * t * t;
};

function keyed(p, keys) {
  const f = clamp01(p) * (keys.length - 1);
  const i = Math.min(Math.floor(f), keys.length - 2);
  const t = smooth(f - i);
  const a = keys[i];
  const b = keys[i + 1];
  const out = {};
  for (const k in a) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

// Camera choreography across the 7 scroll beats.
const CAM_KEYS = [
  { p: 0.0, x: 0.75, y: 0.6, z: 7.6, tx: 0, ty: 0, tz: 0 },
  { p: 0.16, x: 0.45, y: 0.85, z: 6.2, tx: 0, ty: 0, tz: 0 },
  { p: 0.3, x: -1.15, y: 1.3, z: 4.0, tx: -0.2, ty: 0.05, tz: 0 },
  { p: 0.46, x: -4.0, y: 1.6, z: 4.8, tx: -0.3, ty: 0.0, tz: 0 },
  { p: 0.62, x: 0.15, y: 2.7, z: 5.7, tx: 0, ty: -0.18, tz: 0 },
  { p: 0.76, x: 4.6, y: 1.35, z: 4.6, tx: -0.55, ty: 0, tz: 0 },
  { p: 0.9, x: 0.15, y: 1.25, z: 3.3, tx: 0.85, ty: 0.05, tz: 0.3 },
  { p: 1.0, x: 0.85, y: 1.0, z: 8.0, tx: 0, ty: 0, tz: 0 },
];

const COBALT = "#2b46b8";
const COBALT_DEEP = "#1d2f86";
const ORANGE = "#b4531e";
const INK = "#1a1d24";
const PAPER = "#fbfaf6";
const PAPER_DEEP = "#f2efe8";
const MUTED = "#6b7280";

let roadTexture = null;
function getRoadTexture() {
  if (!roadTexture) {
    const canvas = evidenceCanvas({ seed: 7, size: 0.5 });
    roadTexture = new THREE.CanvasTexture(canvas);
    roadTexture.anisotropy = 4;
    roadTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return roadTexture;
}

/** Soft studio backdrop: a cool cobalt radial with a faint warm lower-left
    blush, painted once to a canvas. Sitting far behind the rig (and the CSS
    glow that surrounds it), it turns the empty hero field into a lit set
    instead of floating geometry. Static, transparent-edged, depthWrite off. */
function buildBackdrop() {
  const W = 512;
  const H = 288;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const cool = ctx.createRadialGradient(W * 0.58, H * 0.4, 16, W * 0.52, H * 0.42, H * 0.68);
  cool.addColorStop(0, "rgba(96,124,228,0.16)");
  cool.addColorStop(0.45, "rgba(43,70,184,0.09)");
  cool.addColorStop(1, "rgba(43,70,184,0)");
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, W, H);
  const warm = ctx.createRadialGradient(W * 0.24, H * 0.86, 10, W * 0.24, H * 0.84, W * 0.46);
  warm.addColorStop(0, "rgba(180,83,30,0.07)");
  warm.addColorStop(1, "rgba(180,83,30,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 17),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.position.set(0.6, 0.1, -9);
  return { mesh, tex, geo: mesh.geometry, mat: mesh.material };
}

/** Soft elliptical ground shadow (replaces a live shadow pass). */
function buildShadow() {
  const c = document.createElement("canvas");
  const SZ = 256;
  c.width = SZ;
  c.height = SZ;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(SZ / 2, SZ / 2, 8, SZ / 2, SZ / 2, SZ / 2);
  g.addColorStop(0, "rgba(20,22,26,0.42)");
  g.addColorStop(0.55, "rgba(20,22,26,0.2)");
  g.addColorStop(1, "rgba(20,22,26,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SZ, SZ);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 1.5),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, tex, geo: mesh.geometry, mat: mesh.material };
}

/** A textured quad. */
function quad({ texture, aspect, worldH, position = [0, 0, 0], rotation = [0, 0, 0], opacity = 1, useBasic = false }) {
  const mat =
    useBasic || false
      ? new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, opacity })
      : new THREE.MeshStandardMaterial({ map: texture, transparent: true, toneMapped: false, opacity });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldH * aspect, worldH), mat);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  return { mesh, geo: mesh.geometry, mat };
}

function buildFrame() {
  const road = getRoadTexture();
  const group = new THREE.Group();
  const mats = [];

  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.95),
    new THREE.MeshStandardMaterial({ map: road, roughness: 0.35, transparent: true }),
  );
  photo.position.set(0, 0, -0.02);
  mats.push(photo.material);
  group.add(photo);

  [
    { pos: [0, 0.985, 0], args: [2.94, 0.17, 0.17] },
    { pos: [0, -0.985, 0], args: [2.94, 0.17, 0.17] },
    { pos: [1.385, 0, 0], args: [0.17, 1.97, 0.17] },
    { pos: [-1.385, 0, 0], args: [0.17, 1.97, 0.17] },
  ].forEach((b) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.args), new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.5, transparent: true }));
    mesh.position.set(...b.pos);
    mats.push(mesh.material);
    group.add(mesh);
  });

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.62, 1.97),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.08, metalness: 0.1, transparent: true }),
  );
  glass.position.set(0, 0, 0.1);
  glass.material.opacity = 0.06;
  mats.push(glass.material);
  group.add(glass);

  const update = (S) => {
    group.position.set(0.35 * S.separateT - 0.05 * S.dataT, Math.sin(S.time * 0.7) * 0.06 - 0.1 * S.dataT, 0.3 * S.separateT + 0.6 * S.ruleT);
    group.rotation.y = -0.14 * S.separateT + 0.08 * S.ruleT;
    const sc = 1 - 0.2 * S.separateT - 0.55 * S.dataT;
    group.scale.setScalar(Math.max(0.0001, sc));
    group.visible = S.frameOpacity > 0.02;
    for (const m of mats) {
      m.opacity = S.frameOpacity;
      m.visible = S.frameOpacity > 0.02;
    }
  };

  return { group, update, dispose: () => {
    [photo, glass].forEach((m) => m.geometry.dispose());
    mats.forEach((m) => m.dispose());
  } };
}

function buildMarkers() {
  const group = new THREE.Group();
  const tags = [
    { lines: ["VEHICLE"], ring: [0.42, -0.38, 0.16], r: 0.34, tag: [-1.05, 1.12, 0.22], h: 0.16, key: "MT_VEHICLE" },
    { lines: ["HELMET"], ring: [-0.18, 0.5, 0.16], r: 0.2, tag: [0.68, 1.16, 0.22], h: 0.16, key: "MT_HELMET" },
    { lines: ["PLATE"], ring: [-0.82, -0.3, 0.16], r: 0.2, tag: [1.1, 0.95, 0.22], h: 0.16, key: "MT_PLATE" },
    { lines: ["PEOPLE"], ring: [-0.32, -0.95, 0.16], r: 0.22, tag: [-1.28, -0.62, 0.22], h: 0.16, key: "MT_PEOPLE" },
  ];
  const parts = tags.map(({ lines, ring, r, tag, h, key }) => {
    const label = labelPlate({ key, lines, bg: "#ffffff", ink: COBALT, outline: true });
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012, 8, 48),
      new THREE.MeshStandardMaterial({ color: COBALT, transparent: true, opacity: 0.85, toneMapped: false }),
    );
    ringMesh.position.set(ring[0], ring[1], ring[2]);
    const stem = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.016),
      new THREE.MeshStandardMaterial({ color: COBALT, transparent: true, opacity: 0.4, toneMapped: false }),
    );
    stem.position.set((ring[0] + tag[0]) / 2, (ring[1] + tag[1]) / 2, 0.19);
    stem.rotation.z = Math.atan2(tag[1] - ring[1], tag[0] - ring[0]);
    const plate = quad({ texture: label.texture, aspect: label.aspect, worldH: h, position: tag, opacity: 0.97 });
    const g = new THREE.Group();
    g.add(ringMesh, stem, plate.mesh);
    group.add(g);
    return [ringMesh, stem, plate];
  });

  const update = (S) => {
    group.visible = S.markersT > 0.01;
    group.scale.setScalar(0.82 + S.markersT * 0.18);
  };
  const dispose = () => parts.forEach(([, s, p]) => {
    s.geometry.dispose();
    s.material.dispose();
    p.geo.dispose();
    p.mat.dispose();
  });
  return { group, update, dispose };
}

function buildSeparation() {
  const labels = {
    claim: labelPlate({ key: "SEP_CLAIM2", lines: ["CLAIM", "Riding without seatbelt"], bg: PAPER, accent: COBALT_DEEP, ink: INK }),
    obs: labelPlate({ key: "SEP_OBS", lines: ["OBSERVATION", "facts, with doubt intact"], bg: PAPER, accent: COBALT, ink: INK }),
    evi: labelPlate({ key: "SEP_EVI", lines: ["EVIDENCE", "source photograph"], bg: PAPER_DEEP, accent: COBALT, ink: INK }),
    arrow: stepArrow({ key: "SEP_ARROW" }),
  };
  const claim = quad({ texture: labels.claim.texture, aspect: labels.claim.aspect, worldH: 0.78, position: [0, 0.15, 0.3] });
  const observe = quad({ texture: labels.obs.texture, aspect: labels.obs.aspect, worldH: 0.78, position: [0, 0.2, -0.1] });
  const evidence = quad({ texture: labels.evi.texture, aspect: labels.evi.aspect, worldH: 0.34, position: [0, -1.45, 0.3] });
  const arrowL = quad({ texture: labels.arrow.texture, aspect: labels.arrow.aspect, worldH: 0.23, position: [-1.32, 0.15, 0.3], useBasic: true });
  const arrowR = quad({ texture: labels.arrow.texture, aspect: labels.arrow.aspect, worldH: 0.23, position: [1.32, 0.15, 0.08], useBasic: true });
  const group = new THREE.Group();
  group.add(claim.mesh, observe.mesh, evidence.mesh, arrowL.mesh, arrowR.mesh);
  const all = [claim, observe, evidence, arrowL, arrowR];

  const update = (S) => {
    const t = S.separateT;
    const fade = t * (1 - S.dataT);
    const delayed = smooth((t - 0.12) / 0.88);
    const scl = (v) => 0.62 + 0.38 * smooth((v - 0.1) / 0.9);
    claim.mesh.position.x = -2.5 * t;
    observe.mesh.position.x = 2.5 * t;
    evidence.mesh.position.x = -1.05 * t;
    claim.mesh.scale.setScalar(scl(t));
    observe.mesh.scale.setScalar(scl(delayed));
    evidence.mesh.scale.setScalar(scl(t));
    claim.mesh.visible = fade > 0.01;
    observe.mesh.visible = fade > 0.01;
    evidence.mesh.visible = S.frameOpacity > 0.1 && fade > 0.01;
    arrowL.mesh.scale.setScalar(fade * scl(t));
    arrowR.mesh.scale.setScalar(fade * scl(delayed));
    arrowL.mesh.visible = fade > 0.01;
    arrowR.mesh.visible = fade > 0.01;
    for (const q of all) {
      q.mat.opacity = fade;
      q.mat.visible = fade > 0.01;
    }
  };
  const dispose = () => all.forEach((q) => { q.geo.dispose(); q.mat.dispose(); });
  return { group, update, dispose };
}

function buildDataLayer() {
  const cells = [
    { key: "D_VEH", lines: ["VEHICLE · CAR"], accent: COBALT, pos: [-0.98, 0.86, 0] },
    { key: "D_CONF", lines: ["CONFIDENCE · 95%"], accent: COBALT_DEEP, pos: [0.98, 0.86, 0.02] },
    { key: "D_HELMET", lines: ["HELMET · NOT VISIBLE"], accent: COBALT, pos: [-0.98, 0.08, 0.04] },
    { key: "D_PEOPLE", lines: ["PEOPLE · 1"], accent: COBALT, pos: [0.98, 0.08, 0] },
    { key: "D_Q", lines: ["IMAGE QUALITY · GOOD"], accent: COBALT_DEEP, pos: [-0.98, -0.7, 0.02] },
    { key: "D_UNC", lines: ["UNCERTAINTY · LOW"], accent: ORANGE, pos: [0.98, -0.7, 0.04] },
  ];
  const group = new THREE.Group();
  const chips = cells.map((c) => {
    const label = labelPlate({ key: c.key, lines: c.lines, bg: "#ffffff", accent: c.accent, ink: INK });
    const q = quad({ texture: label.texture, aspect: label.aspect, worldH: 0.34, position: c.pos });
    group.add(q.mesh);
    return q;
  });
  group.visible = false;

  const update = (S) => {
    const t = S.dataT;
    group.visible = t > 0.01;
    chips.forEach((q, i) => {
      const ci = cells[i];
      const local = smooth((t * 1.5 - i * 0.16) / 0.8);
      q.mesh.position.y = ci.pos[1] + (1 - local) * 1.7;
      q.mesh.scale.setScalar(0.5 + 0.5 * local);
      q.mesh.visible = t > 0.01;
      q.mat.opacity = t * local;
      q.mat.visible = t * local > 0.01;
    });
  };
  const dispose = () => chips.forEach((q) => { q.geo.dispose(); q.mat.dispose(); });
  return { group, update, dispose };
}

function buildConveyor() {
  const group = new THREE.Group();
  const n = 9;
  const dots = Array.from({ length: n }).map(() => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.067, 12, 12),
      new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.35, transparent: true }),
    );
    m.visible = false;
    group.add(m);
    return m;
  });
  const update = (S) => {
    const t = S.ruleT;
    dots.forEach((d, i) => {
      const f = (S.time * 0.35 + i / n) % 1;
      d.position.set(-1.3 + 2.6 * f, 0.75 - Math.sin(f * Math.PI) * 1.05, 0.35);
      d.scale.setScalar(0.6 + 0.6 * Math.sin(f * Math.PI));
      d.visible = t > 0.01 && S.dataT > 0.4;
      d.material.opacity = Math.min(1, t);
    });
  };
  const dispose = () => dots.forEach((d) => { d.geometry.dispose(); d.material.dispose(); });
  return { group, update, dispose };
}

function buildRuleEngine() {
  const labels = {
    engine: labelPlate({ key: "RULE_ENGINE", lines: ["RULE ENGINE", "WITHOUT_HELMET"], bg: PAPER_DEEP, accent: COBALT_DEEP, ink: INK }),
    cap: labelPlate({ key: "RULE_CAP", lines: ["deterministic · application code"], bg: "#ffffff", ink: MUTED }),
  };
  const body = quad({ texture: labels.engine.texture, aspect: labels.engine.aspect, worldH: 1.05, position: [0, 0.15, 0.45] });
  const caption = quad({ texture: labels.cap.texture, aspect: labels.cap.aspect, worldH: 0.26, position: [0, -0.9, 0.3] });
  caption.mesh.visible = false;
  const group = new THREE.Group();
  group.add(body.mesh, caption.mesh);
  group.visible = false;

  const update = (S) => {
    const t = S.ruleT;
    const v = t > 0.01 && S.dataT > 0.2;
    group.visible = v;
    body.mesh.scale.setScalar(0.4 + 0.6 * smooth((t - 0.08) / 0.92));
    body.mat.opacity = t;
    caption.mesh.visible = t > 0.15;
    caption.mat.opacity = smooth((t - 0.15) / 0.7);
    caption.mesh.position.y = -0.92 * smooth((t - 0.15) / 0.7);
  };
  const dispose = () => { body.geo.dispose(); body.mat.dispose(); caption.geo.dispose(); caption.mat.dispose(); };
  return { group, update, dispose };
}

function buildResult() {
  const labels = {
    badge: labelPlate({
      key: "RES_BADGE",
      lines: ["INSUFFICIENT EVIDENCE"],
      bg: ORANGE,
      ink: "#ffffff",
      accentRight: "rgba(255,255,255,0.28)",
      colors: ["#ffffff"],
    }),
    cap: labelPlate({ key: "RES_CAP", lines: ["the engine does not guess"], bg: "#ffffff", ink: MUTED }),
  };
  const badge = quad({ texture: labels.badge.texture, aspect: labels.badge.aspect, worldH: 1.05, position: [0, 0.15, 0.6] });
  const caption = quad({ texture: labels.cap.texture, aspect: labels.cap.aspect, worldH: 0.26, position: [0, -1.0, 0.8] });
  caption.mesh.visible = false;
  const group = new THREE.Group();
  group.add(badge.mesh, caption.mesh);
  group.visible = false;

  const update = (S) => {
    const t = S.resultT;
    const v = t > 0.01;
    group.visible = v;
    group.scale.setScalar(v ? 0.5 + 0.5 * easeOutBack(t) : 0.001);
    badge.mat.opacity = t;
    caption.mesh.visible = t > 0.12;
    caption.mat.opacity = smooth((t - 0.12) / 0.6);
    caption.mesh.position.y = -1.05 * smooth((t - 0.12) / 0.6);
  };
  const dispose = () => { badge.geo.dispose(); badge.mat.dispose(); caption.geo.dispose(); caption.mat.dispose(); };
  return { group, update, dispose };
}

function buildPipeline() {
  const bits = [
    { key: "PIPE_CLAIM", lines: ["CLAIM"], a: COBALT_DEEP },
    { key: "PIPE_EVI", lines: ["EVIDENCE"], a: COBALT },
    { key: "PIPE_OBS", lines: ["OBSERVATION"], a: COBALT },
    { key: "PIPE_EVAL", lines: ["EVALUATION"], a: COBALT },
    { key: "PIPE_RES", lines: ["RESULT"], a: ORANGE, w: "#ffffff", bg: ORANGE },
  ];
  const group = new THREE.Group();
  const rail = railTexture({ key: "RAIL" });
  const railMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 3.6),
    new THREE.MeshBasicMaterial({ map: rail.texture, transparent: true, opacity: 0.55, toneMapped: false }),
  );
  railMesh.position.set(0, 0, -0.6);
  group.add(railMesh);
  const parts = bits.map((b, i) => {
    const label = labelPlate({ key: b.key, lines: b.lines, bg: b.bg ?? "#ffffff", ink: b.w ?? INK, accent: b.a });
    const q = quad({ texture: label.texture, aspect: label.aspect, worldH: 0.52, position: [0, 1.28 - i * 0.7, 0] });
    group.add(q.mesh);
    return q;
  });
  group.visible = false;

  const update = (S) => {
    const t = S.assembleT;
    const v = t > 0.01;
    group.visible = v;
    if (!v) return;
    parts.forEach((q, i) => {
      const local = smooth((t * 1.6 - i * 0.1) / 0.9);
      q.mesh.position.y = 1.28 - i * 0.7 + (1 - local) * -2.6;
      q.mesh.position.z = (i - 2) * 0.22 * local;
      q.mesh.rotation.y = (i - 2) * 0.24 * local;
      q.mesh.scale.setScalar(0.55 + 0.45 * local);
      q.mat.opacity = t * local;
    });
  };
  const dispose = () => { railMesh.geometry.dispose(); railMesh.material.dispose(); parts.forEach((q) => { q.geo.dispose(); q.mat.dispose(); }); };
  return { group, update, dispose };
}

function PrismScene({ driver, poster = false, compact = false, frameloop = "always" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const floatRig = new THREE.Group();
    const rig = new THREE.Group();
    floatRig.add(rig);
    scene.add(floatRig);

    const built = [
      buildFrame(),
      buildMarkers(),
      buildSeparation(),
      buildDataLayer(),
      buildConveyor(),
      buildRuleEngine(),
      buildResult(),
      buildPipeline(),
    ];
    built.forEach((b) => rig.add(b.group));

    const backdrop = buildBackdrop();
    scene.add(backdrop.mesh);

    const shadow = buildShadow();
    scene.add(shadow.mesh);

    scene.add(new THREE.HemisphereLight("#ffffff", "#d9d6cc", compact ? 0.5 : 0.55));
    scene.add(new THREE.AmbientLight(0xffffff, compact ? 0.35 : 0.3));
    const key = new THREE.DirectionalLight("#fffdf6", 1.75);
    key.position.set(3.2, 4.4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#dfe8ff", 0.45);
    rim.position.set(-4, 2.2, -3);
    scene.add(rim);
    const street = new THREE.DirectionalLight("#ffcf9e", 0.32);
    street.position.set(-2.6, -0.6, 3.4);
    scene.add(street);
    const fill = new THREE.PointLight("#ffffff", 0.35);
    fill.position.set(0, 3.4, 4);
    scene.add(fill);

    const S = { p: 0, time: 0, enterT: 0, markersT: 0, separateT: 0, dataT: 0, ruleT: 0, resultT: 0, assembleT: 0, frameOpacity: 0 };
    const pointer = { x: 0, y: 0 };
    let lastP = -1;

    function sized() {
      const parent = canvas.parentElement || canvas;
      const w = Math.max(1, parent.clientWidth || canvasWidth);
      const h = Math.max(1, parent.clientHeight || canvasHeight);
      const cap = poster ? 1.5 : compact ? 1.5 : 1.75;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(dpr);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    let canvasWidth = 1;
    let canvasHeight = 1;
    const ro = new ResizeObserver(() => sized());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    sized();

    function tick(now) {
      const raw = driver.current;
      const v = typeof raw === "number" ? raw : typeof raw?.p === "number" ? raw.p : 0;
      S.p = poster ? 1 : clamp01(v);
      S.time = now / 1000;

      S.enterT = ramp(S.p, 0, 0.08);
      S.markersT = ramp(S.p, 0.15, 0.24) * (1 - ramp(S.p, 0.32, 0.4));
      S.separateT = ramp(S.p, 0.3, 0.46);
      S.dataT = ramp(S.p, 0.46, 0.62);
      S.ruleT = ramp(S.p, 0.62, 0.76);
      S.resultT = ramp(S.p, 0.76, 0.9);
      S.assembleT = ramp(S.p, 0.9, 1);
      S.frameOpacity = S.enterT * (1 - S.dataT) * (1 - S.assembleT);

      const k = keyed(poster ? 1 : S.p, CAM_KEYS);
      const sc = compact ? 0.8 : 1;
      camera.fov = 38 - 4 * S.dataT;
      camera.position.set(k.x * sc, k.y * sc + (poster ? 0 : Math.sin(S.time * 0.5) * 0.05), k.z * sc);
      camera.lookAt(k.tx, k.ty, k.tz);
      camera.updateProjectionMatrix();

      floatRig.position.y = Math.sin(S.time * 0.6) * (poster ? 0.04 : 0.07);
      floatRig.rotation.z = Math.sin(S.time * 0.3) * 0.015;

      const targetY = clamp01(1 - S.enterT) * pointer.x * 0.16;
      rig.rotation.y += (targetY - rig.rotation.y) * Math.min(1, 3 * (now - (tick._last || now)) / 1000);
      rig.position.x = poster ? (compact ? 0 : 0.6) : compact ? 0.18 : 1.0;
      rig.position.y = compact && !poster ? 0.5 : 0;
      rig.scale.setScalar(compact ? 0.76 : 1);

      for (const b of built) b.update(S, S.time);
      shadow.mesh.position.set(poster ? 0 : compact ? 0.45 : 1.0, compact ? -1.15 : -1.6, 0);
      shadow.mat.opacity = poster ? 0.38 : 0.42;

      renderer.render(scene, camera);
      tick._last = now;
    }
    tick._last = 0;

    const onPointer = (e) => {
      pointer.x = e.clientX / Math.max(1, window.innerWidth) * 2 - 1;
      pointer.y = e.clientY / Math.max(1, window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (frameloopRef.current === "always" || frameloopRef.current === undefined) {
        tick(now);
      } else if (Math.abs(S.p - lastP) > 0.002) {
        lastP = S.p;
        tick(now);
      }
    };
    const frameloopRef = { current: frameloop };
    // Render once immediately so "never" frames are drawn without waiting.
    tick(performance.now());
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      built.forEach((b) => b.dispose && b.dispose());
      backdrop.geo.dispose();
      backdrop.mat.dispose();
      shadow.geo.dispose();
      shadow.mat.dispose();
      renderer.dispose();
    };
  }, [driver, poster, compact, frameloop]);

  return <canvas ref={canvasRef} className="prism-canvas" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%", touchAction: "none" }} />;
}

export default PrismScene;