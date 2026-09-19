# Canonical Run

**Submission mode: B — AWS NOT VERIFIED.** Amazon Bedrock has not returned a successful
response for this project. Everything labelled `fixture` below is a canned local observation
and is never Bedrock output. Section 2 is the exact record of the last live attempt.

**MODE B + DEPLOYED AWS SHELL.** A public site and API are deployed on AWS (section 2b). Bedrock is still
refused through them, and no fixture ever stands in for it on the live path.

## 1. Mode B run — what the demo shows

| | |
|---|---|
| Path | "Explore an example" → local fixture adapter → schema validation → deterministic rule engine → report |
| Observation source | `fixture` (canned; no AWS call; not derived from any image) |
| Network / model calls | none |
| Latency | not claimed — there is no request on this path to time |

Reproduce (needs only Node; prints the two demo cases):

```
node --input-type=module -e '
import { observeEvidenceViaFixture } from "./backend/src/fixtureAdapter.js";
import { auditEvidence } from "./backend/src/auditEvidence.js";
for (const id of ["car_no_helmet", "blurry_insufficient"]) {
  const o = await observeEvidenceViaFixture(id);
  const r = auditEvidence({ violationText: o.violationText, observation: o.observation });
  console.log(id, "| source:", o.meta.source, "| claim:", r.violation.canonicalClaim, "| result:", r.result.status);
}'
```

Output, executed 2026-09-19:

| Demo case | Fixture scenario | Claim | Result | Reason produced by the rule engine |
|---|---|---|---|---|
| A | `car_no_helmet` | `WITHOUT_HELMET` | `OBSERVABLE_INCONSISTENCY` | Cited violation is "no helmet", but the evidence shows a car, which is not subject to a helmet requirement. |
| B | `blurry_insufficient` | `WITHOUT_HELMET` | `INSUFFICIENT_EVIDENCE` | Image quality is poor with severe occlusion; cannot reliably observe helmet use. |

(The UI presents `OBSERVABLE_INCONSISTENCY` as "Evidence Mismatch Found" and
`CONSISTENT_WITH_EVIDENCE` as "No Mismatch Found". The internal enums are unchanged.)

An earlier version of this file reported "Total Request Latency: 28 ms". That was a browser
submit-to-result timing of local JavaScript (QA RED-013), not a request latency, so it is no
longer presented as one.

## 2. Live AWS attempt — 2026-09-19, about 14:23 UTC

```
AWS IDENTITY:          resolves — account 623234913135, short-lived `aws login` credentials
                       (no long-lived keys were created)
REGION:                ap-south-1
MODEL / PROFILE:       global.anthropic.claude-sonnet-5  (system-defined inference profile,
                       status ACTIVE in `aws bedrock list-inference-profiles --region ap-south-1`)

TEXT INVOCATION
  COMMAND:             npm run check:bedrock-text
  RESULT:              FAIL ValidationException: Operation not allowed  (after 445 ms), exit 1

MULTIMODAL INVOCATION
  COMMAND:             POST /audit to a locally started `node backend/server.js` (port 8799)
                       with a real 13 KB PNG — the intended application path
                       (server -> bedrockAdapter -> InvokeModel with image + prompt)
  RESULT:              HTTP 502 in 0.47 s
                       {"error":{"code":"AWS_ERROR","message":"Bedrock call failed
                       (ValidationException): Operation not allowed"}}
                       The body contained no `observation`; nothing fell back to a fixture.

QUOTA EVIDENCE (read-only)
  aws service-quotas list-service-quotas --service-code bedrock --region ap-south-1
    "Global cross-region model inference tokens per minute for Anthropic Claude Sonnet 5"
    applied value: 0.0
  aws service-quotas list-aws-default-service-quotas  (same quota)
    AWS default:   6,000,000.0

MODEL AVAILABILITY (read-only)
  aws bedrock get-foundation-model-availability --model-id anthropic.claude-sonnet-5 --region ap-south-1
    authorizationStatus: NOT_AUTHORIZED   regionAvailability: AVAILABLE
    entitlementAvailability: AVAILABLE    agreementAvailability: NOT_AVAILABLE

OBSERVATION SCHEMA:    not exercised live — no observation was returned
LATENCY:               none for a successful call (there was none); refusals took 0.45–0.47 s
```

WHAT WAS VERIFIED
- The AWS identity resolves and the region is set.
- The inference profile the adapter targets exists and is ACTIVE in `ap-south-1`.
- The application path fails explicitly: a live request that Bedrock refuses returns a coded
  `AWS_ERROR` (HTTP 502) with no observation. This is covered by tests and was observed end to end above.
- A text-only call and a multimodal call are refused identically, so the refusal is not specific to images.

