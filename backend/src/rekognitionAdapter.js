// The live observation adapter: Amazon Rekognition DetectLabels, normalized into
// the frozen observation schema (observationSchema.js). Rekognition only OBSERVES
// (labels, instance boxes, image-quality measurements). It decides nothing: every
// consistency verdict still comes from ruleEngine.js. AWS observes; application
// code evaluates.
//
// Honesty rules this file enforces (each has a test in tests/unit/rekognitionAdapter.test.js):
//  - A missing label is NOT evidence of absence. Rekognition returns only what it
//    detected at or above MIN_CONFIDENCE, so no Helmet / License Plate / Person label
//    means "not established" (helmet "uncertain" at confidence 0), never "no helmet".
//  - helmet.status is "visible" only when a helmet sits at the head of EVERY detected
//    person. "not_visible" is never produced: label detection cannot establish it.
//  - The schema describes ONE vehicle. If two different vehicle types are detected
//    (a car and a motorcycle in the same street scene), which one the claim refers to
//    is unknown, so vehicle_type is "unknown" instead of a guess.
//  - Fields Rekognition cannot establish (helmet use, occlusion, plate text) are listed
//    in `uncertainties` rather than filled in.
//  - Any failure is a coded error (AWS_ERROR / AWS_NOT_CONFIGURED / UNSUPPORTED_IMAGE),
//    never a fixture or a made-up observation. This file imports no fixture data and no
//    Bedrock code.

import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { validateObservation } from "./observationSchema.js";

export const DEFAULT_REGION = "ap-south-1";
export const OBSERVER_SOURCE = "amazon_rekognition";
export const MIN_CONFIDENCE = 70; // percent; labels below this are neither returned nor used
export const MAX_LABELS = 30;
const HELMET_MIN_CONFIDENCE = 80; // percent; stricter than MIN_CONFIDENCE because "visible" drives a verdict

// Rekognition reads JPEG and PNG only. WebP and GIF pass our own upload check
// (imageType.js) but the API would reject them, so they are refused before any call.
const REKOGNITION_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

// Lower-cased label name or alias -> vehicle type. "bicycle" exists only so a bicycle
// counts as a competing vehicle: the schema has no bicycle type, so it is never output.
const VEHICLE_TYPE_BY_LABEL = new Map([
  ["car", "car"],
  ["automobile", "car"],
  ["sedan", "car"],
  ["motorcycle", "motorcycle"],
  ["motorbike", "motorcycle"],
  ["bus", "bus"],
  ["truck", "truck"],
  ["bicycle", "bicycle"],
  ["bike", "bicycle"],
]);
const HELMET_LABELS = new Set(["helmet", "crash helmet"]); // not "hardhat": that is not a motorcycle helmet
const PERSON_LABELS = new Set(["person", "human"]);
const PLATE_LABELS = new Set(["license plate"]);

const namesOf = (label) =>
  [label.Name, ...(label.Aliases ?? []).map((alias) => alias.Name)].filter(Boolean).map((name) => name.toLowerCase());
const hasName = (label, wanted) => namesOf(label).some((name) => wanted.has(name));
const toConfidence = (percent) => Math.round(percent * 100) / 10000; // 99.6699 -> 0.9967
const shown = (percent) => `${percent.toFixed(1)}%`;

// A worn helmet sits at the top of its wearer's box: its centre must fall in the upper half.
function atHead(helmetBox, personBox) {
  const x = helmetBox.Left + helmetBox.Width / 2;
  const y = helmetBox.Top + helmetBox.Height / 2;
  return (
    x >= personBox.Left && x <= personBox.Left + personBox.Width &&
    y >= personBox.Top && y <= personBox.Top + personBox.Height / 2
  );
}

// The weakest helmet confidence (percent) if every person has a helmet at the head, else null.
function helmetConfidence(labels, persons) {
  const helmets = labels
    .filter((label) => hasName(label, HELMET_LABELS))
    .flatMap((label) => label.Instances ?? [])
    .filter((instance) => instance.Confidence >= HELMET_MIN_CONFIDENCE && instance.BoundingBox);
  if (persons.length === 0 || helmets.length === 0) return null;
  const perPerson = persons.map((person) => helmets.find((helmet) => atHead(helmet.BoundingBox, person.BoundingBox)));
  return perPerson.every(Boolean) ? Math.min(...perPerson.map((helmet) => helmet.Confidence)) : null;
}

