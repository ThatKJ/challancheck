import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import {
  normalizeLabels,
  observeEvidenceViaRekognition,
  OBSERVER_SOURCE,
  MIN_CONFIDENCE,
} from "../../backend/src/rekognitionAdapter.js";
import { validateObservation } from "../../backend/src/observationSchema.js";
import { auditEvidence } from "../../backend/src/auditEvidence.js";
import { RESULTS } from "../../backend/src/ruleEngine.js";
import { createLambdaHandler } from "../../backend/lambda.js";

// Amazon Rekognition only observes. These tests pin how its DetectLabels output becomes
// an observation, that anything Rekognition cannot establish stays "not established"
// (never a guess, never "no helmet"), and that a failure is a coded error, never fixtures.
// No test here calls AWS: the SDK client is an injected stub.

const label = (Name, Confidence, extra = {}) => ({ Name, Confidence, ...extra });
const box = (Left, Top, Width, Height) => ({ Left, Top, Width, Height });
const instance = (Confidence, BoundingBox) => ({ Confidence, BoundingBox });
const GOOD = { Quality: { Brightness: 60, Sharpness: 80, Contrast: 70 } };
const response = (Labels, ImageProperties = GOOD) => ({ Labels, LabelModelVersion: "3.0", ImageProperties });
const claim = (observation, violationText = "Riding without helmet") => auditEvidence({ violationText, observation }).result.status;

// A person whose head (upper half of the box) is around (0.5, 0.34).
const RIDER = instance(97, box(0.4, 0.3, 0.2, 0.4));
const HELMET_AT_HEAD = instance(91, box(0.47, 0.31, 0.06, 0.06));
const motorcycleScene = (...extra) =>
  response([
    label("Motorcycle", 96, { Instances: [instance(96, box(0.2, 0.4, 0.5, 0.5))] }),
    label("Person", 97, { Instances: [RIDER] }),
    ...extra,
  ]);

// The real DetectLabels response for demo_image.png (ap-south-1, 2026-09-20, request
// 3b4b2574-7196-45e5-a9c6-c2b4113c7ed6), trimmed to the labels that matter here. A grey car
// with a driver in sunglasses; the green auto-rickshaw at the left edge came back as
// "Motorcycle" (94.6%, Left 0). No Helmet label exists in the response.
const REAL_DEMO_RESPONSE = {
  Labels: [
    label("Car", 99.6743, { Aliases: [{ Name: "Automobile" }], Instances: [instance(99.6743, box(0.1502, 0.2216, 0.7532, 0.712)), instance(97.8409, box(0.1266, 0.282, 0.1339, 0.1752))] }),
    label("Vehicle", 99.6743),
    label("Glasses", 98.341, { Instances: [instance(98.341, box(0.3809, 0.3247, 0.0551, 0.022))] }),
    label("Person", 97.5644, {
      Aliases: [{ Name: "Human" }],
      Instances: [
        instance(97.5644, box(0.0149, 0.2899, 0.069, 0.0601)),
        instance(97.434, box(0.3422, 0.2832, 0.1361, 0.1594)),
        instance(96.2111, box(0.1714, 0.3061, 0.0253, 0.0341)),
        instance(88.4164, box(0.2175, 0.3014, 0.0319, 0.0395)),
      ],
    }),
    label("Motorcycle", 94.6125, { Instances: [instance(94.6125, box(0, 0.246, 0.1176, 0.2853))] }),
    label("License Plate", 72.4667, { Instances: [instance(72.4667, box(0.5426, 0.7057, 0.2028, 0.0692))] }),
  ],
  LabelModelVersion: "3.0",
  ImageProperties: { Quality: { Brightness: 64.2843, Sharpness: 80.7132, Contrast: 79.6268 } },
};