WHAT REMAINS UNVERIFIED
- Any successful Bedrock inference, text or multimodal.
- Whether the model returns a schema-valid observation for a real challan photo.
- Repeatability, latency and observation quality of the live model.
- A deployed URL: **superseded by section 2b.** A hosting/API shell is deployed; Bedrock is still refused through it.

INTERPRETATION
The applied quota is 0 against a 6,000,000 default, the model is reported `NOT_AUTHORIZED` for this
account although it is available in the region, and every call is refused in about half a second with
the same error. We believe an account-level limit is the cause, but AWS does not document a mapping
from this error to those signals, so we report the correlation, not a proven mechanism. Earlier
project notes called this "verification / propagation delay"; the evidence above does not support
that explanation. We have not been able to lift the quota ourselves. Other models and regions were
tried in earlier sessions with the same error (`docs/TASK_BOARD.md` P0-01) and were not re-run here.

## 2b. Deployed AWS shell — 2026-09-19, verified about 18:30 UTC

```
MODE:                  B + DEPLOYED AWS SHELL   (live Bedrock analysis: BLOCKED)
PUBLIC URL:            https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com
API URL:               https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com/api      (same origin as the site; GET /api/health, POST /api/audit)
REGION:                ap-south-1
STACK:                 CloudFormation `challancheck-api`, template infra/template.yaml
DEPLOYED CODE:         commit 7a112c9 (Lambda CodeSha256 gJMKtn8gqkDi0s1v+M9RcQVKWhr7PwVLL8TRGljatl0=)
LAMBDA:                nodejs22.x, arm64, 512 MB, 28 s timeout, handler backend/lambda.handler,
                       environment = BEDROCK_MODEL_ID only (no credentials of any kind)
IAM:                   one execution role; inline policy allows bedrock:InvokeModel on the
                       `global.anthropic.claude-sonnet-5` profile + model and writing its own log group;
                       no managed policies
API GATEWAY:           HTTP API; routes `$default` and `POST /api/{proxy+}`; throttle 3 req/s (burst 6) on
                       POST /api/*, 50 req/s (burst 100) elsewhere; no CORS (same origin)
MODEL / PROFILE:       global.anthropic.claude-sonnet-5 (the adapter's default; a candidate, not verified)
```

**What was verified against the deployed URL**

| Check | Result |
|---|---|
| `GET /` | HTTP 200, `text/html`, strict CSP, `X-Frame-Options: DENY` |
| Static assets | JS, CSS and favicon HTTP 200 with correct types; hashed asset `immutable`; missing asset HTTP 404 |
| `GET /api/health` | HTTP 200 `{"status":"ok","service":"challancheck-api","mode":"live","fixtures":false,"region":"ap-south-1","modelId":"global.anthropic.claude-sonnet-5"}`; no account details |
| `POST /api/audit`, real 75 KB JPEG (`car.jpg`) | **HTTP 502** `{"error":{"code":"AWS_ERROR","message":"Bedrock call failed (ValidationException): Operation not allowed"}}`; no `observation`; 0.83 s wall time from a shell |
| Un-prefixed `POST /audit` | HTTP 405 (not routed to the API) |
| Garbage image / bad JSON / 3.3 MB image / 4.4 MB body | HTTP 415 `UNSUPPORTED_IMAGE` / 400 `BAD_REQUEST` / 413 `IMAGE_TOO_LARGE` / 413 `PAYLOAD_TOO_LARGE`, all coded, none with an observation |
| Public site, real browser (Chrome), live mode | uploaded `car.jpg`, submitted: one same-origin `POST /api/audit` → 502; the UI shows "We couldn't complete this review — Bedrock call failed (ValidationException): Operation not allowed", inputs preserved, no result; 0 CSP violations, 0 JS errors, no cookies or storage keys |
| Public site, demo mode | "Explore an example" runs the fixture path with **no `/api` request**; result "Evidence Mismatch Found", stamped "Demo fixture — not live AWS evidence" and "fixture / development mode — not model output"; 0 CSP violations, 0 JS errors |
| Credentials in what is publicly served | none: no key-shaped strings, no AWS SDK code, no account id, ARN or role name in the served HTML/JS/CSS |
| Tests / build / lint / scans at the deployed commit | `npm test` 13 files, 150 tests pass; frontend build and oxlint pass; `secret_scan.sh` exit 0 |

