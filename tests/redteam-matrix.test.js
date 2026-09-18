// Runs REDTEAM's acceptance matrix (tests/adversarial/rule_expectations.json,
// ADV-01..ADV-14) against the engine. This file only reads that JSON — it is
// REDTEAM-owned and BUILD must not edit its contents, only satisfy it.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateConsistency } from "../backend/src/ruleEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, "adversarial", "rule_expectations.json");
const { cases } = JSON.parse(readFileSync(matrixPath, "utf-8"));

describe("REDTEAM adversarial matrix (rule_expectations.json)", () => {
  for (const { id, trap, claim, observation, expected } of cases) {
    it(`${id}: ${trap}`, () => {
      const { status } = evaluateConsistency(claim, observation);
      expect(status).toBe(expected);
    });
  }
});
