import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { observeEvidenceViaLiveBackend } from "../../frontend/src/lib/audit.js";

// The live path is the only path allowed to present a result as Bedrock output.
// Whatever goes wrong upstream, it must surface as a CODED ERROR — never as an
// observation, and never as fixture data. These tests pin that contract on both
// sides of the HTTP boundary (backend/server.js emits { error: { code, message } };
// frontend/src/lib/audit.js must keep that code instead of re-labelling it).
// Every backend response below is a clearly-labelled stub, not a Bedrock result.

const call = () => observeEvidenceViaLiveBackend({ imageBase64: "AAAA", mimeType: "image/png" });
const stubFetch = (impl) => vi.stubGlobal("fetch", vi.fn(impl));
const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("observeEvidenceViaLiveBackend — failures stay coded and observation-free", () => {
  it("no backend configured -> AWS_NOT_CONFIGURED, and no request is attempted", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    stubFetch(() => {
      throw new Error("fetch must not be called without a configured backend");
    });
    await expect(call()).rejects.toMatchObject({ code: "AWS_NOT_CONFIGURED" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("backend unreachable -> AWS_NOT_CONFIGURED", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://backend.invalid");
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));
    await expect(call()).rejects.toMatchObject({ code: "AWS_NOT_CONFIGURED" });
  });

  it.each([
    ["AWS_ERROR", 502, "Bedrock call failed (ValidationException): Operation not allowed"],
    ["AWS_NOT_CONFIGURED", 503, "AWS credentials are not configured for this environment."],
    ["IMAGE_TOO_LARGE", 413, "Image is larger than 5 MB."],
  ])("keeps the backend's own code %s (HTTP %i) instead of re-labelling it", async (code, status, message) => {
    vi.stubEnv("VITE_API_BASE_URL", "http://backend.invalid");
    stubFetch(() => Promise.resolve(jsonResponse(status, { error: { code, message } })));
    const err = await call().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
  });

  it("a non-JSON error body (e.g. a proxy page) still fails coded, never with data", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://backend.invalid");
    stubFetch(() => Promise.resolve(new Response("<html>Bad Gateway</html>", { status: 502 })));
    const err = await call().catch((e) => e);
    expect(err.code).toBe("AWS_NOT_CONFIGURED");
    expect(err.message).toContain("502");
  });

  it("passes a successful backend answer through untouched", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://backend.invalid");
    const answer = { observation: { stub: true }, meta: { source: "test-stub" } };
    stubFetch(() => Promise.resolve(jsonResponse(200, answer)));
    await expect(call()).resolves.toEqual(answer);
  });
});

describe("the Bedrock adapter can never fall back to fixtures (static guard)", () => {
  it("backend/src/bedrockAdapter.js does not reference the fixture adapter", () => {
    const source = readFileSync(new URL("../../backend/src/bedrockAdapter.js", import.meta.url), "utf8");
    const code = source.replace(/\/\/.*$/gm, ""); // the header comment explains the rule; only code counts
    expect(code).not.toMatch(/fixtureAdapter|FIXTURE_SCENARIOS|observeEvidenceViaFixture/);
  });
});
