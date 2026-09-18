// P0-02 Bedrock multimodal spike — CLI wrapper around backend/src/bedrockAdapter.js
// (the real adapter, also used by the frontend). This script's only job is to
// batch-run the adapter over local fixture images and print results; the
// actual Bedrock call logic lives in bedrockAdapter.js so the frontend and
// this script never drift apart.
//
// STATUS: NOT yet run against real AWS. Blocked on P0-01 — no AWS credentials
// are configured in this environment (verified via `aws sts get-caller-identity`
// -> NoCredentials). Team leader owns the $100 AWS credit signup; see
// RULES_SNAPSHOT.md.
//
// Once credentials exist:
//   1. Confirm the region and an available multimodal Bedrock model
//      (do not assume a specific Claude version is enabled on the account —
//      check with `aws bedrock list-foundation-models`).
//   2. Set BEDROCK_MODEL_ID and AWS_REGION env vars if the defaults don't apply.
//   3. Drop 5 diverse traffic-evidence JPEGs into scripts/fixtures/
//      (clear motorcycle+helmet, clear motorcycle no helmet, clear car,
//      one blurry/poor-quality image, one ambiguous/occluded image).
//   4. Run: npm run spike:bedrock

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { observeEvidenceViaBedrock, DEFAULT_REGION, DEFAULT_MODEL_ID } from "../backend/src/bedrockAdapter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function extToMediaType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function loadFixtures() {
  let files;
  try {
    files = await readdir(FIXTURES_DIR);
  } catch {
    return [];
  }
  return files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
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
  console.log(`Fixtures: ${fixtures.join(", ")}\n`);

  for (const file of fixtures) {
    const filePath = path.join(FIXTURES_DIR, file);
    console.log(`--- ${file} ---`);
    try {
      const bytes = await readFile(filePath);
      const result = await observeEvidenceViaBedrock({
        imageBase64: bytes.toString("base64"),
        mimeType: extToMediaType(file),
        region,
        modelId,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`FAILED [${err.code ?? "ERROR"}]: ${err.message}`);
    }
    console.log("");
  }
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