describe("normalizeLabels: the real demo_image.png response", () => {
  const observation = normalizeLabels(REAL_DEMO_RESPONSE);

  it("keeps only what was observed and marks the rest as not established", () => {
    expect(observation).toMatchObject({
      vehicle_type: { value: "unknown", confidence: 0 }, // Car 99.7% AND Motorcycle 94.6%: which vehicle is the claim about?
      people_visible: { value: 4, confidence: 0.8842 }, // instance count, weakest instance
      helmet: { status: "uncertain", confidence: 0 }, // no Helmet label: not "no helmet"
      license_plate: { visible: true, text: null, confidence: 0.7247 }, // detected, never read
      image_quality: "good",
      occlusion: "unknown",
    });
    expect(validateObservation(observation)).toEqual({ valid: true, errors: [] });
  });

  it("says why the vehicle is unknown and lists every unsupported field", () => {
    const text = observation.uncertainties.join("\n");
    expect(text).toMatch(/More than one vehicle type detected \(car 99\.7%, motorcycle 94\.6%\)/);
    expect(text).toMatch(/Helmet use is not established/);
    expect(text).toMatch(/not evidence that no helmet is worn/);
    expect(text).toMatch(/License plate text is not read/);
    expect(text).toMatch(/Occlusion is not assessed/);
  });

  it("the deterministic engine answers INSUFFICIENT_EVIDENCE to the helmet claim, not a mismatch", () => {
    expect(claim(observation)).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });
});

describe("vehicle mapping", () => {
  it.each([
    ["Car", "car"],
    ["Sedan", "car"],
    ["Automobile", "car"],
    ["Motorcycle", "motorcycle"],
    ["Motorbike", "motorcycle"],
    ["Bus", "bus"],
    ["Truck", "truck"],
  ])("label %s -> vehicle_type %s", (name, type) => {
    const { vehicle_type } = normalizeLabels(response([label(name, 92.5)]));
    expect(vehicle_type).toEqual({ value: type, confidence: 0.925 });
  });

  it("matches on an alias as well as the name", () => {
    expect(normalizeLabels(response([label("Two Wheeler", 90, { Aliases: [{ Name: "Motorbike" }] })])).vehicle_type.value).toBe("motorcycle");
  });

  it("car: the label's confidence becomes the schema confidence (0-1)", () => {
    const { vehicle_type } = normalizeLabels(response([label("Car", 99.6743), label("Sedan", 80)]));
    expect(vehicle_type).toEqual({ value: "car", confidence: 0.9967 }); // Car and Sedan are one type: no conflict
  });

  it("motorcycle: maps to motorcycle", () => {
    expect(normalizeLabels(motorcycleScene()).vehicle_type).toEqual({ value: "motorcycle", confidence: 0.96 });
  });

  it("two different vehicle types -> unknown, never the higher-confidence guess", () => {
    const observation = normalizeLabels(response([label("Car", 99), label("Motorcycle", 80)]));
    expect(observation.vehicle_type).toEqual({ value: "unknown", confidence: 0 });
    expect(observation.uncertainties.join(" ")).toMatch(/car 99\.0%, motorcycle 80\.0%/);
  });

  it("a bicycle is recognised but the schema has no bicycle type -> unknown, with the reason", () => {
    const observation = normalizeLabels(response([label("Bicycle", 95, { Aliases: [{ Name: "Bike" }] })]));
    expect(observation.vehicle_type.value).toBe("unknown");
    expect(observation.uncertainties.join(" ")).toMatch(/bicycle/i);
    expect(normalizeLabels(response([label("Bicycle", 95), label("Car", 90)])).vehicle_type.value).toBe("unknown"); // still competes with a car
  });

  it("no supported vehicle label -> unknown, and a label below the confidence floor is ignored", () => {
    for (const labels of [[], [label("Person", 97)], [label("Motorcycle", MIN_CONFIDENCE - 5)]]) {
      const observation = normalizeLabels(response(labels));
      expect(observation.vehicle_type).toEqual({ value: "unknown", confidence: 0 });
      expect(observation.uncertainties.join(" ")).toMatch(/No car, motorcycle, bus or truck label/);
    }
  });
});

