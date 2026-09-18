// BUILD-owned unit tests for the rule engine. The authoritative acceptance
// bar is REDTEAM's tests/adversarial/rule_expectations.json, run separately
// by tests/redteam-matrix.test.js — these tests are for fast local iteration
// and cover a couple of cases (confidence gating) not in that matrix.
import { describe, it, expect } from "vitest";
import { evaluateConsistency, VIOLATION_TYPES, RESULTS } from "../../backend/src/ruleEngine.js";

function obs(overrides = {}) {
  return {
    vehicle_type: { value: "motorcycle", confidence: 0.9 },
    people_visible: { value: 1, confidence: 0.9 },
    helmet: { status: "not_visible", confidence: 0.9 },
    license_plate: { visible: true, text: "KA01AB1234", confidence: 0.8 },
    image_quality: "good",
    occlusion: "none",
    uncertainties: [],
    ...overrides,
  };
}

describe("WITHOUT_HELMET consistency rules", () => {
  it("flags a car cited for no-helmet as an observable inconsistency (regression guard)", () => {
    const observation = obs({ vehicle_type: { value: "car", confidence: 0.95 } });
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, observation);
    expect(status).toBe(RESULTS.OBSERVABLE_INCONSISTENCY);
  });

  it("matches a motorcycle rider with no helmet visible", () => {
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, obs());
    expect(status).toBe(RESULTS.CONSISTENT_WITH_EVIDENCE);
  });

  it("flags a motorcycle rider clearly wearing a helmet as inconsistent", () => {
    const observation = obs({ helmet: { status: "visible", confidence: 0.9 } });
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, observation);
    expect(status).toBe(RESULTS.OBSERVABLE_INCONSISTENCY);
  });

  it("does not trust a low-confidence vehicle classification even if the category would otherwise be exempt", () => {
    const observation = obs({ vehicle_type: { value: "car", confidence: 0.6 } });
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, observation);
    expect(status).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });

  it("does not trust a low-confidence helmet observation even with a clear vehicle", () => {
    const observation = obs({ helmet: { status: "visible", confidence: 0.5 } });
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, observation);
    expect(status).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });

  it("returns insufficient evidence for poor image quality regardless of other fields", () => {
    const observation = obs({ image_quality: "poor", helmet: { status: "visible", confidence: 0.9 } });
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, observation);
    expect(status).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });
});

describe("unsupported violation types", () => {
  it("returns UNSUPPORTED_CHECK for a violation with no rule (e.g. speeding from a still image)", () => {
    const { status } = evaluateConsistency("SPEEDING", obs());
    expect(status).toBe(RESULTS.UNSUPPORTED_CHECK);
  });
});

describe("malformed observations", () => {
  it("returns insufficient evidence rather than throwing on a malformed observation", () => {
    const { status } = evaluateConsistency(VIOLATION_TYPES.WITHOUT_HELMET, { garbage: true });
    expect(status).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });
});
