import { describe, it, expect } from "vitest";
import { presentResult } from "../../backend/src/reportPresentation.js";
import { RESULTS } from "../../backend/src/ruleEngine.js";

describe("presentResult", () => {
  it("marks OBSERVABLE_INCONSISTENCY as actionable", () => {
    expect(presentResult(RESULTS.OBSERVABLE_INCONSISTENCY).actionable).toBe(true);
  });

  it.each([RESULTS.CONSISTENT_WITH_EVIDENCE, RESULTS.INSUFFICIENT_EVIDENCE, RESULTS.UNSUPPORTED_CHECK])(
    "does not mark %s as actionable",
    (status) => {
      expect(presentResult(status).actionable).toBe(false);
    }
  );

  it("returns a title and guidance string for every known status", () => {
    for (const status of Object.values(RESULTS)) {
      const { title, guidance, tone } = presentResult(status);
      expect(typeof title).toBe("string");
      expect(title.length).toBeGreaterThan(0);
      expect(typeof guidance).toBe("string");
      expect(guidance.length).toBeGreaterThan(0);
      expect(typeof tone).toBe("string");
    }
  });

  it("falls back to a safe unknown-result presentation instead of throwing", () => {
    const { title, actionable } = presentResult("SOMETHING_NEW");
    expect(title).toBe("Unknown Result");
    expect(actionable).toBe(false);
  });
});
