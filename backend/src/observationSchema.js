// Protected interface — matches the schema frozen in docs/AI_COORDINATION.md.
// Changing shapes/enums here requires updating that doc first.

export const VEHICLE_TYPES = [
  "motorcycle",
  "scooter",
  "car",
  "truck",
  "bus",
  "auto_rickshaw",
  "unknown",
];

export const HELMET_STATUSES = ["visible", "not_visible", "uncertain", "not_applicable"];
export const IMAGE_QUALITIES = ["good", "moderate", "poor"];
export const OCCLUSION_LEVELS = ["none", "partial", "severe"];

function isConfidence(n) {
  return typeof n === "number" && n >= 0 && n <= 1;
}

/**
 * Validates a raw Bedrock observation object against the frozen schema.
 * Returns { valid: true } or { valid: false, errors: string[] }.
 * Never throws — callers (including the Bedrock spike) must be able to
 * treat a malformed model response as INSUFFICIENT_EVIDENCE, not a crash.
 */
export function validateObservation(obs) {
  const errors = [];

  if (!obs || typeof obs !== "object") {
    return { valid: false, errors: ["observation is not an object"] };
  }

  if (!obs.vehicle_type || !VEHICLE_TYPES.includes(obs.vehicle_type.value)) {
    errors.push(`vehicle_type.value must be one of ${VEHICLE_TYPES.join("|")}`);
  }
  if (!obs.vehicle_type || !isConfidence(obs.vehicle_type.confidence)) {
    errors.push("vehicle_type.confidence must be a number in [0,1]");
  }

  if (!obs.people_visible || typeof obs.people_visible.value !== "number" || obs.people_visible.value < 0) {
    errors.push("people_visible.value must be a non-negative number");
  }
  if (!obs.people_visible || !isConfidence(obs.people_visible.confidence)) {
    errors.push("people_visible.confidence must be a number in [0,1]");
  }

  if (!obs.helmet || !HELMET_STATUSES.includes(obs.helmet.status)) {
    errors.push(`helmet.status must be one of ${HELMET_STATUSES.join("|")}`);
  }
  if (!obs.helmet || !isConfidence(obs.helmet.confidence)) {
    errors.push("helmet.confidence must be a number in [0,1]");
  }

  if (!obs.license_plate || typeof obs.license_plate.visible !== "boolean") {
    errors.push("license_plate.visible must be a boolean");
  }
  if (!obs.license_plate || !("text" in obs.license_plate)) {
    errors.push("license_plate.text must be present (string or null)");
  }
  if (!obs.license_plate || !isConfidence(obs.license_plate.confidence)) {
    errors.push("license_plate.confidence must be a number in [0,1]");
  }

  if (!IMAGE_QUALITIES.includes(obs.image_quality)) {
    errors.push(`image_quality must be one of ${IMAGE_QUALITIES.join("|")}`);
  }
  if (!OCCLUSION_LEVELS.includes(obs.occlusion)) {
    errors.push(`occlusion must be one of ${OCCLUSION_LEVELS.join("|")}`);
  }
  if (!Array.isArray(obs.uncertainties)) {
    errors.push("uncertainties must be an array");
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}
