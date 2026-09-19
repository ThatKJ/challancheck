// Frontend orchestration layer. Imports the SAME logic modules the backend
// tests run against (../../../backend/src) — there is exactly one rule
// engine, one classifier, one fixture set, not a duplicated frontend copy.
// bedrockAdapter.js is deliberately NOT imported here: it pulls in the AWS
// SDK and is server/Node-side only (used by scripts/bedrock-spike.js and,
// once deployed, a real Lambda). See observeEvidenceViaLiveBackend below for
// how the frontend would reach it once a backend exists.

export { FIXTURE_SCENARIOS, observeEvidenceViaFixture } from "../../../backend/src/fixtureAdapter.js";
export { auditEvidence, classifyForSelection } from "../../../backend/src/auditEvidence.js";

/**
 * "Production mode" adapter. There is no deployed backend yet (P1-06 is cut
 * for this event — see docs/TASK_BOARD.md), so this always fails honestly
 * with AWS_NOT_CONFIGURED instead of silently substituting fixture data.
 * Once a real backend/Lambda exists behind VITE_API_BASE_URL, this becomes
 * the live path with no other code changes required.
 *
 * @returns {Promise<{ observation: object, meta: { source: "bedrock", ... } }>}
 * @throws {Error} with `.code = "AWS_NOT_CONFIGURED"`
 */
export async function observeEvidenceViaLiveBackend({ imageBase64, mimeType }) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    const err = new Error(
      "No backend/AWS integration is deployed yet. Live Bedrock status is UNKNOWN (see docs/TASK_BOARD.md P0-01/P0-02/P1-06)."
    );
    err.code = "AWS_NOT_CONFIGURED";
    throw err;
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  } catch (networkErr) {
    const err = new Error(`Could not reach the backend service: ${networkErr.message}`);
    err.code = "AWS_NOT_CONFIGURED";
    throw err;
  }

  if (!response.ok) {
    // backend/server.js answers every failure with { error: { code, message } }
    // and never an observation. Keep that code: "Bedrock refused the call"
    // (AWS_ERROR) is a different fact from "no backend configured".
    const coded = await response.json().then((body) => body?.error, () => null);
    const err = new Error(coded?.message || `Backend returned HTTP ${response.status}`);
    err.code = typeof coded?.code === "string" ? coded.code : "AWS_NOT_CONFIGURED";
    throw err;
  }

  return response.json();
}

/**
 * @param {File} file
 * @returns {Promise<{ base64: string, mimeType: string }>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const [, base64] = String(reader.result).split(",");
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  });
}
