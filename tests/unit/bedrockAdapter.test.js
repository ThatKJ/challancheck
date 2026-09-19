import { describe, it, expect } from "vitest";
import { observeEvidenceViaBedrock, parseModelJson, DEFAULT_MODEL_ID } from "../../backend/src/bedrockAdapter.js";

describe("DEFAULT_MODEL_ID", () => {
  // In ap-south-1 the Claude models are INFERENCE_PROFILE-only, so a bare model
  // ID (e.g. "anthropic.claude-...") cannot be invoked on demand. Profile IDs
  // carry a routing prefix. Guards against regressing to a bare ID.
  it("is an inference-profile ID (routing prefix), not a bare model ID", () => {
    expect(DEFAULT_MODEL_ID).toMatch(/^(global|apac|us|eu|in|jp|au)\./);
  });
});

describe("parseModelJson (tolerates the envelope, not the schema)", () => {
  const obj = { vehicle_type: { value: "car", confidence: 0.9 } };
  it("parses plain JSON", () => expect(parseModelJson(JSON.stringify(obj))).toEqual(obj));
  it("parses JSON inside a ```json fence", () =>
    expect(parseModelJson("```json\n" + JSON.stringify(obj) + "\n```")).toEqual(obj));
  it("parses JSON wrapped in a sentence", () =>
    expect(parseModelJson("Here is the observation: " + JSON.stringify(obj) + " Hope that helps.")).toEqual(obj));
  it("throws when there is no JSON object to recover", () => {
    expect(() => parseModelJson("I cannot help with that.")).toThrow();
    expect(() => parseModelJson("")).toThrow();
    expect(() => parseModelJson(undefined)).toThrow();
  });
});

// This test intentionally sends garbage image bytes, so it should never
// succeed regardless of this environment's current AWS credential/account
// state (P0-01) — it exercises the real adapter against whatever AWS state
// actually exists (no mocking), and asserts the failure is always a coded
// error (AWS_NOT_CONFIGURED when creds are missing, AWS_ERROR for any other
// AWS-side rejection such as pending account verification or a malformed
// request), never a raw uncaught SDK exception and never a silent success.
describe("observeEvidenceViaBedrock (against real AWS state, no mocking)", () => {
  it("fails with a coded error instead of a raw SDK error or silent success", async () => {
    await expect(
      observeEvidenceViaBedrock({ imageBase64: "AAAA", mimeType: "image/jpeg" })
    ).rejects.toMatchObject({ code: expect.stringMatching(/^AWS_(NOT_CONFIGURED|ERROR)$/) });
  });
});
