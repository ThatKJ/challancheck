import { describe, it, expect } from "vitest";
import { observeEvidenceViaBedrock } from "../../backend/src/bedrockAdapter.js";

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
