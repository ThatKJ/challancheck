import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createAuditServer, MAX_IMAGE_BYTES } from "../../backend/server.js";

// These tests exercise the HTTP layer only. The Bedrock observer is injected as
// a clearly-labelled stub (source "test-stub"); nothing here is, or is ever
// reported as, a live Bedrock result. The real adapter is covered separately in
// bedrockAdapter.test.js, and the live path by the canonical run.

const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = (extra = 64) => Buffer.concat([PNG_HEAD, Buffer.alloc(extra)]);
const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);

const STUB_RESULT = {
  observation: {
    vehicle_type: { value: "car", confidence: 0.9 },
    people_visible: { value: 1, confidence: 0.8 },
    helmet: { status: "not_applicable", confidence: 0.9 },
    license_plate: { visible: false, text: null, confidence: 0.5 },
    image_quality: "good",
    occlusion: "none",
    uncertainties: [],
  },
  meta: { source: "test-stub", region: "test-region", modelId: "test-model", latencyMs: 1 },
};

let server;
async function start(options = {}) {
  server = createAuditServer({ log: () => {}, ...options });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
afterEach(async () => {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  server = undefined;
});

const post = (base, body, { path = "/audit", headers = {} } = {}) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /audit — success path", () => {
  it("relays the observer's { observation, meta } unchanged", async () => {
    const observe = vi.fn().mockResolvedValue(STUB_RESULT);
    const base = await start({ observe });
    const res = await post(base, { imageBase64: png().toString("base64"), mimeType: "image/png" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(STUB_RESULT);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("trusts the image bytes over the client-declared mimeType", async () => {
    const observe = vi.fn().mockResolvedValue(STUB_RESULT);
    const base = await start({ observe });
    // a PNG saved with a .jpg extension arrives declared as image/jpeg
    await post(base, { imageBase64: png().toString("base64"), mimeType: "image/jpeg" });
    expect(observe.mock.calls[0][0].mimeType).toBe("image/png");
    await post(base, { imageBase64: jpeg().toString("base64"), mimeType: "image/png" });
    expect(observe.mock.calls[1][0].mimeType).toBe("image/jpeg");
  });

  it("also serves the /api/audit alias", async () => {
    const observe = vi.fn().mockResolvedValue(STUB_RESULT);
    const base = await start({ observe });
    const res = await post(base, { imageBase64: png().toString("base64") }, { path: "/api/audit" });
    expect(res.status).toBe(200);
  });
});

describe("POST /audit — bad input never reaches Bedrock", () => {
  it.each([
    ["invalid JSON", "{not json", 400],
    ["missing imageBase64", { mimeType: "image/png" }, 400],
    ["non-base64 characters", { imageBase64: "not base64 !!!" }, 400],
    ["empty imageBase64", { imageBase64: "" }, 400],
    ["bytes that are not an image", { imageBase64: Buffer.from("%PDF-1.7 definitely not an image").toString("base64") }, 415],
  ])("%s -> %i", async (_label, body, expectedStatus) => {
    const observe = vi.fn();
    const base = await start({ observe });
    const res = await post(base, body);
    expect(res.status).toBe(expectedStatus);
    expect((await res.json()).error.code).toBeTruthy();
    expect(observe).not.toHaveBeenCalled();
  });

  it("rejects an image over the size limit with 413", async () => {
    const observe = vi.fn();
    const base = await start({ observe });
    const res = await post(base, { imageBase64: png(MAX_IMAGE_BYTES).toString("base64") });
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("IMAGE_TOO_LARGE");
    expect(observe).not.toHaveBeenCalled();
  });

  it("rejects an oversized request body with 413", async () => {
    const observe = vi.fn();
    const base = await start({ observe });
    const res = await post(base, JSON.stringify({ imageBase64: "A".repeat(9 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(observe).not.toHaveBeenCalled();
  });
});

describe("POST /audit — failures are honest, never a fake observation", () => {
  it.each([
    ["AWS_NOT_CONFIGURED", 503],
    ["AWS_ERROR", 502],
  ])("%s -> %i with a coded error and no observation", async (code, expectedStatus) => {
    const observe = vi.fn().mockRejectedValue(Object.assign(new Error(`upstream said no (${code})`), { code }));
    const base = await start({ observe });
    const res = await post(base, { imageBase64: png().toString("base64") });
    expect(res.status).toBe(expectedStatus);
    const body = await res.json();
    expect(body.error.code).toBe(code);
    expect(body.error.message).toContain("upstream said no");
    expect(body).not.toHaveProperty("observation");
    expect(body).not.toHaveProperty("meta");
  });

  it("unexpected errors -> 500 without leaking internals", async () => {
    const observe = vi.fn().mockRejectedValue(new Error("secret internal path /Users/somebody/.aws/creds"));
    const base = await start({ observe });
    const res = await post(base, { imageBase64: png().toString("base64") });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("/Users/somebody");
    expect(JSON.parse(text).error.code).toBe("INTERNAL");
  });

  it("the server module can never fall back to fixtures (static guard)", () => {
    const source = readFileSync(new URL("../../backend/server.js", import.meta.url), "utf8");
    // strip comments so the explanatory header doesn't trip the check
    const code = source.replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/fixtureAdapter|FIXTURE_SCENARIOS|observeEvidenceViaFixture/);
  });
});

describe("routing and CORS", () => {
  it("GET /health reports liveness without touching Bedrock", async () => {
    const observe = vi.fn();
    const base = await start({ observe });
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(observe).not.toHaveBeenCalled();
  });

  it("404s unknown routes and 405s a GET on /audit", async () => {
    const base = await start({ observe: vi.fn() });
    expect((await fetch(`${base}/nope`)).status).toBe(404);
    expect((await fetch(`${base}/audit`)).status).toBe(405);
  });

  it("echoes an allowed origin and answers preflight; withholds CORS for others", async () => {
    const base = await start({ observe: vi.fn().mockResolvedValue(STUB_RESULT), allowedOrigins: ["http://127.0.0.1:5173"] });

    const preflight = await fetch(`${base}/audit`, {
      method: "OPTIONS",
      headers: { Origin: "http://127.0.0.1:5173", "Access-Control-Request-Method": "POST" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");

    const allowed = await post(base, { imageBase64: png().toString("base64") }, { headers: { Origin: "http://127.0.0.1:5173" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");

    const denied = await post(base, { imageBase64: png().toString("base64") }, { headers: { Origin: "https://evil.example" } });
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});
