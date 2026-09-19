// P0-02: the real Bedrock adapter — the only file in this codebase allowed to
// call AWS. Shares its output contract with fixtureAdapter.js so callers can
// swap between them without changing anything downstream (see runAudit.js).
//
// If AWS isn't configured, this throws an Error with `.code === "AWS_NOT_CONFIGURED"`
// instead of silently returning fixture-shaped data — per explicit human
// instruction, production mode must never fall back to fixtures quietly.
// Live AWS status stays UNKNOWN until this succeeds against a real account.

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { validateObservation } from "./observationSchema.js";

export const DEFAULT_REGION = "ap-south-1";

// Must be an inference-profile ID, not a bare model ID: in ap-south-1 the
// Claude models are INFERENCE_PROFILE-only (aws bedrock list-foundation-models,
// 2026-09-19), so a bare ID such as "anthropic.claude-sonnet-5" is not invokable
// on demand. This one was ACTIVE in `aws bedrock list-inference-profiles`.
// It is a candidate, not a verified choice — no invocation has succeeded yet
// (account gate, docs/TASK_BOARD.md P0-01). Override with BEDROCK_MODEL_ID,
// e.g. apac.anthropic.claude-3-5-sonnet-20241022-v2:0 (APAC-resident) or
// global.anthropic.claude-haiku-4-5-20251001-v1:0 (faster/cheaper).
export const DEFAULT_MODEL_ID = "global.anthropic.claude-sonnet-5";

const SYSTEM_PROMPT = `You are a visual observation tool. Look at the attached traffic evidence photo and report ONLY what is visually observable.

Do NOT determine guilt, innocence, legality, or whether any traffic violation occurred. Do NOT reason about the challan text. Only describe the image.

Respond with ONLY minified JSON matching exactly this shape, no prose, no markdown fences:
{"vehicle_type":{"value":"motorcycle|scooter|car|truck|bus|auto_rickshaw|unknown","confidence":0-1},"people_visible":{"value":<int>,"confidence":0-1},"helmet":{"status":"visible|not_visible|uncertain|not_applicable","confidence":0-1},"license_plate":{"visible":<bool>,"text":<string|null>,"confidence":0-1},"image_quality":"good|moderate|poor","occlusion":"none|partial|severe","uncertainties":[<string>]}

If you cannot tell something confidently, use "uncertain"/"unknown" and a low confidence rather than guessing.`;

function isCredentialsError(err) {
  const haystack = `${err?.name ?? ""} ${err?.message ?? ""}`.toLowerCase();
  return /credential|could not load|unable to locate/i.test(haystack);
}

/**
 * Parses the model's JSON reply. Models occasionally wrap the JSON in a
 * ```json fence or add a sentence around it despite the prompt. That envelope
 * is tolerated here; the parsed object still goes through the strict
 * validateObservation() check, so the schema itself is never loosened.
 * @throws {SyntaxError} if no JSON object can be recovered
 */
export function parseModelJson(text) {
  const trimmed = String(text ?? "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
    return JSON.parse(candidate);
  }
}

/**
 * @param {object} input
 * @param {string} input.imageBase64 - base64-encoded image bytes (no data: prefix)
 * @param {string} input.mimeType - e.g. "image/jpeg"
 * @param {string} [input.region]
 * @param {string} [input.modelId]
 * @returns {Promise<{ observation: object, meta: { source: "bedrock", region: string, modelId: string, latencyMs: number } }>}
 * @throws {Error} with `.code = "AWS_NOT_CONFIGURED"` if credentials are missing,
 *   or `.code = "AWS_ERROR"` for any other failure (network, model not enabled, malformed response, etc.)
 */
export async function observeEvidenceViaBedrock({
  imageBase64,
  mimeType,
  region = process.env.AWS_REGION || DEFAULT_REGION,
  modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID,
}) {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024, // a truncated JSON reply fails parsing; leave room for verbose uncertainties
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
          { type: "text", text: "Report the observation JSON for this image." },
        ],
      },
    ],
  };

  let response;
  const start = Date.now();
  try {
    const client = new BedrockRuntimeClient({ region });
    response = await client.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body),
      })
    );
  } catch (err) {
    if (isCredentialsError(err)) {
      const notConfigured = new Error(
        `AWS credentials are not configured for this environment (${err.message}).`
      );
      notConfigured.code = "AWS_NOT_CONFIGURED";
      notConfigured.cause = err;
      throw notConfigured;
    }
    const awsError = new Error(`Bedrock call failed (${err.name ?? "Error"}): ${err.message}`);
    awsError.code = "AWS_ERROR";
    awsError.cause = err;
    throw awsError;
  }
  const latencyMs = Date.now() - start;

  const raw = JSON.parse(new TextDecoder().decode(response.body));
  const text = raw?.content?.find((block) => block?.type === "text")?.text ?? "";

  let observation;
  try {
    observation = parseModelJson(text);
  } catch {
    const parseError = new Error("Bedrock response was not valid JSON.");
    parseError.code = "AWS_ERROR";
    throw parseError;
  }

  const { valid, errors } = validateObservation(observation);
  if (!valid) {
    const schemaError = new Error(`Bedrock response failed schema validation: ${errors.join("; ")}`);
    schemaError.code = "AWS_ERROR";
    throw schemaError;
  }

  return { observation, meta: { source: "bedrock", region, modelId, latencyMs } };
}
