// Runs REDTEAM's classifier acceptance traps (classifier_traps.json, CT-01..CT-07)
// against backend/src/violationClassifier.js. This file only reads that JSON — it is
// REDTEAM-owned and BUILD must not edit its contents, only satisfy it.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyViolation } from "../../backend/src/violationClassifier.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, "classifier_traps.json");
const { cases } = JSON.parse(readFileSync(matrixPath, "utf-8"));

describe("REDTEAM classifier traps (classifier_traps.json)", () => {
  for (const { id, trap, text, expected } of cases) {
    it(`${id}: ${trap}`, () => {
      expect(classifyViolation(text)).toMatchObject(expected);
    });
  }
});
