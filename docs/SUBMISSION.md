# Submission Narrative

**Selected mode: live AWS observation through Amazon Rekognition; Amazon Bedrock blocked** (as of 2026-09-20).
The original intended multimodal observer was Amazon Bedrock. It never returned a successful response: AWS Support
confirmed that the newly created account had temporary service and model restrictions. The final live upload path
therefore uses Amazon Rekognition `DetectLabels`, verified on the public deployment (`docs/CANONICAL_RUN.md` section 2c).
The fixture demo is separate and labelled. The "Mode A" copy at the end of this file is a Bedrock template that must not
be used unless `docs/CANONICAL_RUN.md` section 3 is complete.

## Problem

An e-Challan cites a violation and attaches a photograph as evidence. When the photo does
not appear to show the cited violation, the driver has to inspect it, reason about the gap,
and decide what to do next, alone. ChallanCheck makes that comparison explicit and reviewable.
It helps Indian drivers who received an automated e-Challan.

## What we built

ChallanCheck is an evidence-consistency engine. It compares one cited violation with
observable facts in the attached photograph, using a strict boundary:

```
source evidence → visual observation → structured facts → deterministic evaluation → result
```

The observer (Amazon Rekognition in the live upload path, a labelled local fixture adapter in the demo; Amazon Bedrock
was the original design) only produces structured facts. Application code alone evaluates them against the selected claim and returns
one of `OBSERVABLE_INCONSISTENCY`, `CONSISTENT_WITH_EVIDENCE` (shown as "No Mismatch Found"),
`INSUFFICIENT_EVIDENCE` or `UNSUPPORTED_CHECK`. It never decides guilt, innocence, legal validity,
or what the user should do.

### What works (each item is executed by `npm test` or visible in the running app)

- **Claim handling.** Free-text violation labels map to canonical claims, tolerate OCR-style typos,
  and refuse to invent a claim from compliance-sounding text ("No helmet violation detected").
  If a challan cites several offences, all are surfaced and the user must choose one; nothing is
  chosen silently (`backend/src/violationClassifier.js`, 13 adversarial traps).
- **Observation schema.** Every observation is validated; a malformed one degrades to
  `INSUFFICIENT_EVIDENCE` instead of crashing (`backend/src/observationSchema.js`). For the Rekognition observer the
  `occlusion` and `image_quality` fields gained an explicit `"unknown"`, so "not measured" is never recorded as "none" or "good".
- **Deterministic rule engine.** 14 pre-registered adversarial cases plus unit tests. Its one supported
  check is "riding without helmet" against vehicle type and helmet observation.
- **Uncertainty handling.** Low confidence, poor image quality, severe occlusion or an unknown vehicle
  produce `INSUFFICIENT_EVIDENCE`: the engine says it cannot tell instead of guessing.
- **Unsupported-check behaviour.** Speeding, red-light, plate-mismatch and PUC claims are recognised and
  answered `UNSUPPORTED_CHECK`, because one still photo cannot confirm or refute them.
- **Fixture observations.** Six labelled scenarios drive the demo and cover all four results. They are
  canned, carry `meta.source = "fixture"`, and the UI says "Demo fixture — not live AWS evidence".
- **UI.** Three screens (evidence, claim selection, report), verified live in a browser earlier
  (`docs/QA_REPORT.md`); build and lint pass.
- **Live observation through Amazon Rekognition.** `backend/src/rekognitionAdapter.js` calls `DetectLabels`
  (`GENERAL_LABELS` + `IMAGE_PROPERTIES`) and normalizes the response into the schema. The mapping is conservative and
  pinned by 62 tests (some run against a trimmed copy of the real response): a missing label is never read as absence; helmet is
  `uncertain` unless a helmet is detected at the head of every detected person (never `not_visible`); two different vehicle
  types in one photo give an unknown vehicle; plate text and occlusion are not claimed.
- **Failure honesty.** The backend returns a coded error and no observation when Rekognition fails
  (`AWS_ERROR`, `AWS_NOT_CONFIGURED`, or `UNSUPPORTED_IMAGE` for a WebP/GIF, refused before any AWS call); tests pin that
  at the adapter, the server, the Lambda and the frontend client.