describe("helmet: the absence of a Helmet label is NOT evidence of no helmet", () => {
  it.each([
    ["a motorcycle rider and no helmet label", motorcycleScene()],
    ["the real demo response", REAL_DEMO_RESPONSE],
    ["an empty label list", response([])],
    ["a car only", response([label("Car", 99)])],
  ])("%s -> helmet is uncertain at confidence 0, never not_visible", (_name, input) => {
    const { helmet, uncertainties } = normalizeLabels(input);
    expect(helmet).toEqual({ status: "uncertain", confidence: 0 });
    expect(uncertainties.join(" ")).toMatch(/not evidence that no helmet is worn/);
  });

  it("no input the adapter can see ever yields not_visible", () => {
    const scenes = [motorcycleScene(), motorcycleScene(label("Helmet", 50)), motorcycleScene(label("Hardhat", 99, { Instances: [HELMET_AT_HEAD] }))];
    for (const scene of scenes) expect(normalizeLabels(scene).helmet.status).not.toBe("not_visible");
  });

  it("a motorcycle whose helmet is unknown gets INSUFFICIENT_EVIDENCE for the helmet claim", () => {
    const observation = normalizeLabels(motorcycleScene());
    expect(observation.vehicle_type.value).toBe("motorcycle");
    expect(observation.helmet.status).toBe("uncertain");
    const { result } = auditEvidence({ violationText: "Riding without helmet", observation });
    expect(result.status).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
    expect(result.status).not.toBe(RESULTS.CONSISTENT_WITH_EVIDENCE); // "no helmet" is never confirmed from a missing label
  });

  it("maps a Helmet label to visible only when it sits at the head of the detected person", () => {
    const helmet = normalizeLabels(motorcycleScene(label("Helmet", 93, { Instances: [HELMET_AT_HEAD] }))).helmet;
    expect(helmet).toEqual({ status: "visible", confidence: 0.91 });
    expect(claim(normalizeLabels(motorcycleScene(label("Crash Helmet", 93, { Instances: [HELMET_AT_HEAD] }))))).toBe(RESULTS.OBSERVABLE_INCONSISTENCY);
  });

  it.each([
    ["below the helmet confidence floor", label("Helmet", 75, { Instances: [instance(75, box(0.47, 0.31, 0.06, 0.06))] })],
    ["a label with no instance box", label("Helmet", 95)],
    ["a helmet away from the person", label("Helmet", 95, { Instances: [instance(95, box(0.8, 0.31, 0.06, 0.06))] })],
    ["a helmet in the lower half of the person (not worn on the head)", label("Helmet", 95, { Instances: [instance(95, box(0.47, 0.6, 0.06, 0.06))] })],
    ["a hard hat, which is not a motorcycle helmet", label("Hardhat", 95, { Instances: [HELMET_AT_HEAD] })],
  ])("%s -> still uncertain", (_name, helmetLabel) => {
    expect(normalizeLabels(motorcycleScene(helmetLabel)).helmet).toEqual({ status: "uncertain", confidence: 0 });
  });

  it("a helmet on only one of two detected people -> uncertain", () => {
    const second = instance(96, box(0.7, 0.3, 0.2, 0.4));
    const scene = response([
      label("Motorcycle", 96),
      label("Person", 97, { Instances: [RIDER, second] }),
      label("Helmet", 93, { Instances: [HELMET_AT_HEAD] }),
    ]);
    expect(normalizeLabels(scene).helmet.status).toBe("uncertain");
  });
});

describe("the rule engine still owns every verdict", () => {
  it("a lone car keeps the engine's existing answer for a helmet claim", () => {
    expect(claim(normalizeLabels(response([label("Car", 99.7)])))).toBe(RESULTS.OBSERVABLE_INCONSISTENCY);
  });

  it("a claim Rekognition cannot speak to stays UNSUPPORTED_CHECK", () => {
    expect(claim(normalizeLabels(response([label("Car", 99.7)])), "Over speeding")).toBe(RESULTS.UNSUPPORTED_CHECK);
  });

  it("no vehicle at all -> INSUFFICIENT_EVIDENCE: unknown quality and occlusion never create a verdict", () => {
    const observation = normalizeLabels(response([], {}));
    expect(observation).toMatchObject({ image_quality: "unknown", occlusion: "unknown" });
    expect(claim(observation)).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });
});

