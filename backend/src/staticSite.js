// Serves the built single-page app from the same Lambda as the API, so the
// deployed product has ONE origin: no CORS, no S3/CloudFront/Amplify to run, and
// no dependency on CloudFront's new-account verification. The bundle is tiny (a
// few files, no external fonts or scripts), which is what makes this reasonable;
// if traffic ever grew, moving these files to S3 + CloudFront changes only where
// they are served from, not the API.
//
// Nothing here touches AWS, and it contains no fixture or observation data.

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};
const TEXT_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css", ".svg", ".json", ".txt"]);

// The app loads nothing from other origins (verified against the built bundle),
// so a strict policy costs nothing. Inline styles are allowed because React
// sets style attributes; blob: is for the uploaded-image preview.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
};

function plain(statusCode, text, extra = {}) {
  return {
    statusCode,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...SECURITY_HEADERS, ...extra },
    body: text,
    isBase64Encoded: false,
  };
}

/**
 * @param {{ rootDir: string }} options - directory holding the built app (index.html at its top)
 * @returns {(request: { method: string, path: string }) => Promise<{ statusCode: number, headers: object, body: string, isBase64Encoded: boolean }>}
 */
export function createStaticSite({ rootDir }) {
  const root = path.resolve(rootDir);
  const cache = new Map();

  async function load(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const absolute = path.resolve(root, relative);
    // Belt and braces on top of the ".." rejection below: never leave rootDir.
    if (absolute !== root && !absolute.startsWith(root + path.sep)) return null;
    let body = null;
    try {
      if ((await stat(absolute)).isFile()) body = await readFile(absolute);
    } catch {
      body = null;
    }
    if (body) cache.set(relative, body);
    return body;
  }

  return async function serve({ method, path: urlPath }) {
    if (method !== "GET" && method !== "HEAD") return plain(405, "Method Not Allowed", { allow: "GET, HEAD" });

    let relative;
    try {
      relative = decodeURIComponent(urlPath);
    } catch {
      return plain(400, "Bad Request");
    }
    if (relative.includes("\0") || relative.split("/").includes("..")) return plain(404, "Not Found");
    relative = relative.replace(/^\/+/, "") || "index.html";

    let body = await load(relative);
    let extension = path.extname(relative).toLowerCase();
    let served = relative;
    if (!body && extension === "") {
      // Single-page-app fallback, only for extensionless paths: a missing
      // /assets/x.js must be a real 404, not an HTML page served as script.
      body = await load("index.html");
      served = "index.html";
      extension = ".html";
    }
    if (!body) return plain(404, "Not Found");

    const isHtml = extension === ".html";
    const headers = {
      "content-type": TYPES[extension] ?? "application/octet-stream",
      // Vite emits content-hashed files under assets/, safe to cache forever;
      // index.html must always be revalidated so a new deploy is picked up.
      "cache-control": served.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      ...SECURITY_HEADERS,
      ...(isHtml ? { "content-security-policy": CSP } : {}),
    };
    const textual = TEXT_EXTENSIONS.has(extension);
    return {
      statusCode: 200,
      headers,
      body: method === "HEAD" ? "" : textual ? body.toString("utf8") : body.toString("base64"),
      isBase64Encoded: !textual && method !== "HEAD",
    };
  };
}