**Bedrock, exact.** COMMAND: `npm run check:bedrock-text` and the deployed `POST /api/audit` above. REGION `ap-south-1`.
MODEL `global.anthropic.claude-sonnet-5`. ERROR `ValidationException`, message `Operation not allowed`, HTTP 502 from our API.
`authorizationStatus: NOT_AUTHORIZED` (`agreementAvailability: NOT_AVAILABLE`). Observed applied quotas: 21 of 65 Bedrock
quotas on the page are `0`, including the Nova Lite and Nova 2 Lite request quotas. **These observations do not prove
the quota is the cause**, and this project does not claim they do. The Lambda's role resolved credentials (no
`AWS_NOT_CONFIGURED`) and the request reached Bedrock, which refused it; whether the role's permissions suffice for a
*successful* invocation is unverified.

**Latency.** No successful call exists, so there is no Bedrock or end-to-end latency to report. Only refusals were
timed (0.47 to 0.83 s wall time, client-side); they are not inference latency.

**How this stack came to exist (for reproducibility).** `challancheck-api` was first created on 2026-09-19 at 12:31 UTC from
an earlier, unmerged template on the `agent/backend` branch (API only, a Nova model, CORS `*`). Before this update that
version was probed: `/health` HTTP 200, and a real image returned HTTP 503 `AWS_ACCOUNT_RESTRICTED` (AWS request id
`ca3675ca-e8c0-43cb-88ed-30bbc77a9410`), the same refusal. It was then updated **in place** to the code in this repository
using a reviewed change set (5 modify, 1 add, 0 replace, 0 remove), so the URL did not change and the deployed function is
reproducible from `main` with `bash infra/deploy.sh`. `agent/backend` was not merged: only the static-file handler and the
infrastructure template were taken, then adapted.

**Fixture vs live.** The fixture demo remains the proven demonstration of the product's logic (now also runnable on the
public site, labelled as a fixture). The deployed live path fails explicitly. There is no fixture fallback anywhere on it:
the deployed bundle does not contain the fixture adapter, and tests assert the entry points never reference it.

**Known limitations of the deployment**

- No successful Bedrock call, so observation quality, uncertainty behaviour and the multimodal request shape against a real model are unmeasured.
- Claude on this account also needs Anthropic's first-time-use form (`aws bedrock get-use-case-for-model-access`: not filled out), and the role may need AWS Marketplace permissions once access is granted; both unknown until then.
- The adapter sets no Bedrock request timeout, so a hung call ends at Lambda's 28 s as a gateway-level error rather than a coded one. Cold-start time is unmeasured.
- Upload cap is 3 MB. A 4.63 MB image the UI once accepted was refused by the live gateway with a bare 413; that is why.
- The API is public and unauthenticated, so anyone with the URL can spend Bedrock tokens up to the 3 req/s throttle once Bedrock works.
- Web fonts are not shipped: the page renders in the system font (the declared `Inter` is only used if installed).
- Verified in Chrome, not an incognito window; no other browser was tried.

## 3. What flips the project to Mode A

All of the following must be true, in this order. Until then the README, submission and demo stay in Mode B.

1. `npm run check:bedrock-text` exits 0 (a real text response).
2. A real image sent to `POST /audit` (locally) or `POST /api/audit` (deployed) returns a schema-valid observation with `meta.source: "bedrock"`.
3. `npm test` is still green, and one real observation passes through `evaluateConsistency`.
4. Section 1 is replaced with that run's model, region, latency and observation.
5. `docs/SUBMISSION.md` and `docs/DEMO.md` switch to their Mode A copy.

## 4. Verification snapshot (final release audit, 2026-09-19)

| Check | Result |
|---|---|
| `npm test` | 11 files, 101 tests pass |
| `npm run build --prefix frontend` | pass (vite 8.3.0) |
| `npm run lint --prefix frontend` (oxlint) | pass |
| `sh scripts/verification/secret_scan.sh` | exit 0 |
| `sh scripts/verification/claims_audit.sh` | advisory grep; every hit reviewed, see `docs/QA_REPORT.md` |
| Static bundle | the default `npm run build` contains no live-backend code and no AWS SDK; a build with `VITE_API_BASE_URL` set adds the `fetch` path but still bundles no SDK (checked by grepping the built JS) |
| Demo cases in a real browser | Chrome driven by Playwright against the Vite dev server, 2026-09-19. Case A shows "Evidence Mismatch Found" (claimed "Riding Without Helmet", observed "car · helmet not applicable", Vehicle type Car 95%); Case B shows "Insufficient Evidence" (helmet Uncertain 30%, "We won't guess"). Both show the "Demo fixture — not live AWS evidence" badge and the "Evidence consistency, not a legal verdict" note. Zero console or page errors. The driver script is not committed. |
| Committed browser E2E | not available on `main` (no `test:e2e` script); the earlier live-browser QA is in `docs/QA_REPORT.md` (RED-012/013) |
