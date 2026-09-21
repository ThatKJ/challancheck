// Single place for landing copy. Every claim here is backed by the repository
// (README.md, backend/src, frontend/src/lib). Nothing is invented.

export const NAV = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#workflow" },
  { label: "Technology", href: "#architecture" },
  { label: "Why ChallanCheck", href: "#principles" },
];

export const HERO_STORY_BEATS = [
  {
    tag: "EVIDENCE CONSISTENCY ENGINE · e-CHALLANS",
    kicker: "00 · INTRO",
    title: ["Check the evidence.", "Not just the challan."],
    body: "ChallanCheck compares a cited traffic violation with observable evidence from the attached image — without turning an AI model into the decision maker.",
  },
  {
    tag: "AN e-CHALLAN, OPENED AS EVIDENCE",
    kicker: "01 · EVIDENCE",
    title: ["One photograph,", "opened as evidence."],
    body: "One challan, one cited violation, one attached image. That image becomes the record under review.",
  },
  {
    tag: "THE PHOTO BECOMES FACTS",
    kicker: "02 · OBSERVE",
    title: ["The photo becomes", "structured facts."],
    body: "Amazon Rekognition reads the image for labels and measurements — vehicles, people, a licence plate, image quality. Each label carries its own confidence.",
  },
  {
    tag: "KEEP THE LAYERS APART",
    kicker: "03 · SEPARATE",
    title: ["Claim. Evidence.", "Observation."],
    body: "The claim and what the image can actually support are kept apart. Nothing is silently merged.",
  },
  {
    tag: "UNCERTAINTY STAYS VISIBLE",
    kicker: "04 · DATA LAYER",
    title: ["Facts, with", "doubt intact."],
    body: "Uncertainty is a first-class field, not a footnote. Low confidence stays visible in the record.",
  },
  {
    tag: "AI OBSERVES. CODE EVALUATES.",
    kicker: "05 · EVALUATE",
    title: ["Observations in.", "Deterministic rules out."],
    body: "Observations feed deterministic application rules. The model never decides the result — code does.",
  },
  {
    tag: "THE ENGINE DOES NOT GUESS",
    kicker: "06 · RESULT",
    title: ["Insufficient evidence.", "Reported as written."],
    body: "When the picture can't support a conclusion, the result says so — and shows you why.",
  },
  {
    tag: "THE SAME FIVE STEPS, EVERY REVIEW",
    kicker: "07 · PIPELINE",
    title: ["Claim → Evidence →", "Observation → Evaluation → Result"],
    body: "Five steps, readable start to finish. This is the whole product in one line.",
  },
];

export const PROBLEM = {
  eyebrow: "WHY IT EXISTS",
  title: ["An e-Challan", "has two sides."],
  claim: {
    tag: "CLAIM",
    label: "What the challan cites",
    line: "“Riding without helmet”",
    note: "The written violation, as it appears on the notice.",
  },
  evidence: {
    tag: "EVIDENCE",
    label: "What the photograph shows",
    note: "The attached image, as it was captured.",
  },
  line: "Sometimes the two sides don't tell the same story.",
  after: "ChallanCheck makes the relationship between them explicit. It never decides who is right.",
};

export const WORKFLOW = {
  eyebrow: "HOW IT WORKS",
  title: ["One claim.", "Focused steps."],
  steps: [
    {
      n: "01",
      name: "CLAIM",
      lines: ["What violation", "was cited?"],
      body: "You enter the violation exactly as written on the challan. Recognised text maps to one canonical claim.",
    },
    {
      n: "02",
      name: "EVIDENCE",
      lines: ["What does the photo", "actually show?"],
      body: "The attached image becomes the record under review — nothing more, nothing less.",
    },
    {
      n: "03",
      name: "OBSERVATION",
      lines: ["Visible information", "becomes facts."],
      body: "Labels and image measurements become structured fields, each with a confidence where one exists.",
    },
    {
      n: "04",
      name: "EVALUATION",
      lines: ["Deterministic logic", "compares the two."],
      body: "Application rules compare the selected claim against those observations and return one result.",
    },
  ],
  result: "RESULT",
  mantra: "AI observes. Code evaluates.",
};

