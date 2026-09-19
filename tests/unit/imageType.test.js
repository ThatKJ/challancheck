import { describe, it, expect } from "vitest";
import { sniffImageType, SUPPORTED_IMAGE_TYPES } from "../../backend/src/imageType.js";

const pad = (head) => Buffer.concat([Buffer.from(head), Buffer.alloc(16)]);

describe("sniffImageType", () => {
  it("recognises JPEG, PNG, GIF87a/89a and WebP from magic bytes", () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(pad(Buffer.from("GIF87a")))).toBe("image/gif");
    expect(sniffImageType(pad(Buffer.from("GIF89a")))).toBe("image/gif");
    expect(sniffImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)]))).toBe(
      "image/webp"
    );
  });

  it("rejects non-images, other RIFF containers, and truncated input", () => {
    expect(sniffImageType(Buffer.from("%PDF-1.7 not an image at all"))).toBeNull();
    expect(sniffImageType(Buffer.from("<html><body>hello world</body></html>"))).toBeNull();
    expect(sniffImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WAVE"), Buffer.alloc(8)]))).toBeNull();
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
    expect(sniffImageType(null)).toBeNull();
    expect(sniffImageType(undefined)).toBeNull();
  });

  it("only ever returns a type Bedrock/Claude accepts", () => {
    const seen = [
      pad([0xff, 0xd8, 0xff]),
      pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pad(Buffer.from("GIF89a")),
    ].map(sniffImageType);
    for (const type of seen) expect(SUPPORTED_IMAGE_TYPES).toContain(type);
  });
});
