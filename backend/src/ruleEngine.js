// Deterministic consistency engine. This file makes the ONLY
// evidence-consistency decisions in the system — Bedrock only observes
// (see docs/AI_COORDINATION.md "Product Truth"). No AWS calls happen here.

import { validateObservation } from "./observationSchema.js";

export const VIOLATION_TYPES = {
  WITHOUT_HELMET: "WITHOUT_HELMET",
};

export const RESULTS = {
  OBSERVABLE_INCONSISTENCY: "OBSERVABLE_INCONSISTENCY",
  CONSISTENT_WITH_EVIDENCE: "CONSISTENT_WITH_EVIDENCE",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  UNSUPPORTED_CHECK: "UNSUPPORTED_CHECK",
};

const TWO_WHEELERS = new Set(["motorcycle", "scooter"]);
const HELMET_EXEMPT_VEHICLES = new Set(["car", "truck", "bus", "auto_rickshaw"]);

// Below this, Bedrock's own confidence says "don't trust this classification" —
// a category-based verdict must degrade to INSUFFICIENT_EVIDENCE rather than
// guess (see docs/QA_REPORT.md RED-005 / rule_expectations.json ADV-09).
const MIN_CONFIDENT = 0.7;

function result(status, reason) {
  return { status, reason };
}

function evaluateWithoutHelmet(obs) {
  if (obs.image_quality === "poor" || obs.occlusion === "severe") {
    return result(
      RESULTS.INSUFFICIENT_EVIDENCE,
      `Image quality is ${obs.image_quality} with ${obs.occlusion} occlusion; cannot reliably observe helmet use.`
    );
  }

  const vehicle = obs.vehicle_type.value;

  if (obs.vehicle_type.confidence < MIN_CONFIDENT) {
    return result(
      RESULTS.INSUFFICIENT_EVIDENCE,
      `Vehicle type classification confidence (${obs.vehicle_type.confidence}) is too low to trust for a verdict.`
    );
  }

  if (HELMET_EXEMPT_VEHICLES.has(vehicle)) {
    return result(
      RESULTS.OBSERVABLE_INCONSISTENCY,
      `Cited violation is "no helmet", but the evidence shows a ${vehicle}, which is not subject to a helmet requirement.`
    );
  }

  if (vehicle === "unknown") {
    return result(
      RESULTS.INSUFFICIENT_EVIDENCE,
      "Vehicle type could not be determined from the evidence image."
    );
  }

  if (!TWO_WHEELERS.has(vehicle)) {
    // Exhaustive over the enum in observationSchema.js; guards against a
    // future vehicle type being added there without a matching rule here.
    return result(
      RESULTS.UNSUPPORTED_CHECK,
      `No consistency rule defined for vehicle type "${vehicle}" against WITHOUT_HELMET.`
    );
  }

  if (obs.helmet.confidence < MIN_CONFIDENT) {
    return result(
      RESULTS.INSUFFICIENT_EVIDENCE,
      `Helmet observation confidence (${obs.helmet.confidence}) is too low to trust for a verdict.`
    );
  }

  switch (obs.helmet.status) {
    case "not_visible":
      return result(
        RESULTS.CONSISTENT_WITH_EVIDENCE,
        `Evidence shows a ${vehicle} rider with no helmet visible, consistent with the cited violation.`
      );
    case "visible":
      return result(
        RESULTS.OBSERVABLE_INCONSISTENCY,
        `Evidence shows a ${vehicle} rider wearing a helmet, which conflicts with the cited "no helmet" violation.`
      );
    case "uncertain":
    case "not_applicable":
    default:
      return result(
        RESULTS.INSUFFICIENT_EVIDENCE,
        "Helmet status could not be determined with confidence from the evidence image."
      );
  }
}

/**
 * @param {string} violationType - one of VIOLATION_TYPES
 * @param {object} observation - raw Bedrock observation (see observationSchema.js)
 * @returns {{status: string, reason: string}}
 */
export function evaluateConsistency(violationType, observation) {
  const { valid, errors } = validateObservation(observation);
  if (!valid) {
    return result(
      RESULTS.INSUFFICIENT_EVIDENCE,
      `Observation failed schema validation: ${errors.join("; ")}`
    );
  }

  switch (violationType) {
    case VIOLATION_TYPES.WITHOUT_HELMET:
      return evaluateWithoutHelmet(observation);
    default:
      return result(
        RESULTS.UNSUPPORTED_CHECK,
        `"${violationType}" cannot be verified against a single evidence image.`
      );
  }
}
