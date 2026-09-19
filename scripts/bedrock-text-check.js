// Phase-6 gate check: ONE minimal text-only Bedrock call through the same AWS SDK
// client, credential chain, region and model the real adapter uses. Run this
// before the multimodal spike — it separates "account/permissions/model access"
// problems from "image handling" problems in a single cheap call.
//
//   npm run check:bedrock-text     (override with AWS_REGION / BEDROCK_MODEL_ID)
//
// Exit 0 only on a real, successful model response. No mocks, no fallback.

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DEFAULT_REGION, DEFAULT_MODEL_ID } from "../backend/src/bedrockAdapter.js";

const region = process.env.AWS_REGION || DEFAULT_REGION;
const modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;

console.log(`Region: ${region}\nModel:  ${modelId}`);

const start = Date.now();
try {
  const client = new BedrockRuntimeClient({ region });
  const response = await client.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 20,
        messages: [{ role: "user", content: "Reply with exactly the single word: pong" }],
      }),
    })
  );
  const latencyMs = Date.now() - start;
  const raw = JSON.parse(new TextDecoder().decode(response.body));
  const text = raw?.content?.find((block) => block?.type === "text")?.text ?? "";
  console.log(`PASS  latencyMs=${latencyMs}  reply=${JSON.stringify(text)}`);
} catch (err) {
  console.error(`FAIL  ${err.name}: ${err.message}  (after ${Date.now() - start} ms)`);
  process.exitCode = 1;
}