export const DECISION = {
  eyebrow: "THE CORE DIFFERENTIATOR",
  title: ["AI should not", "make the decision."],
  intro:
    "The model's observations and the application's decision are separate systems. That separation is the product.",
  observation: {
    tag: "OBSERVATION",
    source: "Amazon Rekognition · DetectLabels",
    rows: [
      ["Vehicle", "unknown", "—"],
      ["Helmet", "uncertain", "—"],
      ["People", "4", "88%"],
      ["Image quality", "good", "—"],
      ["License plate", "visible", "72%"],
    ],
    note: "The observer sees the image only. It returns labels and measurements, never a verdict. Shown: the normalised observation from a recorded run.",
  },
  evaluation: {
    tag: "DETERMINISTIC EVALUATION",
    rows: [
      ["Claim", "Riding without helmet"],
      ["Rule", "WITHOUT_HELMET → vehicle + helmet status"],
      ["Result", "Insufficient Evidence", true],
    ],
    note: "Application code alone produces the result. The rule engine imports nothing but the observation schema.",
  },
};

export const UNCERTAINTY = {
  eyebrow: "WE DON'T GUESS",
  title: ["Uncertainty is", "a valid result."],
  intro:
    "A photo can be blurry, cropped, overcast, or simply ambiguous. ChallanCheck would rather refuse than invent an answer.",
  chips: [
    ["HELMET", "uncertain"],
    ["IMAGE QUALITY", "poor"],
    ["OCCLUSION", "severe"],
  ],
  result: "INSUFFICIENT EVIDENCE",
  line: "When the evidence isn't strong enough, ChallanCheck says so.",
  note: "A refused conclusion is a feature. It keeps an uncertain photo from being read as proof.",
};

export const CLAIMS = {
  eyebrow: "MULTIPLE CLAIMS",
  title: ["One challan can cite", "several offences."],
  intro:
    "The engine never silently chooses a violation for you. Every candidate is surfaced; you select one; one claim is evaluated per review.",
  steps: [
    { tag: "ONE CHALLAN", lines: ["“Overspeeding and", "jumping the red light”"], note: "The violation text cites more than one offence." },
    { tag: "CANDIDATES", lines: ["Over speeding", "Red-light violation"], note: "Both recognised claims are surfaced, in pattern order." },
    { tag: "YOUR CHOICE", lines: ["You select one", "claim to audit"], note: "The rest stay unevaluated — and are said to be so." },
    { tag: "ONE EVALUATION", lines: ["One claim →", "one result"], note: "Focused, reviewable, honest about what is not covered." },
  ],
};

export const PRINCIPLES = [
  {
    n: "01",
    name: "No silent assumptions",
    body: "A missing label is never read as absence. If the image doesn't establish a fact, the fact stays unknown.",
  },
  {
    n: "02",
    name: "Uncertainty is a valid result",
    body: "When the evidence can't support a conclusion, the engine refuses to guess and says exactly why.",
  },
  {
    n: "03",
    name: "AI observes. Code evaluates.",
    body: "The vision model describes the image. Deterministic application rules alone produce the verdict.",
  },
];

export const ARCHITECTURE = {
  eyebrow: "TECHNOLOGY · AWS",
  title: ["Where the evidence", "travels."],
  intro:
    "One origin, one request, no database, nothing persisted. The observer and the evaluator are separate by construction.",
  flow: [
    { node: "Browser", sub: "your review · deterministic evaluation runs here", kind: "start" },
    { node: "API Gateway", sub: "HTTP API · one origin, no CORS", kind: "mid" },
    { node: "Lambda", sub: "serves the web app and relays the photo", kind: "mid" },
    { node: "Amazon Rekognition", sub: "DetectLabels · observes only", kind: "obs" },
    { node: "Observation schema", sub: "validated facts, doubt intact", kind: "mid" },
    { node: "Deterministic evaluation", sub: "application code → one result", kind: "eval" },
  ],
  side: [
    { k: "rekognition:DetectLabels", v: "only IAM action", kind: "neutral" },
    { k: "JPG / PNG · ≤ 3 MB", v: "one photo per review", kind: "neutral" },
    { k: "No database", v: "nothing is persisted", kind: "neutral" },
    { k: "Development preview", v: "public, unauthenticated", kind: "warn" },
  ],
  foot: "Amazon Bedrock, the original intended observer, remained blocked on this account and is not on the live path. Live observation runs on Amazon Rekognition.",
};

