// Frontend orchestration layer. Imports the SAME logic modules the backend
// tests run against (../../../backend/src) — there is exactly one rule
// engine, one classifier, one fixture set, not a duplicated frontend copy.
// rekognitionAdapter.js is deliberately NOT imported here: it pulls in the AWS
// SDK and is server/Node-side only (used by backend/server.js and the deployed
// Lambda). See observeEvidenceViaLiveBackend below for how the frontend reaches it.

export { FIXTURE_SCENARIOS, observeEvidenceViaFixture } from "../../../backend/src/fixtureAdapter.js";
export { auditEvidence, classifyForSelection } from "../../../backend/src/auditEvidence.js";

/**
 * "Production mode" adapter: POSTs the image to the backend behind
 * VITE_API_BASE_URL, which observes it with Amazon Rekognition. Without a
 * configured backend, or if it cannot be reached, this fails honestly with
 * AWS_NOT_CONFIGURED instead of silently substituting fixture data; a coded
 * backend error keeps its own code.
 *
 * @returns {Promise<{ observation: object, meta: { source: "amazon_rekognition", ... } }>}
 * @throws {Error} with `.code = "AWS_NOT_CONFIGURED"` (or the backend's own error code)
 */
export async function observeEvidenceViaLiveBackend({ imageBase64, mimeType }) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    const err = new Error(
      "No backend is configured for live observation (VITE_API_BASE_URL is not set). Live AWS status is UNKNOWN."
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
    // and never an observation. Keep that code: "AWS refused the call"
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