// Heuristic thresholds on Rekognition's own 0-100 Brightness/Sharpness measurements.
// They are not calibrated against traffic photos. They only ever make the result more
// cautious: "poor" degrades a helmet verdict to INSUFFICIENT_EVIDENCE (ruleEngine.js),
// and "good" never creates a verdict by itself.
function imageQualityFrom(quality) {
  const { Brightness: brightness, Sharpness: sharpness } = quality ?? {};
  if (!Number.isFinite(brightness) || !Number.isFinite(sharpness)) return "unknown";
  if (sharpness < 25 || brightness < 15 || brightness > 92) return "poor";
  if (sharpness >= 50 && brightness >= 30 && brightness <= 85) return "good";
  return "moderate";
}

/**
 * Pure: a DetectLabels response ({ Labels, ImageProperties }) -> an observation in the
 * frozen schema. Makes no AWS call.
 * @param {object} response
 * @returns {object} observation (see observationSchema.js)
 */
export function normalizeLabels(response) {
  const labels = (response?.Labels ?? []).filter((label) => label?.Confidence >= MIN_CONFIDENCE);
  const uncertainties = [];

  // Vehicle: one supported type, or "unknown" (with the reason recorded).
  const found = new Map(); // vehicle type -> best label confidence (percent)
  for (const label of labels) {
    for (const name of namesOf(label)) {
      const type = VEHICLE_TYPE_BY_LABEL.get(name);
      if (type) found.set(type, Math.max(found.get(type) ?? 0, label.Confidence));
    }
  }
  const types = [...found].sort((a, b) => b[1] - a[1]);
  let vehicle_type = { value: "unknown", confidence: 0 };
  if (types.length === 0) {
    uncertainties.push(`No car, motorcycle, bus or truck label at or above ${MIN_CONFIDENCE}%; a vehicle of another kind may still be present.`);
  } else if (types.length > 1) {
    uncertainties.push(
      `More than one vehicle type detected (${types.map(([type, percent]) => `${type} ${shown(percent)}`).join(", ")}), so the vehicle the claim refers to cannot be identified.`
    );
  } else if (types[0][0] === "bicycle") {
    uncertainties.push("A bicycle was detected; the observation schema has no bicycle vehicle type.");
  } else {
    vehicle_type = { value: types[0][0], confidence: toConfidence(types[0][1]) };
  }

  // People: the count of detected Person instances, or a stated lower bound.
  const personLabel = labels.find((label) => hasName(label, PERSON_LABELS));
  const persons = (personLabel?.Instances ?? []).filter((instance) => instance.Confidence >= MIN_CONFIDENCE);
  let people_visible;
  if (persons.length > 0) {
    people_visible = { value: persons.length, confidence: toConfidence(Math.min(...persons.map((p) => p.Confidence))) };
    if (persons.length > 1) uncertainties.push("People count is the number of detected Person instances; it does not separate the subject from bystanders.");
  } else if (personLabel) {
    people_visible = { value: 1, confidence: toConfidence(personLabel.Confidence) };
    uncertainties.push("A person was detected without instance boxes, so the people count is only a lower bound of 1.");
  } else {
    people_visible = { value: 0, confidence: 0 };
    uncertainties.push(`No Person label at or above ${MIN_CONFIDENCE}%; this does not establish that nobody is visible.`);
  }

  // Helmet: "visible" only with positive, head-positioned evidence for everyone; otherwise not established.
  const helmetPercent = helmetConfidence(labels, persons);
  let helmet;
  if (helmetPercent === null) {
    helmet = { status: "uncertain", confidence: 0 };
    uncertainties.push("Helmet use is not established: Amazon Rekognition label detection did not report a helmet at the head of every detected person. This is not evidence that no helmet is worn.");
  } else {
    helmet = { status: "visible", confidence: toConfidence(helmetPercent) };
  }

  // License plate: label detection can say a plate is there, never what it reads.
  const plateLabel = labels.find((label) => hasName(label, PLATE_LABELS));
  const license_plate = plateLabel
    ? { visible: true, text: null, confidence: toConfidence(plateLabel.Confidence) }
    : { visible: false, text: null, confidence: 0 };
  uncertainties.push(
    plateLabel
      ? "License plate text is not read; label detection does not read text."
      : `No License Plate label at or above ${MIN_CONFIDENCE}%; this does not establish that no plate is visible.`
  );

  const image_quality = imageQualityFrom(response?.ImageProperties?.Quality);
  if (image_quality === "unknown") uncertainties.push("Amazon Rekognition did not return image quality measurements.");

  // DetectLabels reports nothing about occlusion.
  uncertainties.push("Occlusion is not assessed by Amazon Rekognition label detection.");

  return { vehicle_type, people_visible, helmet, license_plate, image_quality, occlusion: "unknown", uncertainties };
}

