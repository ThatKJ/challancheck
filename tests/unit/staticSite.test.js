import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createStaticSite } from "../../backend/src/staticSite.js";

let dir;
let outside;
let serve;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00, 0xfe]);

beforeAll(async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "static-site-"));
  dir = path.join(base, "public");
  outside = path.join(base, "secret.txt");
  await mkdir(path.join(dir, "assets"), { recursive: true });
  await writeFile(path.join(dir, "index.html"), "<!doctype html><title>app</title>");
  await writeFile(path.join(dir, "favicon.svg"), "<svg/>");
  await writeFile(path.join(dir, "assets", "index-abc123.js"), "console.log(1)");
  await writeFile(path.join(dir, "assets", "index-abc123.css"), "body{}");
  await writeFile(path.join(dir, "assets", "logo.png"), PNG);
  await writeFile(outside, "TOP SECRET, outside the served directory");
  serve = createStaticSite({ rootDir: dir });
});
afterAll(async () => {
  await rm(path.dirname(dir), { recursive: true, force: true });
});

const get = (p, method = "GET") => serve({ method, path: p });

describe("static site: what it serves", () => {
  it("serves index.html at / with a strict CSP and revalidation", async () => {
    const res = await get("/");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>app</title>");
    expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(res.headers["cache-control"]).toBe("no-cache");
    const csp = res.headers["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  });

  it("serves hashed assets with the right type and immutable caching", async () => {
    const js = await get("/assets/index-abc123.js");
    expect(js.headers["content-type"]).toBe("text/javascript; charset=utf-8");
    expect(js.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect((await get("/assets/index-abc123.css")).headers["content-type"]).toBe("text/css; charset=utf-8");
  });

  it("returns binary files base64-encoded, byte for byte", async () => {
    const res = await get("/assets/logo.png");
    expect(res.isBase64Encoded).toBe(true);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(Buffer.from(res.body, "base64").equals(PNG)).toBe(true);
  });

  it("sets nosniff, no-referrer and frame denial on every response", async () => {
    for (const p of ["/", "/assets/index-abc123.js", "/missing.js"]) {
      const res = await get(p);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
    }
  });

  it("answers HEAD with headers and no body", async () => {
    const res = await get("/", "HEAD");
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("");
  });
});

describe("static site: fallback and rejection", () => {
  it("falls back to index.html for extensionless paths (single-page app)", async () => {
    const res = await get("/some/client/route");
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>app</title>");
  });

  it("does NOT fall back for a missing file with an extension (no HTML served as script)", async () => {
    const res = await get("/assets/does-not-exist.js");
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain("<title>");
  });

  it.each(["POST", "PUT", "DELETE", "PATCH"])("rejects %s with 405", async (method) => {
    const res = await get("/", method);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("GET, HEAD");
  });
});

describe("static site: cannot be made to read outside its directory", () => {
  it.each([
    "/../secret.txt",
    "/assets/../../secret.txt",
    "/%2e%2e/secret.txt",
    "/%2E%2E%2Fsecret.txt",
    "/..%2fsecret.txt",
    "/assets/%2e%2e/%2e%2e/secret.txt",
    "//etc/passwd",
    "/index.html%00.png",
  ])("%s is refused or stays inside the directory", async (p) => {
    const res = await get(p);
    expect(res.body).not.toContain("TOP SECRET");
    expect(res.body).not.toContain("root:");
    expect([200, 400, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) expect(res.body).toContain("<title>app</title>"); // only the SPA fallback
  });

  it("rejects malformed percent-encoding with 400 instead of crashing", async () => {
    expect((await get("/%E0%A4%A")).statusCode).toBe(400);
  });

  it("serves 404 (not a crash) when the directory does not exist", async () => {
    const missing = createStaticSite({ rootDir: path.join(os.tmpdir(), "definitely-not-here-xyz") });
    const res = await missing({ method: "GET", path: "/" });
    expect(res.statusCode).toBe(404);
  });
});