- **AWS deployment and live run.** The web app and API are deployed at https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com
  (API Gateway → one Lambda, `ap-south-1`). On 2026-09-20 a real photo was uploaded through the public app in a real browser:
  one `POST /api/audit` → HTTP 200 with `meta.source = "amazon_rekognition"`, and the report was badged "Live AWS
  observation · Amazon Rekognition". The Lambda log and CloudTrail show the Rekognition call; the function's IAM role allows
  `rekognition:DetectLabels` and nothing on Bedrock. The result for that photo was Insufficient Evidence, because Rekognition
  labelled both a car and a motorcycle (`docs/CANONICAL_RUN.md` section 2c).

### What is blocked

Amazon Bedrock multimodal execution, the original design. One real photo has been analysed end to end through Rekognition,
but nothing here demonstrates accuracy or repeatability across real challan photos, and Rekognition cannot establish helmet
use, so a helmet claim ends as Insufficient Evidence unless a helmet is positively detected.

### Why Bedrock was blocked (exact record, executed 2026-09-19)

Every `InvokeModel` call from our AWS account (`ap-south-1`, profile `global.anthropic.claude-sonnet-5`)
fails in about half a second with `ValidationException: Operation not allowed`, for text-only and for
image requests alike. The account's applied quota for "Global cross-region model inference tokens per
minute for Anthropic Claude Sonnet 5" is `0`, against an AWS default of `6,000,000`, and Bedrock reports
the model `NOT_AUTHORIZED` for the account. AWS Support later confirmed that the account, being newly created,
had temporary restrictions on some services and model access; they were not lifted during the event, which is why
the live path uses Rekognition instead. Full command record: `docs/CANONICAL_RUN.md` section 2.

## Where AWS fits

Amazon Rekognition `DetectLabels` is the visual observer on the live upload path, and only that.
`backend/src/rekognitionAdapter.js` sends the image bytes (never the challan text), maps the returned labels, instance boxes
and image-quality measurements into the observation schema, validates it, and raises a coded error (`AWS_NOT_CONFIGURED`,
`AWS_ERROR`, `UNSUPPORTED_IMAGE`) on any failure instead of substituting data. It reports only what Rekognition returns:
helmet use, plate text and occlusion are not established by label detection, so they are left `uncertain` / `unknown` and
listed in the observation's `uncertainties`. Rekognition never decides anything; the deterministic rule engine does.

Amazon Bedrock (Claude) was the original design. `backend/src/bedrockAdapter.js` is implemented and tested against real AWS
state, but the account never let a call succeed, so it is not on the live path and the deployed role cannot call it.

## Architecture: current vs target

**CURRENT (what exists)**

*Locally:*

```
React/Vite app ──┬─ "Explore an example" → fixture adapter (canned observation, no AWS call)
                 └─ "Upload evidence"    → POST /audit → local Node relay → Amazon Rekognition DetectLabels
         schema validation → deterministic rule engine (same module, runs in the browser) → result
```

*Deployed on AWS* (`ap-south-1`, verified 2026-09-20, record in `docs/CANONICAL_RUN.md` section 2c):

```
browser ──► API Gateway (HTTP API) ──► one Lambda ──► Amazon Rekognition (DetectLabels)
              POST /audit and            · serves the built web app (static files)
              POST /api/* throttled      · GET /health, POST /audit (image → observation relay);
                                           also served as /api/health and /api/audit
```

Public URL: https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com
The Lambda sends the uploaded image to Rekognition, normalizes the labels into the observation schema, validates it, and
returns `{ observation, meta }` with `meta.source = "amazon_rekognition"`; on any failure it returns a coded error and no
observation. The site's demo mode is the same labelled fixture demo, and nothing on it is presented as live. The rule
engine still runs in the browser: AWS observes, application code evaluates.

**Original target:** the same shape with Amazon Bedrock as the observer. It was not achievable in the event because the
account's Bedrock access stayed restricted; the Bedrock adapter remains in the repository, unused by the deployed function.