describe("image quality comes only from IMAGE_PROPERTIES measurements", () => {
  const quality = (Brightness, Sharpness) => response([label("Car", 99)], { Quality: { Brightness, Sharpness, Contrast: 50 } });
  it.each([
    ["sharp and well lit", 60, 80, "good"],
    ["soft but usable", 60, 40, "moderate"],
    ["too dark for good", 20, 80, "moderate"],
    ["very blurry", 60, 10, "poor"],
    ["nearly black", 5, 80, "poor"],
    ["blown out", 96, 80, "poor"],
  ])("%s (brightness %i, sharpness %i) -> %s", (_name, brightness, sharpness, expected) => {
    expect(normalizeLabels(quality(brightness, sharpness)).image_quality).toBe(expected);
  });

  it("no measurements -> unknown, and it says so", () => {
    for (const extra of [{}, { ImageProperties: {} }, { ImageProperties: { Quality: {} } }]) {
      const observation = normalizeLabels({ Labels: [label("Car", 99)], ...extra }); // not response(): its default would supply GOOD
      expect(observation.image_quality).toBe("unknown");
      expect(observation.uncertainties.join(" ")).toMatch(/did not return image quality/);
    }
  });

  it("a poor image degrades a helmet verdict to INSUFFICIENT_EVIDENCE", () => {
    const observation = normalizeLabels({ ...motorcycleScene(label("Helmet", 93, { Instances: [HELMET_AT_HEAD] })), ImageProperties: { Quality: { Brightness: 60, Sharpness: 5 } } });
    expect(observation.helmet.status).toBe("visible");
    expect(claim(observation)).toBe(RESULTS.INSUFFICIENT_EVIDENCE);
  });
});

describe("people and licence plate: counted or detected, never invented", () => {
  it("counts Person instances, and says the count does not separate the subject from bystanders", () => {
    const observation = normalizeLabels(REAL_DEMO_RESPONSE);
    expect(observation.people_visible.value).toBe(4);
    expect(observation.uncertainties.join(" ")).toMatch(/does not separate the subject from bystanders/);
  });

  it("a Person label without instances is a stated lower bound of 1, not an exact count", () => {
    const observation = normalizeLabels(response([label("Person", 95)]));
    expect(observation.people_visible).toEqual({ value: 1, confidence: 0.95 });
    expect(observation.uncertainties.join(" ")).toMatch(/lower bound of 1/);
  });

  it("no Person label -> 0 at confidence 0, explicitly not 'nobody is visible'", () => {
    const observation = normalizeLabels(response([label("Car", 99)]));
    expect(observation.people_visible).toEqual({ value: 0, confidence: 0 });
    expect(observation.uncertainties.join(" ")).toMatch(/does not establish that nobody is visible/);
  });

  it("no License Plate label -> not detected (confidence 0), explicitly not 'no plate'; text is never read", () => {
    const observation = normalizeLabels(response([label("Car", 99)]));
    expect(observation.license_plate).toEqual({ visible: false, text: null, confidence: 0 });
    expect(observation.uncertainties.join(" ")).toMatch(/does not establish that no plate is visible/);
  });
});

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
const png64 = PNG.toString("base64");
const clientReturning = (value) => ({ send: vi.fn().mockResolvedValue(value) });
const clientRejecting = (err) => ({ send: vi.fn().mockRejectedValue(err) });
const awsError = (name, message) => Object.assign(new Error(message), { name });

