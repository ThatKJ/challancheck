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
| P0-07 | Core E2E workflow | BUILD | IN_PROGRESS | Non-AWS path fully wired and verified in a real browser: upload/fixture -> classify -> (optional claim selection) -> auditEvidence -> side-by-side result, for all 4 result states. `backend/src/bedrockAdapter.js` is the real Bedrock adapter (refactored out of bedrock-spike.js) sharing its output contract with `fixtureAdapter.js`; a live test in this credential-less environment confirms it genuinely throws `AWS_NOT_CONFIGURED` rather than a raw SDK error (`tests/unit/bedrockAdapter.test.js`). Frontend deliberately does NOT bundle the AWS SDK (confirmed absent from the built JS) — its live-mode adapter (`frontend/src/lib/audit.js`) would call a deployed backend that doesn't exist (P1-06 cut), so it also fails honestly with AWS_NOT_CONFIGURED, never silently substituting fixture data. **NOT marked E2E VERIFIED** — that requires an actual successful Bedrock call, which is still blocked on P0-01. Live AWS/Bedrock status: UNKNOWN. |

## P1

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P1-01 | Upload screenshot/PDF | BUILD | DONE | Real 3-screen React app in `frontend/src/App.jsx` (starter template fully replaced, RED-002 concern addressed): Screen 1 uploads/picks evidence, Screen 2 claim selection, Screen 3 audit. Verified working end-to-end in a real browser (Chrome, via claude-in-chrome) for all 4 result states, the multi-claim path, and the AWS-not-configured error path — not just `npm run build` passing. |
| P1-02 | Violation extraction | BUILD | DONE | `backend/src/violationClassifier.js`. RED-007 CLOSED (REDTEAM-verified, suppression guards + tightened patterns, 7/7 CT-01..07). RED-009 FIXED by BUILD, pending REDTEAM retest (QA_REPORT.md still shows it OPEN): added OCR-noise normalization (hyphen->space, edit-distance-1 keyword correction on helmet/headgear/without/speed/limit/signal/light) before matching — CT-08 (vowel-drop "wthout helmet"), CT-09 (truncation "speed limt"), CT-10 (hyphen "jumping red-light") now all match correctly, CT-11 control still passes (11/11 in `tests/adversarial/classifier_traps.test.js`). RED-008 IMPLEMENTED by BUILD per the human's Multi-Claim Contract (docs/AI_COORDINATION.md), pending REDTEAM retest (QA_REPORT.md still shows it OPEN): `classifyViolation()` returns a `claims` array of every recognized offence; `auditEvidence()` refuses to evaluate when `claims.length > 1` without an explicit `selectedClaim`. Full suite 62/62. |
| P1-03 | Evidence crop/extraction | BUILD | CUT | Not required for 3-minute story |
| P1-04 | Side-by-side result | BUILD | DONE | Screen 3 shows CLAIM / VISUAL OBSERVATIONS / DETERMINISTIC RESULT as three columns (`.audit-columns` in App.css, stacks on narrow screens). Verified visually in-browser for all 4 result states. |
| P1-05 | Failure states | BUILD | DONE | `backend/src/reportPresentation.js` maps each RESULTS status to user-facing copy (title/tone/guidance/actionable). RED-010 FIXED by BUILD, pending REDTEAM retest (QA_REPORT.md still shows it OPEN): OBSERVABLE_INCONSISTENCY guidance no longer legal-advice-shaped ("may be grounds to dispute" -> "if you choose to dispute... you can attach this report"); CONSISTENT_WITH_EVIDENCE title changed from overclaiming "Evidence Matches Violation" to "No Mismatch Found" (engine proved no contradiction, not a positive match). Re-ran claims_audit.sh, new copy not flagged. Also verified live in-browser (see P1-01). |
| P1-06 | Deployment | BUILD | CUT | Running locally for final demo due to AWS credential delays |
| P1-07 | Demo narrative | LEAD | TODO | |
| P1-08 | Claim audit | REDTEAM | DONE | All 3 claim defects fixed, including RED-003 residual. scanner at scripts/verification/claims_audit.sh |

## P2

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P2-01 | Evidence PDF | BUILD | CUT | Not required for demo |
| P2-02 | Visual highlighting | UI | CUT | UI_READY=false |
| P2-03 | Motion/polish | UI | CUT | UI_READY=false |