function isCredentialsError(err) {
  const haystack = `${err?.name ?? ""} ${err?.message ?? ""}`.toLowerCase();
  return /credential|could not load|unable to locate/i.test(haystack);
}

function codedError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

/**
 * @param {object} input
 * @param {string} input.imageBase64 - base64-encoded image bytes (no data: prefix)
 * @param {string} input.mimeType - the sniffed type; only image/jpeg and image/png are accepted
 * @param {string} [input.region]
 * @param {{ send: Function }} [input.client] - injectable for tests only; the deployed function always uses the real SDK client
 * @returns {Promise<{ observation: object, meta: { source: "amazon_rekognition", operation: "DetectLabels", region: string, labelModelVersion: string|null, minConfidence: number, latencyMs: number, labels: Array<{ name: string, confidence: number }> } }>}
 * @throws {Error} `.code` is "UNSUPPORTED_IMAGE" (nothing was sent to AWS), "AWS_NOT_CONFIGURED"
 *   (no credentials) or "AWS_ERROR" (any other Rekognition failure or a malformed response)
 */
export async function observeEvidenceViaRekognition({
  imageBase64,
  mimeType,
  region = process.env.AWS_REGION || DEFAULT_REGION,
  client = new RekognitionClient({ region }),
}) {
  if (!REKOGNITION_IMAGE_TYPES.has(mimeType)) {
    throw codedError("UNSUPPORTED_IMAGE", "Amazon Rekognition accepts JPEG and PNG images only.");
  }

  let response;
  const start = Date.now();
  try {
    response = await client.send(
      new DetectLabelsCommand({
        Image: { Bytes: Buffer.from(imageBase64, "base64") },
        Features: ["GENERAL_LABELS", "IMAGE_PROPERTIES"],
        MinConfidence: MIN_CONFIDENCE,
        MaxLabels: MAX_LABELS,
      })
    );
  } catch (err) {
    if (isCredentialsError(err)) {
      throw codedError("AWS_NOT_CONFIGURED", `AWS credentials are not configured for this environment (${err.message}).`, err);
    }
    throw codedError("AWS_ERROR", `Amazon Rekognition call failed (${err?.name ?? "Error"}): ${err?.message}`, err);
  }
  const latencyMs = Date.now() - start;

  if (!Array.isArray(response?.Labels)) {
    throw codedError("AWS_ERROR", "Amazon Rekognition response did not include a Labels list.");
  }

  const observation = normalizeLabels(response);
  const { valid, errors } = validateObservation(observation);
  if (!valid) {
    // Our own mapping bug, not an AWS failure: surfaces as INTERNAL (500), never as a partial result.
    throw new Error(`Rekognition normalization produced an invalid observation: ${errors.join("; ")}`);
  }

  return {
    observation,
    meta: {
      source: OBSERVER_SOURCE,
      operation: "DetectLabels",
      region,
      labelModelVersion: response.LabelModelVersion ?? null,
      minConfidence: MIN_CONFIDENCE,
      latencyMs,
      labels: response.Labels.map((label) => ({ name: label.Name, confidence: Math.round(label.Confidence * 100) / 100 })),
    },
  };
}
