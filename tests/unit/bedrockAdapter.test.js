import { describe, it, expect } from "vitest";
import { observeEvidenceViaBedrock } from "../../backend/src/bedrockAdapter.js";

// This environment genuinely has no AWS credentials configured (verified via
// `aws sts get-caller-identity` -> NoCredentials), so this test exercises the
// real failure path rather than a mock — it will need updating once P0-01
// unblocks and real credentials exist (it would then either need a live
// integration flag or a mocked client).
describe("observeEvidenceViaBedrock (no AWS credentials in this environment)", () => {
  it("fails with AWS_NOT_CONFIGURED instead of a raw SDK error or silent success", async () => {
    await expect(
      observeEvidenceViaBedrock({ imageBase64: "AAAA", mimeType: "image/jpeg" })
    ).rejects.toMatchObject({ code: "AWS_NOT_CONFIGURED" });
  });
});
