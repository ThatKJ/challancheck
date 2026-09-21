// Single source of truth for the recorded Amazon Rekognition DetectLabels run behind
// the landing page (ap-south-1, 2026-09-20, request 3b4b2574-7196-45e5-a9c6-c2b4113c7ed6;
// values and boxes from docs/CANONICAL_RUN.md section 2c, rekognitionAdapter.test.js).
// Every section that describes what was observed reads from here — nothing is invented
// at render time. The photograph itself is never shown; see evidenceFrame.js.
// Marker boxes are the reported bounding boxes scaled to a 400x300 frame.

export const MARKERS = [
  { id: "vehicle", label: "VEHICLE", value: "car · 99.7%", x: 60, y: 66, w: 301, h: 213 },
  { id: "driver", label: "PERSON", value: "97.4%", x: 137, y: 85, w: 54, h: 48 },
  { id: "plate", label: "LICENCE PLATE", value: "72.5%", x: 217, y: 212, w: 81, h: 21 },
];

export const LABEL_POS = {
  vehicle: { lx: 68, ly: 92, leader: "M84,84 L92,90" },
  driver: { lx: 202, ly: 90, leader: "M192,106 L200,102" },
  plate: { lx: 222, ly: 252, leader: "M256,234 L248,244" },
};

export const OBSERVATION_ROWS = [
  { id: "vehicle", k: "Vehicle", v: "car 99.7% · motorcycle 94.6%", short: "car · motorcycle", tone: "warn" },
  { id: "driver", k: "People", v: "4 detected · weakest 88.4%", short: "4 · min 88.4%", tone: "ok" },
  { id: "plate", k: "Licence plate", v: "visible · text not read", short: "visible", tone: "ok" },
  { id: "helmet", k: "Helmet", v: "not established", tone: "warn" },
  { id: "quality", k: "Image quality", v: "good · sharpness 80.7", short: "good · 80.7", tone: "ok" },
];

// The subset of observations shown in the "What we observe" layer.
export const OBSERVED_ROWS = OBSERVATION_ROWS.filter((r) => r.id !== "quality");

export const ESTABLISH = [
  { tone: "ok", mark: "✓", label: "People detected", value: "4 · weakest 88.4%" },
  { tone: "ok", mark: "✓", label: "Licence plate visible", value: "text not read" },
  { tone: "warn", mark: "◇", label: "Vehicle type unresolved", value: "car vs motorcycle" },
  { tone: "warn", mark: "◇", label: "Helmet use not established", value: "no helmet label" },
];

export const WHY_CHAIN = [
  { n: "01", name: "CLAIM" },
  { n: "02", name: "PHOTO" },
  { n: "03", name: "OBSERVATION" },
  { n: "04", name: "EVALUATION" },
  { n: "05", name: "RESULT" },
];

export const chainStageFor = (beat) =>
  beat >= 6 ? 4 : beat >= 5 ? 3 : beat >= 3 ? 2 : beat >= 1 ? 1 : 0;