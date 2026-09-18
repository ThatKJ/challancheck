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
| P0-07 | Core E2E workflow | BUILD | TODO | Non-AWS half now ready: `backend/src/auditEvidence.js` composes classifyViolation + evaluateConsistency into one Evidence Consistency Report (4 tests, 38/38 suite total). Still TODO because the real workflow is upload -> Bedrock observation -> this function -> report, and the Bedrock leg is blocked on P0-01/P0-02. Wiring should be a small change once creds land, not a rebuild. |

## P1

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P1-01 | Upload screenshot/PDF | BUILD | TODO | |
| P1-02 | Violation extraction | BUILD | IN_PROGRESS | `backend/src/violationClassifier.js` maps raw e-Challan violation text to claim strings the rule engine consumes. RED-007 FIXED 2026-09-18: added suppression guards (compliance keyword, negated-violation-record phrasing, N/A marker, registration-field-echo) checked before pattern matching, and tightened the helmet pattern to require an explicit negation cue instead of bare keyword presence; tightened PLATE_MISMATCH to require an explicit mismatch/invalid signal alongside plate/registration, not just the field name. All 7/7 of REDTEAM's `tests/adversarial/classifier_traps.json` (CT-01..CT-07) now pass, including both anti-regression controls (CT-06, CT-07). Suite: 45/45. RED-008 (multi-offence text silently picks one claim) left OPEN and unfixed — REDTEAM flagged it as a scope call for LEAD ("smallest honest fix" is a product decision, not a pure bug), not something BUILD should decide unilaterally. Remaining: real OCR/text-extraction from the challan image/PDF is still unbuilt (partly gated on P0-01). |
| P1-03 | Evidence crop/extraction | BUILD | CUT | Not required for 3-minute story |
| P1-04 | Side-by-side result | BUILD | TODO | |
| P1-05 | Failure states | BUILD | IN_PROGRESS | `backend/src/reportPresentation.js` maps each RESULTS status to user-facing copy (title/tone/guidance/actionable), separate from the technical `reason` string in ruleEngine.js so copy can change without touching decision logic. Only OBSERVABLE_INCONSISTENCY is `actionable` (may support disputing the challan) — INSUFFICIENT_EVIDENCE and UNSUPPORTED_CHECK are framed as "we won't guess," not as errors. 8 tests, all passing (51/51 suite). Not wired into any UI yet (none exists) — this only produces the data a future frontend/report would render. |
| P1-06 | Deployment | BUILD | CUT | Running locally for final demo due to AWS credential delays |
| P1-07 | Demo narrative | LEAD | TODO | |
| P1-08 | Claim audit | REDTEAM | IN_PROGRESS | 3 claim defects filed (QA RED-003); scanner at scripts/verification/claims_audit.sh |

## P2

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P2-01 | Evidence PDF | BUILD | CUT | Not required for demo |
| P2-02 | Visual highlighting | UI | CUT | UI_READY=false |
| P2-03 | Motion/polish | UI | CUT | UI_READY=false |
