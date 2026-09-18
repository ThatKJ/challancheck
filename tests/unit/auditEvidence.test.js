import { describe, it, expect } from "vitest";
import { auditEvidence } from "../../backend/src/auditEvidence.js";

const goodCarObservation = {
  vehicle_type: { value: "car", confidence: 0.95 },
  people_visible: { value: 1, confidence: 0.9 },
  helmet: { status: "not_applicable", confidence: 0.9 },
  license_plate: { visible: true, text: "KA01AB1234", confidence: 0.8 },
  image_quality: "good",
  occlusion: "none",
  uncertainties: [],
};

describe("auditEvidence", () => {
  it("reproduces the demo wow moment: 'no helmet' claim against a car evidence photo", () => {
    const report = auditEvidence({
      violationText: "Riding without helmet",
      observation: goodCarObservation,
    });

    expect(report.violation).toEqual({
      sourceText: "Riding without helmet",
      canonicalClaim: "WITHOUT_HELMET",
      candidateClaims: ["WITHOUT_HELMET"],
      recognized: true,
    });
    expect(report.requiresSelection).toBe(false);
    expect(report.result.status).toBe("OBSERVABLE_INCONSISTENCY");
    expect(report.observation).toBe(goodCarObservation);
    expect(report.presentation.actionable).toBe(true);
    expect(() => new Date(report.generatedAt).toISOString()).not.toThrow();
  });

  it("passes through an unrecognized violation as UNSUPPORTED_CHECK end to end", () => {
    const report = auditEvidence({
      violationText: "Triple riding",
      observation: goodCarObservation,
    });

    expect(report.violation.recognized).toBe(false);
    expect(report.violation.canonicalClaim).toBe("TRIPLE_RIDING");
    expect(report.result.status).toBe("UNSUPPORTED_CHECK");
  });

  it("degrades gracefully when the observation is malformed, instead of throwing", () => {
    const report = auditEvidence({
      violationText: "No helmet",
      observation: { garbage: true },
    });

    expect(report.result.status).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("degrades gracefully when violationText is missing, instead of throwing", () => {
    const report = auditEvidence({ observation: goodCarObservation });

    expect(report.violation.canonicalClaim).toBe("UNKNOWN_VIOLATION");
    expect(report.result.status).toBe("UNSUPPORTED_CHECK");
  });

  it("requires explicit selection instead of silently picking a claim when the text cites multiple offences (RED-008)", () => {
    const report = auditEvidence({
      violationText: "Overspeeding and driving without helmet",
      observation: goodCarObservation,
    });

    expect(report.requiresSelection).toBe(true);
    expect(report.violation.candidateClaims).toEqual(
      expect.arrayContaining(["WITHOUT_HELMET", "SPEEDING"])
    );
    expect(report.result).toBeUndefined();
  });

  it("evaluates the user-selected claim once one is provided for a multi-offence text", () => {
    const report = auditEvidence({
      violationText: "Overspeeding and driving without helmet",
      selectedClaim: "WITHOUT_HELMET",
      observation: goodCarObservation,
    });

    expect(report.requiresSelection).toBe(false);
    expect(report.violation.canonicalClaim).toBe("WITHOUT_HELMET");
    expect(report.result.status).toBe("OBSERVABLE_INCONSISTENCY");
  });

  it("ignores a selectedClaim that isn't one of the candidates and asks again", () => {
    const report = auditEvidence({
      violationText: "Overspeeding and driving without helmet",
      selectedClaim: "RED_LIGHT_JUMP",
      observation: goodCarObservation,
    });

    expect(report.requiresSelection).toBe(true);
  });
});
