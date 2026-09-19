import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
const client = new BedrockRuntimeClient({ region: "ap-south-1" });
async function test() {
  const start = Date.now();
  const res = await client.send(
    new InvokeModelCommand({
      modelId: "anthropic.claude-sonnet-5",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 100,
        messages: [{ role: "user", content: "Hello, reply with just 'Hi'." }]
      })
    })
  );
  console.log("Latency:", Date.now() - start);
  console.log("Response:", new TextDecoder().decode(res.body));
}
test().catch(console.error);