describe("observeEvidenceViaRekognition", () => {
  it("is tagged as Amazon Rekognition output: source amazon_rekognition, nothing else", async () => {
    const client = clientReturning(REAL_DEMO_RESPONSE);
    const result = await observeEvidenceViaRekognition({ imageBase64: png64, mimeType: "image/png", region: "ap-south-1", client });
    expect(OBSERVER_SOURCE).toBe("amazon_rekognition");
    expect(result.meta).toMatchObject({ source: "amazon_rekognition", operation: "DetectLabels", region: "ap-south-1", labelModelVersion: "3.0", minConfidence: 70 });
    expect(typeof result.meta.latencyMs).toBe("number");
    expect(result.meta.source).not.toMatch(/bedrock|fixture/i);
    expect(result.meta.labels).toContainEqual({ name: "Motorcycle", confidence: 94.61 }); // the labels Rekognition actually returned
    expect(validateObservation(result.observation).valid).toBe(true);
    expect(result.observation).toEqual(normalizeLabels(REAL_DEMO_RESPONSE));
  });

  it("sends the uploaded bytes to DetectLabels with GENERAL_LABELS + IMAGE_PROPERTIES at MinConfidence 70", async () => {
    const client = clientReturning(REAL_DEMO_RESPONSE);
    await observeEvidenceViaRekognition({ imageBase64: png64, mimeType: "image/png", client });
    expect(client.send).toHaveBeenCalledTimes(1);
    const command = client.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(DetectLabelsCommand);
    expect(command.input.Features).toEqual(["GENERAL_LABELS", "IMAGE_PROPERTIES"]);
    expect(command.input.MinConfidence).toBe(70);
    expect(Buffer.from(command.input.Image.Bytes).equals(PNG)).toBe(true);
  });

  it("accepts JPEG too", async () => {
    const client = clientReturning(REAL_DEMO_RESPONSE);
    await expect(observeEvidenceViaRekognition({ imageBase64: png64, mimeType: "image/jpeg", client })).resolves.toHaveProperty("observation");
  });

  it.each(["image/webp", "image/gif"])("%s is refused as UNSUPPORTED_IMAGE before any AWS call", async (mimeType) => {
    const client = clientReturning(REAL_DEMO_RESPONSE);
    await expect(observeEvidenceViaRekognition({ imageBase64: png64, mimeType, client })).rejects.toMatchObject({ code: "UNSUPPORTED_IMAGE" });
    expect(client.send).not.toHaveBeenCalled();
  });

  it("a Rekognition failure is an explicit coded AWS_ERROR naming Amazon Rekognition, and resolves to nothing", async () => {
    const client = clientRejecting(awsError("AccessDeniedException", "not authorized to perform rekognition:DetectLabels"));
    let value;
    const failure = await observeEvidenceViaRekognition({ imageBase64: png64, mimeType: "image/png", client }).then((v) => ((value = v), null), (e) => e);
    expect(failure).toMatchObject({ code: "AWS_ERROR" });
    expect(failure.message).toBe("Amazon Rekognition call failed (AccessDeniedException): not authorized to perform rekognition:DetectLabels");
    expect(value).toBeUndefined(); // no observation, no fixture fallback
  });

  it("missing credentials -> AWS_NOT_CONFIGURED", async () => {
    const client = clientRejecting(awsError("CredentialsProviderError", "Could not load credentials from any providers"));
    await expect(observeEvidenceViaRekognition({ imageBase64: png64, mimeType: "image/png", client })).rejects.toMatchObject({ code: "AWS_NOT_CONFIGURED" });
  });

  it("a response without a Labels list is an AWS_ERROR, not an empty observation", async () => {
    await expect(observeEvidenceViaRekognition({ imageBase64: png64, mimeType: "image/png", client: clientReturning({}) })).rejects.toMatchObject({ code: "AWS_ERROR" });
  });
});

