// AWS Lambda entry point behind an API Gateway HTTP API (payload format 2.0).
// A thin wrapper: request validation and error mapping come from backend/server.js
// (the same functions the local server uses), and the observation comes from the
// same Bedrock adapter. There is no rule engine, schema or fixture logic here.
// In this product the deterministic rule engine runs in the browser and this
// function only relays what Bedrock observed.
//
// One function serves the whole product on ONE origin, so there is no CORS:
//   GET  /health, /api/health   liveness + region/model; makes no AWS call
//   POST /audit,  /api/audit    { imageBase64, mimeType } -> { observation, meta }  (or a coded error)
//   GET/HEAD anything else      the built web app (src/staticSite.js)
// The un-prefixed paths mirror the local server (backend/server.js) and the frontend's
// contract (`${VITE_API_BASE_URL}/audit`); the /api/* forms are what the deployed web
// app calls (VITE_API_BASE_URL=/api). Both are the SAME handler code.
//
// Deliberately NOT here:
//  - any fixture/mock data: if Bedrock is unavailable the caller gets a coded
//    error with a non-2xx status, never made-up observations (enforced by test).
//  - credentials: the function uses its IAM execution role via the SDK default
//    provider chain; nothing credential-shaped is read or returned.
//  - an unthrottled path to Bedrock: every route that can reach it (POST /audit and
//    POST /api/*) is its own API Gateway route with the tight throttle, so the looser
//    static-file throttle on $default can never be used to spend Bedrock tokens
//    (infra/template.yaml, guarded by tests/unit/lambda.test.js).
//  - a health check that lies: an unknown extensionless path falls through to the
//    single-page app, so /health and /audit MUST be matched before the static handler.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { observeEvidenceViaBedrock, DEFAULT_REGION, DEFAULT_MODEL_ID } from "./src/bedrockAdapter.js";
import { createStaticSite } from "./src/staticSite.js";
import { redactAwsIdentifiers } from "./src/redact.js";
import { parseAuditPayload, describeError } from "./server.js";

function json(statusCode, body, extra = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

const errorBody = (code, message) => ({ error: { code, message } });

/**
 * @param {object} [options]
 * @param {typeof observeEvidenceViaBedrock} [options.observe] - injectable for tests only; the deployed function always uses the real adapter
 * @param {Function} [options.site] - static-site handler; injected in tests
 * @param {(line: string) => void} [options.log]
 */
export function createLambdaHandler({ observe = observeEvidenceViaBedrock, site, log = (line) => console.log(line) } = {}) {
  /** @param {import("aws-lambda").APIGatewayProxyEventV2} event */
  return async function handler(event) {
    const startedAt = Date.now();
    const method = event.requestContext?.http?.method ?? "GET";
    const rawPath = event.rawPath ?? "/";

    if (rawPath === "/health" || rawPath === "/api/health") {
      if (method !== "GET") return json(405, errorBody("METHOD_NOT_ALLOWED", "Use GET."), { allow: "GET" });
      // Liveness only: no AWS call, and nothing about the account, credentials or Bedrock access.
      return json(200, {
        status: "ok",
        service: "challancheck-api",
        mode: "live",
        fixtures: false,
        region: process.env.AWS_REGION || DEFAULT_REGION,
        modelId: process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID,
      });
    }

    if (rawPath === "/audit" || rawPath === "/api/audit") {
      if (method !== "POST") return json(405, errorBody("METHOD_NOT_ALLOWED", "Use POST."), { allow: "POST" });
      try {
        const raw = event.body ?? "";
        const text = event.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf8") : raw;
        const { imageBase64, mimeType, bytes } = parseAuditPayload(text);
        const result = await observe({ imageBase64, mimeType });
        log(
          JSON.stringify({
            level: "info", route: "/audit", status: 200, bedrockMs: result.meta?.latencyMs ?? null,
            totalMs: Date.now() - startedAt, modelId: result.meta?.modelId ?? null, region: result.meta?.region ?? null, type: mimeType, bytes,
          })
        );
        return json(200, result);
      } catch (err) {
        const { status, code, message } = describeError(err);
        // Never an `observation` on failure: no silent fixture/mock fallback. Logged text is redacted too.
        log(JSON.stringify({ level: "error", route: "/audit", status, code, totalMs: Date.now() - startedAt, detail: redactAwsIdentifiers(err?.message ?? err) }));
        return json(status, errorBody(code, message));
      }
    }

    if (rawPath.startsWith("/api/")) return json(404, errorBody("NOT_FOUND", "Unknown route."));

    if (!site) return { statusCode: 404, headers: { "content-type": "text/plain; charset=utf-8" }, body: "Not Found", isBase64Encoded: false };
    return site({ method, path: rawPath });
  };
}

// Built once per container so warm invocations reuse the Bedrock client and the
// in-memory file cache. `public/` sits beside `backend/` in the deployment bundle
// (infra/deploy.sh); when it is absent every non-API path is a plain 404.
const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
export const handler = createLambdaHandler({ site: createStaticSite({ rootDir: publicDir }) });
