// Identifies an image's real format from its leading bytes.
//
// The browser derives File.type from the filename extension, so a PNG saved as
// ".jpg" would reach Bedrock with the wrong media_type and be rejected as a
// mismatch. Trusting the bytes instead removes that whole failure class, and
// also lets the server refuse non-images before spending a Bedrock call.

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function startsWith(bytes, signature, offset = 0) {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/**
 * @param {Uint8Array} bytes
 * @returns {"image/jpeg"|"image/png"|"image/webp"|"image/gif"|null}
 */
export function sniffImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return "image/gif"; // GIF87a / GIF89a
  }
  // WebP: "RIFF" <4-byte size> "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}
