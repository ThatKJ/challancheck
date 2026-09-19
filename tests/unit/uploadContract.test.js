import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MAX_IMAGE_BYTES, MAX_BODY_BYTES } from "../../backend/server.js";
import { SUPPORTED_IMAGE_TYPES } from "../../backend/src/imageType.js";

// Upload-limit contract across the frontend/backend boundary (QA RED-016: the UI
// once accepted 10 MB while the server capped images at 5 MB, so a file could
// pass the client and then 413). The frontend has no test runner of its own, so
// this reads its source and pins it to the backend's exported constants.

const app = readFileSync(new URL("../../frontend/src/App.jsx", import.meta.url), "utf8");
const limitMb = MAX_IMAGE_BYTES / 1024 / 1024;

describe("upload contract: frontend limit === backend limit", () => {
  it("the client rejects files above the backend's image limit", () => {
    const match = app.match(/next\.size\s*>\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
    expect(match, "App.jsx must reject oversized files before submission").not.toBeNull();
    expect(Number(match[1])).toBe(limitMb);
  });

  it("the client copy states the same limit", () => {
    expect(app).toContain(`exceeds ${limitMb} MB`);
    expect(app).toContain(`up to ${limitMb} MB`);
    expect(app).not.toMatch(/10\s*MB/);
  });

  it("an image at the limit still fits in the JSON body once base64-encoded", () => {
    const base64Bytes = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
    expect(MAX_BODY_BYTES).toBeGreaterThan(base64Bytes + 1024); // envelope headroom
  });

  it("every type the client accepts is a type the server accepts", () => {
    const accept = app.match(/accept="([^"]+)"/)?.[1]?.split(",") ?? [];
    expect(accept.length).toBeGreaterThan(0);
    for (const type of accept) expect(SUPPORTED_IMAGE_TYPES).toContain(type);
  });
});
