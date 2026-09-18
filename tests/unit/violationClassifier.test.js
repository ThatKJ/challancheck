import { describe, it, expect } from "vitest";
import { classifyViolation } from "../../backend/src/violationClassifier.js";

describe("classifyViolation", () => {
  it.each([
    "Riding without helmet",
    "Driving two wheeler without helmet",
    "Not wearing protective headgear",
    "NO HELMET",
  ])("maps %j to WITHOUT_HELMET", (text) => {
    expect(classifyViolation(text)).toMatchObject({ claim: "WITHOUT_HELMET", matched: true });
  });

  it.each(["Over speeding", "Speed limit violation", "Exceeding permissible speed"])(
    "maps %j to SPEEDING",
    (text) => {
      expect(classifyViolation(text)).toMatchObject({ claim: "SPEEDING", matched: true });
    }
  );

  it("maps signal-jumping text to RED_LIGHT_JUMP", () => {
    expect(classifyViolation("Jumping red light / signal violation")).toMatchObject({
      claim: "RED_LIGHT_JUMP",
      matched: true,
    });
  });

  it("maps number-plate text to PLATE_MISMATCH", () => {
    expect(classifyViolation("Number plate mismatch with registration")).toMatchObject({
      claim: "PLATE_MISMATCH",
      matched: true,
    });
  });

  it("maps PUC text to NO_PUC_CERTIFICATE", () => {
    expect(classifyViolation("No valid PUC certificate")).toMatchObject({
      claim: "NO_PUC_CERTIFICATE",
      matched: true,
    });
  });

  it("preserves unrecognized violation text as a slugified claim instead of dropping it", () => {
    const { claim, matched, sourceText } = classifyViolation("Triple riding on two-wheeler");
    expect(matched).toBe(false);
    expect(claim).toBe("TRIPLE_RIDING_ON_TWO_WHEELER");
    expect(sourceText).toBe("Triple riding on two-wheeler");
  });

  it("returns UNKNOWN_VIOLATION for empty or missing text without throwing", () => {
    expect(classifyViolation("")).toMatchObject({ claim: "UNKNOWN_VIOLATION", matched: false });
    expect(classifyViolation(undefined)).toMatchObject({ claim: "UNKNOWN_VIOLATION", matched: false });
  });

  it("surfaces every recognized claim when a challan cites multiple offences (RED-008)", () => {
    const { claims, matched } = classifyViolation("Overspeeding and driving without helmet");
    expect(matched).toBe(true);
    expect(claims).toEqual(expect.arrayContaining(["WITHOUT_HELMET", "SPEEDING"]));
    expect(claims).toHaveLength(2);
  });

  it("returns a single-element claims array for an unambiguous offence", () => {
    expect(classifyViolation("Riding without helmet").claims).toEqual(["WITHOUT_HELMET"]);
  });

  it("returns an empty claims array when nothing is recognized", () => {
    expect(classifyViolation("Triple riding on two-wheeler").claims).toEqual([]);
  });
});
