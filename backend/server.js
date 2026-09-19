// Local HTTP wrapper around the real Bedrock adapter — the missing link for the
// live path. frontend/src/lib/audit.js POSTs { imageBase64, mimeType } to
// `${VITE_API_BASE_URL}/audit` and expects { observation, meta } back; this is
// that endpoint. It exists so the demo can run locally (P1-06 deployment is cut).
//
// Deliberately NOT here:
//  - any fixture/mock data. This file must never import fixtureAdapter.js: if
//    Bedrock is unavailable the caller gets a coded error, never made-up
//    observations (docs/AI_COORDINATION.md "Product Truth"; enforced by test).
//  - the consistency verdict. The frontend applies the deterministic rule
//    engine to the observation; this server only relays what Bedrock saw.
//  - credentials. They come only from the AWS SDK default provider chain.
//
// Run:  npm run server            (binds 127.0.0.1:8787, override with PORT)
// UI:   VITE_API_BASE_URL=http://127.0.0.1:8787 npm run dev --prefix frontend

import http from "node:http";
import { pathToFileURL } from "node:url";
import { observeEvidenceViaBedrock, DEFAULT_REGION, DEFAULT_MODEL_ID } from "./src/bedrockAdapter.js";
import { sniffImageType } from "./src/imageType.js";
import { redactAwsIdentifiers } from "./src/redact.js";

// Sized for the DEPLOYED path, not just this local server: API Gateway HTTP API
// (10 MB) -> Lambda synchronous request (6 MB = 6,291,556 bytes) -> Bedrock. Base64
// inflates an image by 4/3, so a 4.6 MB photo is a 6.5 MB request that the live
// gateway refuses (HTTP 413 {"message":"Request Entity Too Large"}) before any of
// our code runs. A 3 MB image is a 4 MB request: clear of every layer.
export const MAX_BODY_BYTES = 5 * 1024 * 1024; // JSON envelope incl. base64 (~33% larger than the image)
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const AUDIT_PATHS = new Set(["/audit", "/api/audit"]);
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function send(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES * 4) {
        req.destroy(); // hard stop on a runaway stream
        return;
      }
      if (size > MAX_BODY_BYTES) tooLarge = true; // keep draining so the client can read our 413
      else chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) reject(new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large."));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

/**
 * Pure request validation shared by this server and the Lambda handler
 * (backend/lambda.js): JSON text in, a validated { imageBase64, mimeType, bytes } out,
 * or an HttpError. Nothing here touches a stream or AWS.
 * @param {string} bodyText
 */
export function parseAuditPayload(bodyText) {
  if (typeof bodyText !== "string" || Buffer.byteLength(bodyText) > MAX_BODY_BYTES) {
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const base64 = typeof parsed?.imageBase64 === "string" ? parsed.imageBase64.replace(/\s+/g, "") : "";
  if (!base64 || !BASE64_RE.test(base64)) {
    throw new HttpError(400, "BAD_REQUEST", "imageBase64 must be a non-empty base64 string.");
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new HttpError(413, "IMAGE_TOO_LARGE", `Image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }

  // The client-supplied mimeType is only advisory (it comes from a filename
  // extension); the bytes decide, so Bedrock never sees a mismatched media_type.
  const mimeType = sniffImageType(bytes);
  if (!mimeType) {
    throw new HttpError(415, "UNSUPPORTED_IMAGE", "Evidence must be a JPEG, PNG, WebP, or GIF image.");
  }
  return { imageBase64: base64, mimeType, bytes: bytes.length };
}

async function parseAuditRequest(req) {
  return parseAuditPayload(await readBody(req));
}

/**
 * Maps anything thrown while serving /audit to { status, code, message }.
 * Never includes an observation. Upstream AWS text can carry ARNs and account ids
 * (an AccessDenied message names the caller), so those are redacted: this API is
 * public once deployed.
 */
export function describeError(err) {
  if (err instanceof HttpError) return { status: err.status, code: err.code, message: err.message };
  if (err?.code === "AWS_NOT_CONFIGURED") return { status: 503, code: err.code, message: redactAwsIdentifiers(err.message) };
  if (err?.code === "AWS_ERROR") return { status: 502, code: err.code, message: redactAwsIdentifiers(err.message) };
  return { status: 500, code: "INTERNAL", message: "Unexpected server error." };
}

/**
 * @param {object} [options]
 * @param {typeof observeEvidenceViaBedrock} [options.observe] - injectable for tests only; the running server always uses the real adapter
 * @param {string[]} [options.allowedOrigins]
 * @param {(line: string) => void} [options.log]
 */
export function createAuditServer({
  observe = observeEvidenceViaBedrock,
  allowedOrigins = [...DEFAULT_ORIGINS, ...(process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [])],
  log = (line) => console.log(line),
} = {}) {
  const server = http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const path = (req.url ?? "").split("?")[0];
    const origin = req.headers.origin;
    const cors = origin && allowedOrigins.includes(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          Vary: "Origin",
        }
      : {};

    try {
      if (req.method === "OPTIONS" && AUDIT_PATHS.has(path)) {
        res.writeHead(204, cors);
        res.end();
        return;
      }
      if (req.method === "GET" && path === "/health") {
        // Liveness of this process only. It makes no AWS call and says nothing about Bedrock.
        send(res, 200, { status: "ok" }, cors);
        return;
      }
      if (!AUDIT_PATHS.has(path)) throw new HttpError(404, "NOT_FOUND", "Unknown route.");
      if (req.method !== "POST") throw new HttpError(405, "METHOD_NOT_ALLOWED", "Use POST.");

      const { imageBase64, mimeType, bytes } = await parseAuditRequest(req);
      const result = await observe({ imageBase64, mimeType });
      send(res, 200, result, cors);
      log(
        `[audit] 200 model=${result.meta?.modelId} region=${result.meta?.region} ` +
          `bedrockMs=${result.meta?.latencyMs} totalMs=${Date.now() - startedAt} type=${mimeType} bytes=${bytes}`
      );
    } catch (err) {
      const { status, code, message } = describeError(err);
      // Never an `observation` on failure: no silent fixture/mock fallback.
      send(res, status, { error: { code, message } }, cors);
      log(`[audit] ${status} ${code} totalMs=${Date.now() - startedAt} :: ${err?.message ?? err}`);
    }
  });
  server.requestTimeout = 60_000;
  return server;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.env.PORT ?? 8787);
  const region = process.env.AWS_REGION || DEFAULT_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;
  createAuditServer().listen(port, "127.0.0.1", () => {
    console.log(`ChallanCheck backend listening on http://127.0.0.1:${port}  (POST /audit, GET /health)`);
    console.log(`Bedrock target: region=${region} model=${modelId}  — credentials via the AWS SDK default provider chain`);
    console.log(`UI: VITE_API_BASE_URL=http://127.0.0.1:${port} npm run dev --prefix frontend`);
  });
}
