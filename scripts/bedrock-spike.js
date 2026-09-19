// P0-02 Bedrock multimodal spike — CLI wrapper around backend/src/bedrockAdapter.js
// (the real adapter, also used by backend/server.js). This script's only job is
// to batch-run the adapter over local fixture images and print one record per
// image; the actual Bedrock call logic lives in bedrockAdapter.js so the server
// and this script never drift apart.
//
// STATUS: no invocation has succeeded yet. The team's AWS account is gated:
// `ValidationException: Operation not allowed` for every model/region, with
// authorizationStatus NOT_AUTHORIZED and applied Bedrock quotas of 0
// (docs/TASK_BOARD.md P0-01). Nothing here is a verified result until it prints.
//
// Usage (once the account gate clears):
//   1. `npm run check:bedrock-text` — one text-only call proving the SDK path.
//   2. Put 5 traffic-evidence images in scripts/fixtures/ (see README there):
//      clear motorcycle+helmet, clear motorcycle without helmet, clear car,
//      blurry/degraded, ambiguous/occluded.
//   3. `npm run spike:bedrock`  (override with AWS_REGION / BEDROCK_MODEL_ID)
//
// Each record is printed one field per line so scripts/verification/
// bedrock_live_verify.sh can grep "schemaValid", "latencyMs", "vehicle_type", "helmet".
// HALLUCINATION and VERDICT are human judgements (compare the observation to the
// photo) and are left PENDING_HUMAN_REVIEW on purpose — the script cannot see.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { observeEvidenceViaBedrock, DEFAULT_REGION, DEFAULT_MODEL_ID } from "../backend/src/bedrockAdapter.js";
import { sniffImageType } from "../backend/src/imageType.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");

async function loadFixtures() {
  let files;
  try {
    files = await readdir(FIXTURES_DIR);
  } catch {
    return [];
  }
  return files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
}

function formatRecord(record) {
  const lines = Object.entries(record).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  return `{\n${lines.join(",\n")}\n}`;
}

async function main() {
  const fixtures = await loadFixtures();
  if (fixtures.length === 0) {
    console.error(
      `No fixtures found in ${FIXTURES_DIR}. Add at least 5 traffic-evidence images ` +
        `(clear motorcycle+helmet, clear motorcycle no-helmet, clear car, blurry, ambiguous) before running the spike.`
    );
    process.exitCode = 1;
    return;
  }

  const region = process.env.AWS_REGION || DEFAULT_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;
  console.log(`Region: ${region}`);
  console.log(`Model:  ${modelId}`);
  console.log(`Fixtures (${fixtures.length}): ${fixtures.join(", ")}\n`);

  let failures = 0;
  for (const file of fixtures) {
    console.log(`--- ${file} ---`);
    try {
      const bytes = await readFile(path.join(FIXTURES_DIR, file));
      const mimeType = sniffImageType(bytes);
      if (!mimeType) throw Object.assign(new Error("not a JPEG/PNG/WebP/GIF by magic bytes"), { code: "BAD_FIXTURE" });

      const { observation, meta } = await observeEvidenceViaBedrock({
        imageBase64: bytes.toString("base64"),
        mimeType,
        region,
        modelId,
      });

      // The adapter only returns after validateObservation() passes, so reaching
      // this point means the frozen schema held; a schema failure throws instead.
      console.log(
        formatRecord({
          image: file,
          modelId: meta.modelId,
          region: meta.region,
          request: `${mimeType}, ${bytes.length} bytes`,
          schemaValid: true,
          latencyMs: meta.latencyMs,
          vehicle_type: observation.vehicle_type,
          people_visible: observation.people_visible,
          helmet: observation.helmet,
          license_plate: observation.license_plate,
          image_quality: observation.image_quality,
          occlusion: observation.occlusion,
          uncertainties: observation.uncertainties,
          hallucination: "PENDING_HUMAN_REVIEW",
          verdict: "PENDING_HUMAN_REVIEW",
        })
      );
    } catch (err) {
      failures += 1;
      console.error(`FAILED [${err.code ?? "ERROR"}]: ${err.message}`);
    }
    console.log("");
  }

  console.log(`Done: ${fixtures.length - failures}/${fixtures.length} succeeded.`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`Bedrock spike failed [${err.code ?? "ERROR"}]:`, err.message);
  if (err.code === "AWS_NOT_CONFIGURED") {
    console.error(
      "Verify with `aws sts get-caller-identity` and confirm the model is enabled " +
        "for this account/region in the Bedrock console."
    );
  }
  process.exitCode = 1;
});
