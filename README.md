# ChallanCheck

> ChallanCheck compares an e-Challan's cited violation with observable facts in its photographic
> evidence, using a strict observation-versus-evaluation architecture.

*First Commit — Bharat Builds Tour (WeMakeDevs × AWS).*
**Submission mode: live AWS observation through Amazon Rekognition (Amazon Bedrock blocked).** The original intended
multimodal observer was Amazon Bedrock. It remained unavailable because AWS Support confirmed that the newly created
account had temporary service and model-access restrictions, so the final live upload path uses **Amazon Rekognition**
instead. "Explore an example" is a separate, labelled fixture demo. See [Current AWS status](#current-aws-status).

**Deployed on AWS:** https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com (API Gateway → one Lambda that serves both the web app and the API, `ap-south-1`). On 2026-09-20 a real photo (`demo_image.png`, a local file that is not in this repository) was uploaded through this public app in a real browser: the Lambda called Amazon Rekognition `DetectLabels`, and the app showed that observation, badged "Live AWS observation · Amazon Rekognition", evaluated by the deterministic rule engine. A failed live call returns a coded error and never fixture data. Code: the commit that adds `backend/src/rekognitionAdapter.js`; record in [`docs/CANONICAL_RUN.md`](docs/CANONICAL_RUN.md) section 2c.

## Who it helps

Indian drivers who receive an automated e-Challan and want to check whether the attached photograph
actually shows the violation the notice cites.

## The problem

An e-Challan cites a violation and attaches a photograph as evidence. When the two do not appear to
match, the driver has to inspect the photo, reason about the gap, and decide what to do next, alone.
ChallanCheck makes that comparison explicit and reviewable.

| Before | With ChallanCheck |
|---|---|
| Read the notice | Enter the cited claim |
| Inspect the photo by eye | Get a structured comparison of the claim against observed facts |
| Reason about any mismatch yourself | See what is uncertain, and the stated reason for the result |

## How it works

1. **Claim.** You type the violation as written on the challan. Recognised claims are mapped to a canonical
   one (OCR-style typos tolerated). If several offences are cited, you choose which one to review; one claim
   is evaluated per review.
2. **Observation.** The evidence photo is reduced to structured facts: vehicle type, helmet status, people
   visible, plate visibility, image quality, occlusion and stated uncertainties, each with a confidence where one exists.
   In the fixture demo these come from a labelled fixture. In live mode they come from **Amazon Rekognition
   `DetectLabels`** (labels, instance boxes and image-quality measurements), normalized into the same schema.
   Rekognition only observes: it cannot say whether a rider wears a helmet, read a plate or measure occlusion, so
   those fields stay `uncertain` / `unknown` and are never inferred from a missing label.
3. **Evaluation.** Deterministic application code compares the facts with the claim and returns one of four results:

| Internal result | Shown to the user as | Meaning |
|---|---|---|
| `OBSERVABLE_INCONSISTENCY` | Evidence Mismatch Found | The observed facts conflict with the cited claim |
| `CONSISTENT_WITH_EVIDENCE` | No Mismatch Found | No contradiction was found. This is not a confirmation |
| `INSUFFICIENT_EVIDENCE` | Insufficient Evidence | Too blurry, occluded or uncertain; it refuses to guess |
| `UNSUPPORTED_CHECK` | Cannot Verify From a Single Photo | For example speed or signal timing |

Only one consistency check is implemented: **riding without helmet**. Speeding, red-light, plate-mismatch and
PUC claims are recognised and answered `UNSUPPORTED_CHECK`.

## Trust boundary

```
SOURCE EVIDENCE → VISUAL OBSERVATION → STRUCTURED FACTS → DETERMINISTIC EVALUATION → RESULT
                  Amazon Rekognition    validated against    application code only
                  (live upload) or      a fixed schema
                  a fixture adapter
                  (labelled demo)
```

- The observer sees only the image. The request to Rekognition contains the image bytes and never the challan text,
  and Rekognition returns labels and measurements, not judgements (`backend/src/rekognitionAdapter.js`). The original
  Bedrock adapter (`backend/src/bedrockAdapter.js`) is kept in the repository but is not on the live path.
- Application code alone produces the result (`backend/src/ruleEngine.js`, which imports nothing but the schema).
- The system never decides guilt, innocence, legal validity, whether to dispute a challan, or a chance of success.
- A malformed observation degrades to `INSUFFICIENT_EVIDENCE`. Unknown stays unknown. A missing Rekognition label is
  never read as absence: no Helmet label means helmet status `uncertain`, never "no helmet". A helmet is reported as
  visible only when one is positively detected at the head of every detected person. If two different vehicle types are
  detected, the vehicle is reported as `unknown` rather than guessed.
- Fixture and live paths never substitute for each other. A failed Rekognition call returns a coded error and no
  observation (`AWS_NOT_CONFIGURED` / `AWS_ERROR`; `UNSUPPORTED_IMAGE` for WebP/GIF, which Rekognition does not read),
  every live result is tagged `meta.source = "amazon_rekognition"`, and every fixture result `meta.source = "fixture"`.

## Current AWS status

**Live AWS observation is verified through Amazon Rekognition. Amazon Bedrock, the original intended observer, remained
blocked.** Command records: [`docs/CANONICAL_RUN.md`](docs/CANONICAL_RUN.md) section 2c (Rekognition, 2026-09-20) and
sections 2 and 2b (Bedrock, 2026-09-19).

| Check | Result |
|---|---|
| Amazon Rekognition `DetectLabels`, one direct CLI call (`ap-south-1`, `demo_image.png`, `GENERAL_LABELS` + `IMAGE_PROPERTIES`, min confidence 70) | **PASS**: 21 labels, request id `3b4b2574-7196-45e5-a9c6-c2b4113c7ed6` |
| Deployed `POST /audit` on the public URL, same photo | **PASS**: HTTP 200, `meta.source = "amazon_rekognition"`; the Rekognition call took 957 ms inside the Lambda (2.5 s wall time from a shell, including the 3 MB upload) |
| Public web app, Upload evidence, real browser (Chrome) | **PASS**: exactly one `POST /api/audit` (HTTP 200), report badged "Live AWS observation · Amazon Rekognition", no console errors |
| Result for that photo | **Insufficient Evidence.** Rekognition labelled both a car (99.7%) and a motorcycle (94.6%; the small box sits at the frame's left edge, on the auto-rickshaw), so the vehicle is reported as unknown and the engine refuses to guess |
| Server-side evidence | The Lambda log shows the two `/audit` calls with `source: amazon_rekognition`; CloudTrail shows `DetectLabels` from the Lambda's role; the deployed zip's hash equals the function's `CodeSha256`, and its backend and web-app files match this repository (the fixture adapter is deliberately left out of the bundle) |
| Lambda role | `rekognition:DetectLabels` only (scoped to the stack's region) plus its own log group; no Bedrock permission and no managed policy |
| Amazon Bedrock | **Blocked.** Every call failed with `ValidationException: Operation not allowed`; AWS Support confirmed the newly created account had temporary service and model restrictions. It is not on the live path, and the deployed role could not call it |

**Not verified:** Rekognition's accuracy on real challan photos, any helmet or motorcycle photo end to end on the live
path (the one live photo run is a car scene), and repeatability. What *is* real and tested: claim handling, the
observation schema, the Rekognition normalization, the deterministic engine, uncertainty and unsupported-check
behaviour, the UI, and the explicit failure path.

## Architecture

**CURRENT (what exists)**

*Locally* (unchanged):

```
React/Vite app ──┬─ "Explore an example" → fixture adapter (canned observation, no AWS call)
                 └─ "Upload evidence"    → POST /audit → local Node relay → Amazon Rekognition DetectLabels
         schema validation → deterministic rule engine (same module, runs in the browser) → result
```

*Deployed on AWS* (`ap-south-1`, verified 2026-09-20, record in [`docs/CANONICAL_RUN.md`](docs/CANONICAL_RUN.md) section 2c):

```
browser ──► API Gateway (HTTP API) ──► one Lambda ──► Amazon Rekognition (DetectLabels)
              POST /audit and            · serves the built web app (static files)
              POST /api/* throttled      · GET /health, POST /audit (image → observation relay);
                                           also served as /api/health and /api/audit
```

Public URL: https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com
The Lambda sends the uploaded image to Rekognition, normalizes the labels into the observation schema, validates it, and
returns `{ observation, meta }` with `meta.source = "amazon_rekognition"`; on any failure it returns a coded error and
no observation. The site's demo mode is the same labelled fixture demo, and nothing on it is presented as live. The rule
engine still runs in the browser: AWS observes, application code evaluates.

**Original target:** the same shape with Amazon Bedrock as the observer. It was not achievable in the event: the account's
Bedrock access stayed restricted (see Current AWS status). The Bedrock adapter, its spike scripts and their tests remain in
the repository as part of the build story; the deployed function does not use them.

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

## Demo / run locally

```
npm install
npm test                                # 14 files, 217 tests; no AWS account needed
npm install --prefix frontend
npm run dev --prefix frontend           # open the printed URL and choose "Explore an example"
```

Live mode (needs AWS credentials, e.g. `aws login`, that can call Amazon Rekognition `DetectLabels` in `ap-south-1`):

```
PORT=8799 npm run server                # POST /audit, GET /health (defaults to 8787); observer: Amazon Rekognition
VITE_API_BASE_URL=http://127.0.0.1:8799 npm run dev --prefix frontend
```

(The original Bedrock check is still there, `npm run check:bedrock-text`: one real Bedrock text call, which fails on
this account. It is not part of the live path.)

Also: `npm run build --prefix frontend`, `npm run lint --prefix frontend`, `sh scripts/verification/secret_scan.sh`.

Deploy to AWS (creates resources; design and cost drivers in [`infra/README.md`](infra/README.md)):
`PREVIEW=1 bash infra/deploy.sh` shows the change set without applying it, then `bash infra/deploy.sh`.
The demo script is [`docs/DEMO.md`](docs/DEMO.md); the submission write-up is [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

## What we learned

Each point is a real event in this repository, told in full in [`docs/LEARNING.md`](docs/LEARNING.md).

1. **Observe, then let the evaluator refuse.** A rule engine without a confidence gate turned a 60%-confidence "car" into a confident mismatch; observations now carry their own doubt.
2. **A false positive is worse than a miss.** Our OCR-tolerance fix fabricated two claims that adversarial tests caught.
3. **Fixture and live must never substitute for each other,** and failures must keep their real cause.
4. **Region, model and account access are architecture.** We waited hours for a "propagation delay" while a quota sat at zero.
5. **Contracts are tested across the boundary.** A 10 MB UI limit against a 5 MB server limit was invisible to each side's own tests.
6. **Platform limits are part of the contract.** A 4.63 MB photo the UI accepted became a 6.47 MB request that the deployed gateway refused with a bare 413 (Lambda's request limit is 6 MB); the limit is now 3 MB.

## Known limitations

- **Live observation is label detection only.** Amazon Rekognition reports labels, boxes and image-quality measurements. It does not establish helmet use, read plate text or measure occlusion, so a helmet claim ends as Insufficient Evidence unless a helmet is positively detected at the head of every detected person; it never concludes "no helmet" from a missing label. A photo showing two different vehicle types is reported with an unknown vehicle. Bedrock never returned a successful response, and fixture-demo observations are canned and not derived from any uploaded image.
- **One supported check** (riding without helmet). Other recognised claims return `UNSUPPORTED_CHECK` by design.
- **Manual claim entry, images only.** No OCR or PDF extraction in this build; live analysis takes JPG or PNG up to 3 MB, one photo per review (a WebP or GIF is refused with a coded `UNSUPPORTED_IMAGE`, because Rekognition does not read them).
- **English claim wording only.** Mixed Hindi-English text is not recognised.
- **One claim per review.** Other detected claims are reviewed separately.
- **Public, unauthenticated, development preview.** The site and API are live and analyse uploaded photos with Rekognition; the site is labelled "Development preview". The API is throttled at the gateway, not authenticated.
- **No legal conclusion.** It flags observable inconsistencies only. It does not determine guilt, innocence or legal validity, and it does not predict or promise any grievance outcome.
- **Live accuracy is unmeasured.** One real photograph has been run end to end (a car scene in which Rekognition also labelled the auto-rickshaw a motorcycle at 94.6%). Nothing here reports how Rekognition performs across real challan photos.

## AI tools used

AI coding agents were used for product ideation, task management, implementation, red-team review, UI
verification and documentation. The tools named in the repository's own logs are Antigravity, Gemini
(documentation), Claude (implementation and a red-team resweep), Muse (tests) and opencode (UI verification scripts).
In the fixture demo no AI model runs: the fixture adapter returns canned observations. In the live upload path Amazon
Rekognition, a managed computer-vision service rather than a generative model, produces the observations, and
deterministic application code evaluates them. See [`docs/SUBMISSION.md`](docs/SUBMISSION.md) for the disclosure.
