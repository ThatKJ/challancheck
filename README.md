# ChallanCheck

> ChallanCheck compares an e-Challan's cited violation with observable facts in its photographic
> evidence, using a strict observation-versus-evaluation architecture.

*First Commit — Bharat Builds Tour (WeMakeDevs × AWS).*
**Submission mode: B — AWS not verified.** The observations shown in the demo come from a local fixture
adapter, not from Amazon Bedrock. See [Current AWS status](#current-aws-status).

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
   visible, plate visibility, image quality, occlusion and stated uncertainties, each with a confidence.
   In the demo these come from a labelled fixture. In live mode they are designed to come from Amazon Bedrock.
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
                  Bedrock by design;    validated against    application code only
                  fixture adapter       a fixed schema
                  in the demo
```

- The observer is asked only what is visible. Its request contains the image and never the challan text, and
  its prompt forbids reasoning about legality (`backend/src/bedrockAdapter.js`).
- Application code alone produces the result (`backend/src/ruleEngine.js`, which imports nothing but the schema).
- The system never decides guilt, innocence, legal validity, whether to dispute a challan, or a chance of success.
- A malformed observation degrades to `INSUFFICIENT_EVIDENCE`. Unknown stays unknown.
- Fixture and live paths never substitute for each other. A failed Bedrock call returns a coded error and no
  observation (`AWS_NOT_CONFIGURED` / `AWS_ERROR`), and every fixture result is tagged `meta.source = "fixture"`.

## Current AWS status

**Mode B — AWS not verified.** Checked 2026-09-19; full command record in [`docs/CANONICAL_RUN.md`](docs/CANONICAL_RUN.md).

| Check | Result |
|---|---|
| AWS identity and region (`ap-south-1`) | resolves |
| Inference profile `global.anthropic.claude-sonnet-5` | ACTIVE in the region |
| Live text call to Bedrock | **FAIL**: `ValidationException: Operation not allowed`, in 445 ms |
| Live image call (real PNG → local server → Bedrock) | **FAIL**: same error; HTTP 502 `AWS_ERROR`, no observation returned |
| Applied quota, "Global cross-region model inference tokens per minute for Anthropic Claude Sonnet 5" | `0` (AWS default: `6,000,000`) |
| Model authorization for this account | `NOT_AUTHORIZED` |
| Deployed to AWS | no |

We believe an account-level limit is the cause; we have not been able to lift it. **Not verified:** any successful
Bedrock inference, a schema-valid live observation, latency, accuracy or repeatability.
What *is* real and tested: claim handling, the observation schema, the deterministic engine, uncertainty and
unsupported-check behaviour, the UI, and the explicit failure path.

## Architecture

**CURRENT** (what exists; runs locally, nothing is deployed to AWS)

```
React/Vite app ──┬─ "Explore an example" → fixture adapter (canned observation, no AWS call)
                 └─ "Upload evidence"    → POST /audit → local Node relay → Amazon Bedrock (unverified)
                                              ↓
         schema validation → deterministic rule engine (same module, runs in the browser) → result
```

**TARGET / FUTURE SHIP-IT** (design only; not built, not deployed)

```
static frontend → API Gateway → Lambda (the same adapter) → Amazon Bedrock → deterministic rule engine
```

S3 would be added only if evidence had to be stored; the current relay does not persist images. No other AWS
services are proposed. **Ship It readiness: BLOCKED** — it needs a verified AWS service path, a public URL and a
deployed end-to-end run, and none exists.

## Demo / run locally

```
npm install
npm test                                # 11 files, 101 tests; no AWS account needed
npm install --prefix frontend
npm run dev --prefix frontend           # open the printed URL and choose "Explore an example"
```

Live mode (needs a Bedrock account that can invoke the model; on ours it currently fails with `AWS_ERROR`):

```
npm run check:bedrock-text              # one real text call; expect FAIL until the account limit is lifted
PORT=8799 npm run server                # POST /audit, GET /health (defaults to 8787)
VITE_API_BASE_URL=http://127.0.0.1:8799 npm run dev --prefix frontend
```

Also: `npm run build --prefix frontend`, `npm run lint --prefix frontend`, `sh scripts/verification/secret_scan.sh`.
The demo script is [`docs/DEMO.md`](docs/DEMO.md); the submission write-up is [`docs/SUBMISSION.md`](docs/SUBMISSION.md).

## What we learned

Each point is a real event in this repository, told in full in [`docs/LEARNING.md`](docs/LEARNING.md).

1. **Observe, then let the evaluator refuse.** A rule engine without a confidence gate turned a 60%-confidence "car" into a confident mismatch; observations now carry their own doubt.
2. **A false positive is worse than a miss.** Our OCR-tolerance fix fabricated two claims that adversarial tests caught.
3. **Fixture and live must never substitute for each other,** and failures must keep their real cause.
4. **Region, model and account access are architecture.** We waited hours for a "propagation delay" while a quota sat at zero.
5. **Contracts are tested across the boundary.** A 10 MB UI limit against a 5 MB server limit was invisible to each side's own tests.

## Known limitations

- **AWS is unverified.** Bedrock has not returned a successful response; demo observations are canned fixtures and are not derived from any uploaded image.
- **One supported check** (riding without helmet). Other recognised claims return `UNSUPPORTED_CHECK` by design.
- **Manual claim entry, images only.** No OCR or PDF extraction in this build; JPG, PNG or WebP up to 5 MB, one photo per review.
- **English claim wording only.** Mixed Hindi-English text is not recognised.
- **One claim per review.** Other detected claims are reviewed separately.
- **Not deployed.** It runs locally and is labelled "Development preview".
- **No legal conclusion.** It flags observable inconsistencies only. It does not determine guilt, innocence or legal validity, and it does not predict or promise any grievance outcome.
- **Live accuracy is unmeasured.** Nothing here reports how a live model performs on real challan photos.

## AI tools used

AI coding agents were used for product ideation, task management, implementation, red-team review, UI
verification and documentation. The tools named in the repository's own logs are Antigravity, Gemini
(documentation), Claude (implementation and a red-team resweep), Muse (tests) and opencode (UI verification scripts).
No AI model runs in the demonstrated path; the fixture adapter returns canned observations. See
[`docs/SUBMISSION.md`](docs/SUBMISSION.md) for the disclosure.