export const UNDER_THE_HOOD = {
  eyebrow: "UNDER THE HOOD",
  title: ["Read the", "evaluation."],
  intro:
    "A review is one observation schema, one deterministic rule set, one result enum. Everything below is the actual logic in backend/src — no pruned copy.",
  observation: {
    tag: "THE OBSERVATION",
    sub: "detectlabels → frozen observation schema",
    note: "Exactly the schema validateObservation enforces. This is the fixture scenario shown in the product preview (car_no_helmet), tagged meta.source = \"fixture\".",
    fields: [
      ["vehicle_type", "{ value: \"car\", confidence: 0.95 }"],
      ["people_visible", "{ value: 1, confidence: 0.9 }"],
      ["helmet", "{ status: \"not_applicable\", confidence: 0.9 }"],
      ["license_plate", "{ visible: true, text: \"KA01AB1234\", confidence: 0.8 }"],
      ["image_quality", "\"good\""],
      ["occlusion", "\"none\""],
      ["uncertainties", "[]"],
    ],
  },
  rule: {
    tag: "THE RULE · WITHOUT_HELMET",
    sub: "backend/src/ruleEngine.js · evaluateWithoutHelmet()",
    gates: [
      { name: "Schema gate", check: "validateObservation passes", g: "both" },
      { name: "Quality gate", check: "image_quality ≠ poor && occlusion ≠ severe", g: "ie" },
      { name: "Confidence gate", check: "vehicle_type.confidence ≥ 0.7", g: "ie" },
      { name: "Exempt vehicles", check: "car · truck · bus · auto_rickshaw → mismatch", g: "mi" },
      { name: "Two-wheeler", check: "motorcycle || scooter", g: "ie" },
      { name: "Helmet status", check: "visible / not_visible / uncertain", g: "diff" },
    ],
  },
  outcomes: {
    tag: "THE FOUR OUTCOMES",
    sub: "backend/src/ruleEngine.js · RESULTS",
    rows: [
      ["OBSERVABLE_INCONSISTENCY", "Evidence Mismatch Found", "mi"],
      ["CONSISTENT_WITH_EVIDENCE", "No Mismatch Found", "go"],
      ["INSUFFICIENT_EVIDENCE", "Insufficient Evidence", "ie"],
      ["UNSUPPORTED_CHECK", "Cannot Verify From a Single Photo", "uns"],
    ],
  },
  table: {
    claim: "WITHOUT_HELMET",
    cols: ["Vehicle", "Helmet", "Outcome"],
    rows: [
      ["motorcycle", "not_visible ≥ 0.7", "CONSISTENT_WITH_EVIDENCE", "go"],
      ["motorcycle", "visible ≥ 0.7", "OBSERVABLE_INCONSISTENCY", "mi"],
      ["motorcycle", "uncertain", "INSUFFICIENT_EVIDENCE", "ie"],
      ["car", "—", "OBSERVABLE_INCONSISTENCY", "mi"],
      ["unknown", "—", "INSUFFICIENT_EVIDENCE", "ie"],
      ["any", "image_quality poor / occlusion severe", "INSUFFICIENT_EVIDENCE", "ie"],
      ["any", "confidence < 0.7", "INSUFFICIENT_EVIDENCE", "ie"],
    ],
  },
  foot: "One rule set. One schema. No model decides the result — the rule engine reads structured fields only.",
};

export const FINAL_CTA = {
  title: ["Review the", "evidence."],
  body: "ChallanCheck makes the relationship between a claim and its evidence explicit.",
  primary: "Try ChallanCheck",
  hrefPrimary: "#/review",
  secondary: "View on GitHub",
  hrefSecondary: "https://github.com/ThatKJ/challancheck",
};

export const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#workflow" },
  { label: "Technology", href: "#architecture" },
  { label: "GitHub", href: "https://github.com/ThatKJ/challancheck" },
  { label: "Try ChallanCheck", href: "#/review" },
];

export const REVIEW_HREF = "#/review";