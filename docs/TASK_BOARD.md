# Task Board

## P0

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P0-01 | Verify AWS credentials/model access | BUILD | BLOCKED | `aws sts get-caller-identity` -> NoCredentials. Confirmed no AWS account/creds exist in this env yet. Blocked on Aditya (team leader) completing the leader-only $100 credit signup form (see RULES_SNAPSHOT.md) and a debit/RuPay card for account verification. Not actionable by BUILD until creds exist. |
| P0-02 | Bedrock multimodal spike | BUILD | BLOCKED | Script scaffolded at `scripts/bedrock-spike.js` (fails gracefully with a clear message when creds/fixtures are missing — verified). Needs P0-01 creds + 5 fixture images in `scripts/fixtures/` before it can run for real. |
| P0-03 | Observation schema validation | BUILD | DONE | `backend/src/observationSchema.js` validates the frozen schema from AI_COORDINATION.md; never throws, returns `{valid, errors}` so a bad model response degrades to INSUFFICIENT_EVIDENCE instead of crashing. Covered by tests. |
| P0-04 | Core deterministic rule engine | BUILD | DONE | `backend/src/ruleEngine.js`. All 14/14 of REDTEAM's `tests/adversarial/rule_expectations.json` (ADV-01..ADV-14) pass, plus 8 BUILD unit tests in `tests/unit/ruleEngine.test.js` — 22/22 total, run via `npm test`. Fixed 2 gaps the matrix caught: claim-name mismatch (engine used NO_HELMET, matrix uses WITHOUT_HELMET) and missing confidence-threshold gating (ADV-09: low-confidence vehicle classification must degrade to INSUFFICIENT_EVIDENCE, not resolve confidently). |
| P0-05 | Adversarial rule audit | REDTEAM | DONE | Independently retested 2026-09-18: 14/14 matrix (own node run) + 22/22 `npm test` + never-throws probe; runner reads canonical JSON live. See QA RED-005 (residual: observation-side risk at spike). |
| P0-06 | Secret/security scan | REDTEAM | DONE | secret_scan.sh exits 0: tracked + untracked + history clean, .gitignore guard passes. Scanner hardened (untracked coverage, self-match exclusion). Re-run at freeze — see QA RED-004. |
| P0-07 | Core E2E workflow | BUILD | TODO | Still blocked on P0-01/P0-02 for the real Bedrock leg. |

## P1

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P1-01 | Upload screenshot/PDF | BUILD | TODO | |
| P1-02 | Violation extraction | BUILD | IN_PROGRESS | `backend/src/violationClassifier.js` maps raw e-Challan violation text (e.g. OCR output) to the claim strings the rule engine consumes (WITHOUT_HELMET, SPEEDING, RED_LIGHT_JUMP, PLATE_MISMATCH, NO_PUC_CERTIFICATE); unrecognized text is preserved as a slug rather than dropped, so it still reaches evaluateConsistency() and comes out UNSUPPORTED_CHECK instead of erroring. 12 tests in tests/unit/violationClassifier.test.js, all passing (34/34 suite total). Remaining: actual OCR/text-extraction from the challan screenshot/PDF itself is not built — this only classifies text once extracted, and needs a real source of that text (likely Bedrock/Textract, so partly gated on P0-01 creds too). |
| P1-03 | Evidence crop/extraction | BUILD | TODO | |
| P1-04 | Side-by-side result | BUILD | TODO | |
| P1-05 | Failure states | BUILD | TODO | |
| P1-06 | Deployment | BUILD | TODO | |
| P1-07 | Demo narrative | LEAD | TODO | |
| P1-08 | Claim audit | REDTEAM | IN_PROGRESS | 3 claim defects filed (QA RED-003); scanner at scripts/verification/claims_audit.sh |

## P2

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P2-01 | Evidence PDF | BUILD | TODO | |
| P2-02 | Visual highlighting | UI | BLOCKED | UI_READY=false |
| P2-03 | Motion/polish | UI | BLOCKED | UI_READY=false |