**AWS services deployed:** API Gateway (HTTP API), Lambda, IAM (one least-privilege execution role: `rekognition:DetectLabels`
and its own log group), CloudWatch Logs, and one private S3 bucket that holds only the deployment zip. Amazon Rekognition
is called, not provisioned. Nothing else is deployed.
One Lambda serves both the static app and the API, so there is one origin (no CORS) and no separate hosting stack.

**Cost drivers (no prices claimed):** the static files are small and served by the same request-driven function, so
there is no always-on server; API Gateway and Lambda bill per request and nothing while idle; **Rekognition `DetectLabels`
is the primary variable AI cost** (billed per image; unmeasured here); no database is used because the core flow persists
nothing; and nothing runs idle.

**Ship It readiness: DEPLOYED, live observation through Amazon Rekognition.** AWS-hosted frontend and API: **yes**. Live AWS
observation of an uploaded photo: **yes**, Amazon Rekognition, verified in a real browser and with curl on the public URL
(2026-09-20). Amazon Bedrock, the original intended observer: implemented in code, never ran successfully because the account
was restricted, and is not on the live path. Fixture demo: separate, labelled, proven locally and on the public site.
Silent fallback to fixtures on the live path: none.

## What we learned

Seven real events, each traceable in this repository (`docs/LEARNING.md`):

1. **Let the model observe, and let the evaluator refuse.** A rule engine with no confidence gate turned a 60%-confidence "car" into a confident inconsistency; the observation now carries its doubt.
2. **A false positive is worse than a miss.** Our own OCR-tolerance fix fabricated two claims that red-team traps caught.
3. **Live and fixture adapters must never silently stand in for each other.** Provenance is a field, and failures keep their real cause.
4. **Region, model and account access are architecture.** Inference-profile-only models and a zero applied quota cost us hours we spent waiting for "propagation".
5. **Contracts must be tested across the boundary.** A 10 MB UI limit against a 5 MB server limit was invisible to each side's own tests.
6. **Platform limits are part of the contract, and only the live platform shows them.** A 4.63 MB photo, which the UI accepted, became a 6.47 MB request that the deployed gateway refused with a bare 413 above Lambda's 6 MB limit before any of our code ran. The limit is now 3 MB, pinned by a test.
7. **Run the stated contract literally against the live URL.** The previously deployed version answered `GET /health` with HTTP 200 `text/html` (unknown paths fell through to the single-page app, which looks healthy and is not) and `POST /audit` with a plain-text 405; only the `/api/*` forms worked. Both now return coded JSON, and the throttle that guards Bedrock covers every path that can reach it, pinned by tests (commit `110e283`, `docs/LEARNING.md` Learning 8).

## AI disclosure

AI coding agents were used for product ideation, task management, implementation, red-team review,
UI verification and documentation. The tools named in the repository's own logs
(`docs/AGENT_LOG.md`, `docs/AI_COORDINATION.md`, `docs/QA_REPORT.md`) are Antigravity, Gemini (documentation),
Claude (implementation and a red-team resweep), Muse (tests) and opencode (UI verification scripts).
Repository history is written under one human git identity.
In the fixture demo no AI model runs: the fixture adapter returns canned observations. In the live upload path Amazon
Rekognition, a managed computer-vision service rather than a generative model, produces the observations, and
deterministic application code evaluates them. The Bedrock adapter is written to call Claude on Amazon Bedrock, but it
never executed successfully.

---

## Mode A — LIVE AWS VERIFIED (template; NOT SELECTED)

Use only after every step in `docs/CANONICAL_RUN.md` section 3 is complete, and replace the bracketed
values with that run's recorded output.

**Build.** ChallanCheck compares an e-Challan's cited violation with structured visual observations of its
photograph. Observations come from Amazon Bedrock; application code alone evaluates them.

**AWS usage.** A real photo was sent to Amazon Bedrock ([model id], [region]) through `backend/src/bedrockAdapter.js`,
returned a schema-valid observation in [latency] ms, and was evaluated by the deterministic rule engine
(see the recorded run). The Mode B limitations about unsupported claims and single-photo evidence still apply.