describe("through the Lambda handler (Rekognition client stubbed)", () => {
  const ev = (body) => ({ rawPath: "/audit", headers: {}, body: JSON.stringify(body), isBase64Encoded: false, requestContext: { http: { method: "POST" } } });
  const make = (client) => {
    const logs = [];
    const handler = createLambdaHandler({ observe: (input) => observeEvidenceViaRekognition({ ...input, client }), log: (line) => logs.push(line) });
    return { handler, logs };
  };

  it("POST /audit -> 200 { observation, meta } with source amazon_rekognition", async () => {
    const { handler, logs } = make(clientReturning(REAL_DEMO_RESPONSE));
    const res = await handler(ev({ imageBase64: png64, mimeType: "image/png" }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.meta.source).toBe("amazon_rekognition");
    expect(body.observation).toEqual(normalizeLabels(REAL_DEMO_RESPONSE));
    expect(JSON.parse(logs[0])).toMatchObject({ level: "info", status: 200, source: "amazon_rekognition" });
    expect(logs[0]).not.toContain(png64);
  });

  it("a Rekognition failure -> 502 coded AWS_ERROR, no observation, no meta, identifiers redacted", async () => {
    const client = clientRejecting(awsError("AccessDeniedException", "User: arn:aws:iam::123456789012:role/x is not authorized to perform: rekognition:DetectLabels"));
    const { handler, logs } = make(client);
    const res = await handler(ev({ imageBase64: png64, mimeType: "image/png" }));
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(502);
    expect(body.error.code).toBe("AWS_ERROR");
    expect(body).not.toHaveProperty("observation");
    expect(body).not.toHaveProperty("meta");
    for (const text of [res.body, logs.join("\n")]) expect(text).not.toMatch(/123456789012|arn:aws:iam/);
    expect(body.error.message).toMatch(/Amazon Rekognition call failed \(AccessDeniedException\)/);
  });

  it("a WebP upload -> 415 UNSUPPORTED_IMAGE without calling AWS", async () => {
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(16)]).toString("base64");
    const client = clientReturning(REAL_DEMO_RESPONSE);
    const { handler } = make(client);
    const res = await handler(ev({ imageBase64: webp, mimeType: "image/webp" }));
    expect(res.statusCode).toBe(415);
    expect(JSON.parse(res.body).error.code).toBe("UNSUPPORTED_IMAGE");
    expect(client.send).not.toHaveBeenCalled();
  });
});

const source = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const codeOnly = (file) => source(file).replace(/\/\/.*$/gm, "");

describe("the live path never uses fixtures or Bedrock (static guards)", () => {
  it.each(["backend/lambda.js", "backend/server.js", "backend/src/rekognitionAdapter.js"])("%s references neither the fixture adapter nor any Bedrock code", (file) => {
    const code = codeOnly(file);
    expect(code).not.toMatch(/fixtureAdapter|FIXTURE_SCENARIOS|observeEvidenceViaFixture/);
    expect(code).not.toMatch(/bedrockAdapter|client-bedrock-runtime|BedrockRuntimeClient|InvokeModel|observeEvidenceViaBedrock/);
  });

  it("the deployed handler and the local server both default to the Rekognition observer", () => {
    expect(codeOnly("backend/lambda.js")).toMatch(/observe = observeEvidenceViaRekognition/);
    expect(codeOnly("backend/server.js")).toMatch(/observe = observeEvidenceViaRekognition/);
  });

  it("the web app names Amazon Rekognition as the live source and never Bedrock", () => {
    const app = source("frontend/src/App.jsx");
    expect(app).toContain("amazon_rekognition");
    expect(app).toContain("Live AWS observation · Amazon Rekognition");
    for (const file of ["frontend/src/App.jsx", "frontend/src/components/ReviewPrimitives.jsx", "frontend/src/lib/audit.js"]) {
      expect(source(file)).not.toMatch(/bedrock/i);
    }
  });
});

describe("infra guard: the function role can call DetectLabels and nothing else on AWS AI services", () => {
  const template = source("infra/template.yaml").replace(/#.*$/gm, ""); // the comments explain the policy; only the YAML grants anything

  it("grants exactly rekognition:DetectLabels, in one statement, scoped to the stack's region", () => {
    expect([...template.matchAll(/rekognition:[A-Za-z*]+/g)].map((m) => m[0])).toEqual(["rekognition:DetectLabels"]);
    expect(template).toMatch(/Action: rekognition:DetectLabels\s*\n\s*Resource: "\*"\s*\n\s*Condition:\s*\n\s*StringEquals:\s*\n\s*aws:RequestedRegion: !Ref AWS::Region/);
    expect((template.match(/Resource: "\*"/g) ?? []).length).toBe(1); // only DetectLabels, which has no resource-level permissions
  });

  it("attaches no managed policy, no wildcard action, and grants nothing on Bedrock", () => {
    expect(template).not.toMatch(/ManagedPolicyArns|AmazonRekognition(Full|Read)?Access/i);
    expect(template).not.toMatch(/Action:\s*["']?\*/);
    expect(template).not.toMatch(/bedrock/i);
  });
});
