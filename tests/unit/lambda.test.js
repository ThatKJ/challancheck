import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createLambdaHandler } from "../../backend/lambda.js";
import { redactAwsIdentifiers } from "../../backend/src/redact.js";
import { MAX_IMAGE_BYTES } from "../../backend/server.js";

// Exercises the deployed entry point with API Gateway HTTP API v2 events. The
// Bedrock observer is an injected, clearly-labelled stub (source "test-stub");
// nothing here is, or is ever reported as, a live Bedrock result.

// A deliberately FAKE key id, assembled at runtime so no key-shaped literal exists in the
// source (a contiguous one would fail the secret scan and GitHub push protection).
const FAKE_KEY = ["AKI", "AABCDEFGHIJKLMNOP"].join("");

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const png64 = (extra = 0) => Buffer.concat([PNG, Buffer.alloc(extra)]).toString("base64");

const STUB = {
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

const ev = (method, rawPath, body, extra = {}) => ({
  rawPath,
  headers: {},
  body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  isBase64Encoded: false,
  requestContext: { requestId: "req-1", http: { method } },
  ...extra,
});
const parse = (res) => JSON.parse(res.body);

function make({ observe = vi.fn().mockResolvedValue(STUB), site } = {}) {
  const logs = [];
  return { handler: createLambdaHandler({ observe, site, log: (l) => logs.push(l) }), observe, logs };
}

describe("GET /api/health", () => {
  it("reports liveness, region and model, makes no AWS call, and exposes nothing sensitive", async () => {
    const { handler, observe } = make();
    const res = await handler(ev("GET", "/api/health"));
    expect(res.statusCode).toBe(200);
    const body = parse(res);
    expect(body).toMatchObject({ status: "ok", mode: "live", fixtures: false });
    expect(body.region).toBeTruthy();
    expect(JSON.stringify(body)).not.toMatch(/\d{12}|arn:aws|AKIA|secret|token/i);
    expect(observe).not.toHaveBeenCalled();
  });

  it("405s a non-GET", async () => {
    const { handler } = make();
    expect((await handler(ev("POST", "/api/health", {}))).statusCode).toBe(405);
  });
});

describe("POST /api/audit: success path", () => {
  it("relays the observer's { observation, meta } unchanged", async () => {
    const { handler, observe } = make();
    const res = await handler(ev("POST", "/api/audit", { imageBase64: png64(), mimeType: "image/png" }));
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toEqual(STUB);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("trusts the image bytes over the declared mimeType", async () => {
    const { handler, observe } = make();
    await handler(ev("POST", "/api/audit", { imageBase64: png64(), mimeType: "image/jpeg" }));
    expect(observe.mock.calls[0][0].mimeType).toBe("image/png");
  });

  it("decodes a base64-encoded event body", async () => {
    const { handler, observe } = make();
    const raw = Buffer.from(JSON.stringify({ imageBase64: png64() })).toString("base64");
    const res = await handler(ev("POST", "/api/audit", raw, { isBase64Encoded: true }));
    expect(res.statusCode).toBe(200);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("logs one structured line without the image or its bytes", async () => {
    const { handler, logs } = make();
    const image = png64();
    await handler(ev("POST", "/api/audit", { imageBase64: image }));
    expect(logs).toHaveLength(1);
    expect(logs[0]).not.toContain(image);
    expect(JSON.parse(logs[0])).toMatchObject({ level: "info", status: 200, route: "/audit" }); // one normalized name for /audit and /api/audit
  });
});

describe("POST /api/audit: bad input never reaches Bedrock", () => {
  it.each([
    ["invalid JSON", "{not json", 400],
    ["missing imageBase64", { mimeType: "image/png" }, 400],
    ["non-base64 characters", { imageBase64: "not base64 !!!" }, 400],
    ["bytes that are not an image", { imageBase64: Buffer.from("%PDF-1.7 not an image at all").toString("base64") }, 415],
    ["an image over the size limit", { imageBase64: png64(MAX_IMAGE_BYTES) }, 413],
  ])("%s -> %i with a coded, observation-free body", async (_label, body, status) => {
    const { handler, observe } = make();
    const res = await handler(ev("POST", "/api/audit", body));
    expect(res.statusCode).toBe(status);
    expect(parse(res).error.code).toBeTruthy();
    expect(parse(res)).not.toHaveProperty("observation");
    expect(observe).not.toHaveBeenCalled();
  });

  it("rejects an oversized request body with 413 before parsing it", async () => {
    const { handler, observe } = make();
    const res = await handler(ev("POST", "/api/audit", "x".repeat(6 * 1024 * 1024)));
    expect(res.statusCode).toBe(413);
    expect(observe).not.toHaveBeenCalled();
  });
});

describe("POST /api/audit: failures are honest, never a fake observation", () => {
  it.each([
    ["AWS_NOT_CONFIGURED", 503],
    ["AWS_ERROR", 502],
  ])("%s -> %i, coded, with no observation", async (code, status) => {
    const observe = vi.fn().mockRejectedValue(Object.assign(new Error(`upstream said no (${code})`), { code }));
    const { handler } = make({ observe });
    const res = await handler(ev("POST", "/api/audit", { imageBase64: png64() }));
    expect(res.statusCode).toBe(status);
    expect(parse(res).error.code).toBe(code);
    expect(parse(res)).not.toHaveProperty("observation");
    expect(parse(res)).not.toHaveProperty("meta");
  });

  it("the real 'Operation not allowed' rejection surfaces as a coded 502, not a 200", async () => {
    const observe = vi.fn().mockRejectedValue(
      Object.assign(new Error("Bedrock call failed (ValidationException): Operation not allowed"), { code: "AWS_ERROR" })
    );
    const { handler } = make({ observe });
    const res = await handler(ev("POST", "/api/audit", { imageBase64: png64() }));
    expect(res.statusCode).toBe(502);
    expect(parse(res).error.message).toContain("Operation not allowed");
  });

  it("redacts ARNs and account ids in the response and in the log", async () => {
    const leaky = `User: arn:aws:iam::123456789012:role/challancheck-x is not authorized (account 123456789012, key ${FAKE_KEY})`;
    const observe = vi.fn().mockRejectedValue(Object.assign(new Error(leaky), { code: "AWS_ERROR" }));
    const { handler, logs } = make({ observe });
    const res = await handler(ev("POST", "/api/audit", { imageBase64: png64() }));
    for (const text of [res.body, logs.join("\n")]) {
      expect(text).not.toMatch(/123456789012|arn:aws:iam/);
      expect(text).not.toContain(FAKE_KEY);
    }
    expect(parse(res).error.message).toContain("is not authorized");
  });

  it("unexpected errors -> 500 without leaking internals", async () => {
    const observe = vi.fn().mockRejectedValue(new Error("secret internal path /var/task/backend/x.js"));
    const { handler } = make({ observe });
    const res = await handler(ev("POST", "/api/audit", { imageBase64: png64() }));
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("/var/task");
    expect(parse(res).error.code).toBe("INTERNAL");
  });
});

describe("routing", () => {
  const site = vi.fn(async ({ method, path }) => ({ statusCode: 200, headers: {}, body: `site:${method}:${path}`, isBase64Encoded: false }));

  it("serves the web app for non-API paths", async () => {
    const { handler } = make({ site });
    expect((await handler(ev("GET", "/"))).body).toBe("site:GET:/");
    expect((await handler(ev("GET", "/assets/x.js"))).body).toBe("site:GET:/assets/x.js");
  });

  it("serves GET /health as JSON at the API root, not the web app's HTML (the single-page-app fallback must not swallow it)", async () => {
    site.mockClear();
    const { handler, observe } = make({ site });
    const res = await handler(ev("GET", "/health"));
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(parse(res)).toMatchObject({ status: "ok", mode: "live", fixtures: false });
    expect(site).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
  });

  it("serves POST /audit at the API root exactly like /api/audit (same handler, same contract)", async () => {
    site.mockClear();
    const { handler, observe } = make({ site });
    const root = await handler(ev("POST", "/audit", { imageBase64: png64() }));
    const prefixed = await handler(ev("POST", "/api/audit", { imageBase64: png64() }));
    expect(root.statusCode).toBe(200);
    expect(parse(root)).toEqual(parse(prefixed));
    expect(observe).toHaveBeenCalledTimes(2);
    expect(site).not.toHaveBeenCalled();
  });

  it("a failed POST /audit at the root is the same coded failure with no observation, never HTML", async () => {
    const observe = vi.fn().mockRejectedValue(Object.assign(new Error("Bedrock call failed (ValidationException): Operation not allowed"), { code: "AWS_ERROR" }));
    const { handler } = make({ observe, site });
    const res = await handler(ev("POST", "/audit", { imageBase64: png64() }));
    expect(res.statusCode).toBe(502);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(parse(res).error.code).toBe("AWS_ERROR");
    expect(parse(res)).not.toHaveProperty("observation");
  });

  it("405s (JSON, coded) a GET on /audit instead of serving the single-page app", async () => {
    site.mockClear();
    const { handler } = make({ site });
    const res = await handler(ev("GET", "/audit"));
    expect(res.statusCode).toBe(405);
    expect(parse(res).error.code).toBe("METHOD_NOT_ALLOWED");
    expect(site).not.toHaveBeenCalled();
  });

  it("405s a GET on /api/audit and 404s unknown /api routes", async () => {
    const { handler } = make();
    expect((await handler(ev("GET", "/api/audit"))).statusCode).toBe(405);
    expect((await handler(ev("GET", "/api/nope"))).statusCode).toBe(404);
  });

  it("is a plain 404 for non-API paths when no site is bundled", async () => {
    const { handler } = make();
    expect((await handler(ev("GET", "/"))).statusCode).toBe(404);
  });

  it("sets no CORS headers: the app and API share one origin", async () => {
    const { handler } = make();
    const res = await handler(ev("GET", "/api/health", undefined, { headers: { origin: "https://example.com" } }));
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("the deployed entry point can never fall back to fixtures (static guard)", () => {
  it.each(["backend/lambda.js", "backend/src/staticSite.js", "backend/src/redact.js"])("%s does not reference the fixture adapter", (file) => {
    const code = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/fixtureAdapter|FIXTURE_SCENARIOS|observeEvidenceViaFixture/);
  });
});

describe("redactAwsIdentifiers", () => {
  it("removes ARNs, account ids and key ids but keeps the readable message", () => {
    const out = redactAwsIdentifiers(`Denied for arn:aws:bedrock:ap-south-1:123456789012:inference-profile/x (acct 123456789012) ${FAKE_KEY}`);
    expect(out).toBe("Denied for [redacted-arn] (acct [redacted-account]) [redacted-key-id]");
  });
  it("leaves ordinary text and non-strings alone", () => {
    expect(redactAwsIdentifiers("Operation not allowed")).toBe("Operation not allowed");
    expect(redactAwsIdentifiers(undefined)).toBe("");
  });
});

describe("infra guard: every route that can reach Bedrock has the tight throttle", () => {
  const template = readFileSync(new URL("../../infra/template.yaml", import.meta.url), "utf8");
  const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  it.each(["POST /audit", "POST /api/{proxy+}"])("%s is its own route AND has ApiThrottle* route settings", (key) => {
    expect(template).toMatch(new RegExp(`RouteKey: "${esc(key)}"`));
    expect(template).toMatch(new RegExp(`"${esc(key)}":\\s*\\n\\s*ThrottlingRateLimit: !Ref ApiThrottleRateLimit\\s*\\n\\s*ThrottlingBurstLimit: !Ref ApiThrottleBurstLimit`));
  });

  it("the Bedrock-reaching handler paths are exactly the ones with routes (no path can slip onto $default)", () => {
    const source = readFileSync(new URL("../../backend/lambda.js", import.meta.url), "utf8");
    const audit = [...source.matchAll(/rawPath === "([^"]*audit[^"]*)"/g)].map((m) => m[1]).sort();
    expect(audit).toEqual(["/api/audit", "/audit"]); // /api/audit is covered by POST /api/{proxy+}, /audit by POST /audit
  });
});
