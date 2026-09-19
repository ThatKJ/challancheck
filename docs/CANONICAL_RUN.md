# Canonical Run

**Submission mode: B — AWS NOT VERIFIED.** Amazon Bedrock has not returned a successful
response for this project. Everything labelled `fixture` below is a canned local observation
and is never Bedrock output. Section 2 is the exact record of the last live attempt.

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
- A deployed URL: nothing is deployed to AWS.

INTERPRETATION
The applied quota is 0 against a 6,000,000 default, the model is reported `NOT_AUTHORIZED` for this
account although it is available in the region, and every call is refused in about half a second with
the same error. We believe an account-level limit is the cause, but AWS does not document a mapping
from this error to those signals, so we report the correlation, not a proven mechanism. Earlier
project notes called this "verification / propagation delay"; the evidence above does not support
that explanation. We have not been able to lift the quota ourselves. Other models and regions were
tried in earlier sessions with the same error (`docs/TASK_BOARD.md` P0-01) and were not re-run here.

## 3. What flips the project to Mode A

All of the following must be true, in this order. Until then the README, submission and demo stay in Mode B.

1. `npm run check:bedrock-text` exits 0 (a real text response).
2. A real image sent to `POST /audit` returns a schema-valid observation with `meta.source: "bedrock"`.
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
| Browser E2E | not available on `main` (no `test:e2e` script); UI was verified live in a browser earlier (`docs/QA_REPORT.md`, RED-012/013) |
