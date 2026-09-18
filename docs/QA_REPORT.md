# QA Report — Red Team (Agent 3)

Verdict: **NOT A RELEASE CANDIDATE** — 1 open P0 (RED-001 live AWS), 2 open P1s (RED-003 copy residuals, RED-009 fuzzy false-positives), 1 open P2 (RED-011 preselect). Retested 2026-09-18 against committed revision 0da52f1/364f9e2 — every closure below rests on fresh execution evidence, regardless of prior status.

Audit revisions: first sweep `e94b94d` (23 files, docs+scaffold); retest sweep `0da52f1` (backend, adapters, 3-screen frontend, 62-test suite).

---

## ID: RED-001
Severity: P0
Claim/Component: Live AWS/Bedrock observation path (P0-01/P0-02)
Expected: A real, successful Bedrock multimodal call in-region.
Actual (updated 2026-09-18): the call path now EXISTS — `backend/src/bedrockAdapter.js` (env region/model, AWS_NOT_CONFIGURED mapping, no hardcoded creds) + `scripts/bedrock-spike.js` — but has never succeeded: no credentials in any environment, `scripts/fixtures/` empty, live status UNKNOWN. The original "zero Bedrock code" body is superseded; the missing piece is purely credentials + a first green run.
Reproduction: `sh scripts/verification/bedrock_live_verify.sh` → SKIP (no creds), zero cost.
Evidence: adapter skim (env-only config); committed board P0-01/P0-02 BLOCKED.
Recommended smallest fix: human provides creds → run LIVE checklist L-01..L-11 (`scripts/verification/bedrock_live_checklist.md`).
Status: OPEN (sole P0; blocks Mode A only — Mode B demo path does not need it)

## ID: RED-002
Severity: P0
Claim/Component: Core E2E workflow (P0-07) / demo flow
Expected: Upload → observe → rule → visible result.
Actual (updated 2026-09-18): 3-screen React app replaces the starter. Fixture path: explicit fixture/live radio, `source = fixture` tags + "never live Bedrock output" hint, 6 scenarios covering all 4 result states + multi-claim, all schema-valid (probed). Live path: fails honestly (AWS_NOT_CONFIGURED banner + "Live AWS/Bedrock status: UNKNOWN", no fixture fallback in code). No AWS SDK in frontend source or built bundle (build + dist grep, executed). Error state preserves upload inputs; loading resets. NOT independently browser-run by REDTEAM (no browser tooling here) — BUILD's in-browser claim stands unverified by me; static + build evidence is strong but a console-error check pre-video is still owed (by anyone with a browser).
Reproduction: read `frontend/src/App.jsx`, `lib/audit.js`, `backend/src/fixtureAdapter.js`; `npm run build` + dist grep; fixture schema-validation probe.
Evidence: same files; ErrorBanner:18-26; source-tag:184-187; live-adapter honest-failure:22-53 of lib/audit.js.
Recommended smallest fix: pre-video browser pass (console errors, 4 states, multi-claim click path) by BUILD/LEAD/human; then close the browser-verification gap note.
Status: CLOSED for the non-AWS path (fixture E2E verified statically + build). Live-AWS leg remains inside RED-001.

## ID: RED-003
Severity: P1
Claim/Component: README "What We Built", DECISION.md "frequently issue incorrect", DEMO.md "Confidence: High"
Expected: Every judge-facing claim traceable to implementation or a verified run.
Actual: (a) README "What We Built" describes a system that is not built. (b) "frequently" is unquantified — no citation. (c) DEMO payoff asserts "Confidence: High" but no confidence semantics or canonical metrics exist yet (CANONICAL_RUN.md is an empty stub).
Reproduction: grep `accurate|detects|proves|invalid|wrong|legal|fraud|guaranteed|real-time|automatic|reliable|incorrect` → hits are problem-framing + unbuilt capability claims.
Evidence: README:10-14, DECISION.md:7, DEMO.md:6-10, CANONICAL_RUN.md stub.
Recommended smallest fix: tense-guard ("will"/"planned") until P0-02/P0-04 land; quantify-or-drop "frequently"; define confidence semantics in the observation-schema task (P0-03) before DEMO promises numbers.
Status: OPEN (narrowed 2026-09-18) — DECISION:22 fixed ✓ (verified future-tense). Two NEW residuals in README, both verified by read:
(a) README:10 "The deterministic engine currently extracts visual facts" — inaccurate: the engine evaluates observations, it never extracts; nothing extracts yet. Fix: "currently evaluates observations and identifies mismatches".
(b) README:39 "Amazon Bedrock used for multimodal image observation" — present-tense, unconditional, FALSE (zero Bedrock calls have ever been made). Fix: "(If Mode A)" like SUBMISSION:19.
Mode B submission copy (SUBMISSION:14-15 "(via mocked integration)", honest incomplete-pipeline note; DEMO:7 adapter-conditional; DEMO:12 limitations beat) verified clean — good disclosure, do not touch.

## ID: RED-004
Severity: P1
Claim/Component: Fresh-clone setup / secret hygiene
Expected: Clone → install → run, with secrets impossible to commit by default.
Actual: Setup audit is MIXED. PASS: no secrets in tracked files or history (`AKIA`/`aws_secret`/`.env` searches empty), `node_modules` untracked, frontend `npm run build` succeeds (vite 8.3.0, 222ms). FAIL/GAP: (a) README setup section is a stub ("To be updated by Agent 2") — no reproducible product setup exists. (b) No root `.gitignore` — only `frontend/.gitignore` — so a future `backend/.env` or credential file at root has no ignore protection. Given P0-01 will soon inject real AWS secrets into env, this gap is time-sensitive.
Reproduction: `git log --all -S 'AKIA' -- .` (empty); `ls -a` (no root .gitignore); README:16-18 stub; `npm run build` in `frontend/` (pass).
Evidence: 23 tracked files, none matching `\.env|credential|secret|pem|key`.
Recommended smallest fix: ~~LEAD/BUILD add root `.gitignore`~~ DONE and committed (covers `node_modules/`, `.env*`, `*.pem`, `*credentials*`; secret_scan.sh exits 0). README "Setup & Running Locally" now documents real backend/frontend/spike commands (verified by read) — setup-docs gap closed.
Status: CLOSED 2026-09-18 (re-verified on new revision: secret_scan.sh exit 0 across tracked+untracked+history+gitignore; standing order to re-run at freeze remains)

## ID: RED-005
Severity: P1
Claim/Component: Deterministic rule engine (P0-04) / observation schema (P0-03)
Expected: Rules testable in isolation; LLM never decides the classification.
Actual: No engine exists to attack, so this audit pre-registers the adversarial matrix BUILD must satisfy: `tests/adversarial/rule_expectations.json` (14 cases). Hardest traps: (1) claim=WITHOUT_HELMET + vehicle=CAR must be OBSERVABLE_INCONSISTENCY, never CONSISTENT; (2) helmet=uncertain on a motorcycle must be INSUFFICIENT_EVIDENCE, never a confident guess; (3) SPEEDING / RED_LIGHT / PLATE_MISMATCH claims must be UNSUPPORTED_CHECK (single photo cannot show speed, signal state, or registry truth); (4) multi-vehicle frames, severe occlusion, poor quality, or plate-not-visible must degrade to INSUFFICIENT_EVIDENCE, not to CONSISTENT_WITH_EVIDENCE.
Reproduction: n/a (engine absent) — matrix is executable once `RULES` module lands; see file header for runner contract.
Evidence: `tests/adversarial/rule_expectations.json` (new, REDTEAM-owned).
Recommended smallest fix: BUILD implements P0-04 against this matrix; REDTEAM retests on landing (do not assume the fix works).
Status: CLOSED 2026-09-18 — independently verified, trusting no summary: (a) matrix re-run via plain node: 14/14; (b) `npm test`: 22/22 (14 live-matrix runner `tests/redteam-matrix.test.js` reading the canonical JSON at test time — no vendored copy — plus 8 BUILD unit tests); (c) `validateObservation` never-throws probe 6/6 garbage inputs → valid=false; (d) engine imports nothing but the schema module (no network; Product Truth holds for this file). Residual risk (not a finding): confident multi-vehicle misclassification would live observation-side — attack at P0-02 spike with real fixtures.

## ID: RED-006
Severity: P2
Claim/Component: DEMO.md narrative
Expected: 30-second comprehension, real AWS on screen, observation-vs-rule separation, one uncertainty beat.
Actual: Timing sums correctly to 3:00 and the 2:20–2:40 AWS beat does separate observation from rules — good structure. Gap: only the strongest case (car vs helmet) is shown; no INSUFFICIENT_EVIDENCE/ambiguity beat, which is exactly the credibility moment judges probe ("what if the photo is blurry?").
Reproduction: read `docs/DEMO.md`.
Evidence: DEMO.md:1-12.
Recommended smallest fix (LEAD-owned): swap ~10s of the 1:50–2:20 payoff for a blurry-photo → INSUFFICIENT_EVIDENCE beat. No action while P0/P1 open.
Status: CLOSED 2026-09-18 — uncertainty beat verified in DEMO.md:10 (2:10–2:25 INSUFFICIENT_EVIDENCE on blurry photo).

---

## ID: RED-007
Severity: P1
Claim/Component: `classifyViolation()` (P1-02) — "maps common real-world e-Challan phrasing… and never drops unrecognized text"
Expected: Text that does not cite an offence falls through to slug (matched:false). A fabricated claim corrupts the entire downstream report.
Actual: 4 proven false-claim traps (executed, not theorized):
- "Rider wearing helmet - compliant" → WITHOUT_HELMET, matched:true (compliance inverted)
- "No helmet violation detected" → WITHOUT_HELMET, matched:true (explicit negation inverted)
- "Registration number KA01AB1234" → PLATE_MISMATCH, matched:true (field label mistaken for offence)
- "Helmet: N/A (car)" → WITHOUT_HELMET, matched:true (N/A marker mistaken for offence)
Harm direction: "No helmet violation detected" + helmetless-rider photo → CONSISTENT_WITH_EVIDENCE supporting a charge that was never made. BUILD's 12 unit tests cover only positive mappings — zero negation/field-label coverage.
Reproduction: node probe of `classifyViolation` (see AGENT_LOG); failing acceptance tests CT-01..CT-04 in `tests/adversarial/classifier_traps.test.js` (suite now 41 pass / 4 fail — the 4 failures ARE this finding).
Evidence: `tests/adversarial/classifier_traps.json` + `.test.js` (REDTEAM-owned); CT-05..CT-07 anti-regression controls pass.
Recommended smallest fix: negation/compliance guard before pattern matching (e.g. comply/ok/present/worn/N-A/no-violation contexts suppress the match) WITHOUT breaking CT-06 ("Not wearing protective headgear" must stay WITHOUT_HELMET — naive negation guards will fail this control). Then make the 4 red tests green; do not edit the trap files.
Status: CLOSED 2026-09-18 — BUILD implemented suppression guards + tightened helmet/plate patterns (bus/AGENT_LOG:235). Independently verified: all 4 former traps now fall through to slug (node probe), CT-01..CT-07 7/7 green, trap files byte-intact (BUILD never touched REDTEAM-owned files). Full suite 52/55 with only the new CT-08..CT-10 red (see RED-009).

## ID: RED-008
Severity: P1
Claim/Component: `classifyViolation()` multi-offence handling (P1-02)
Expected: All cited offences checked, or an explicit single-claim limitation.
Actual: "Overspeeding and driving without helmet" → WITHOUT_HELMET, speeding silently dropped. Selection follows PATTERNS array order (helmet first), not challan order, with no signal a second offence was ignored. Multi-offence challans are common; the report will silently audit a fraction of the challan.
Pipeline-level proof 2026-09-18 (`auditEvidence`, car photo): "No helmet and no seatbelt" → `{canonicalClaim: WITHOUT_HELMET, status: OBSERVABLE_INCONSISTENCY}` with report keys `violation,observation,result,presentation,generatedAt` — no multi-claim signal anywhere in the report object. Silent selection survives end-to-end, not just in the classifier unit.
Reproduction: node probe above (classifier) + `auditEvidence({violationText, observation})` probe (pipeline).
Evidence: same harness; deliberately NOT encoded as a failing test — the correct single output is a scope decision, not a technical fact.
Recommended smallest fix (LEAD decides): either support multi-claim evaluation, or document the single-claim limitation in DECISION.md and surface "1 of N offences checked" in the report. Smallest honest step is the latter.
Policy DECIDED 2026-09-18 (DECISION.md Scope Limitations, LEAD): detect + surface all claims, user explicitly chooses, never silently default — superseding an earlier draft that proposed auditing "the primary targeted claim" (that draft would have enshrined this bug; glad it's dead). Retest 2026-09-18 vs 0da52f1 (all executed): `claims[]` = ["WITHOUT_HELMET","SPEEDING"] surfaced ✓; no selection → `{requiresSelection:true, evaluated:false}` ✓; invalid selection → requiresSelection ✓; valid SPEEDING selection → exactly that claim evaluated ✓; single claim auto-proceeds ✓; unrecognized → slug → UNSUPPORTED ✓. Contract holds at backend. One UI softening (P2, see RED-011): ClaimScreen pre-checks the first candidate.
Status: CLOSED (contract implemented + enforced; RED-011 tracks the UI nit)

## ID: RED-009
Severity: P1
Claim/Component: `classifyViolation()` on real OCR text (P1-02's stated input path is "e.g. OCR output")
Expected: Common OCR corruptions of real offence labels still classify; only truly unrecognized text degrades to UNSUPPORTED_CHECK.
Actual: Safe direction (no fabricated claims) but brittle coverage — proven by execution:
- "wthout helmet" (vowel-drop) → slug → UNSUPPORTED_CHECK instead of audit
- "speed limt" (truncation) → slug instead of SPEEDING
- "jumping red-light" (hyphen) → slug instead of RED_LIGHT_JUMP (`\s*` doesn't span hyphens)
Case/punctuation/whitespace/numbers all handled correctly ("nO hElMeT", "Driving without helmet!!!", "   " → UNKNOWN_VIOLATION). So the gap is specifically OCR-noise + hyphen-compounds — exactly what a screenshot→OCR pipeline produces daily.
Reproduction: node wording blitz (see AGENT_LOG); failing acceptance tests CT-08..CT-10 (suite 52/55, CT-11 control passes).
Evidence: `tests/adversarial/classifier_traps.json` CT-08..CT-11 + runner (REDTEAM-owned).
Recommended smallest fix: input normalization (hyphen→space, collapse repeats) + token-level fuzzy match (e.g. edit-distance ≤1 on keywords `helmet|without|speed|limit|signal|light`) with tests; keep CT-01..CT-04 guards passing (fuzzy must not resurrect false claims — "helmett"→slug today is CORRECT, don't over-match it into WITHOUT_HELMET without a negation cue).
Out of scope (P2 note): Hindi-English mix ("bina helmet ke challan", "helmet nahi pehna tha") also slugs today. Only fix if LEAD declares Hindi support; otherwise document English-only input.
Retest 2026-09-18 vs 0da52f1: CT-08/09/10 now match ✓, CT-01..07 still suppressed ✓ (fuzzy did not resurrect the false claims — the key safety property holds). BUT the fuzzy path introduced two NEW false-claim variants (executed): "All signals working normally" → RED_LIGHT_JUMP (plural→keyword correction fabricates a claim from descriptive text) and "speed limits observed" → SPEEDING (compliance-sounding, no offence cue — same class as CT-02). Encoded as failing CT-12/CT-13 (suite 62/64). Known safe-direction residuals (not encoded): space-drop ("nohelmet") and cue-corruption ("missng helmet") still slug — diminishing returns, revisit only if OCR source shows these shapes.
Status: OPEN (narrowed: original OCR gap fixed; fuzzy over-correction gap new)

## ID: RED-010
Severity: P1 (guidance sentence) / P2 (title)
Claim/Component: User-facing copy in `backend/src/reportPresentation.js`
Expected: No legal-advice-shaped wording anywhere (contract: system determines neither legal validity nor legal advice); verdict titles must not overclaim beyond "no mismatch found".
Actual:
- (P1) OBSERVABLE_INCONSISTENCY guidance: "This may be grounds to dispute the challan" — recommends a legal course of action. Hedged with "may"/"review before deciding", but "grounds to dispute" is a legal conclusion about the user's options. A judge or grievance officer reading this sees the app giving legal advice.
- (P2) CONSISTENT_WITH_EVIDENCE title: "Evidence Matches Violation" — overconfident. The engine proved no contradiction, not a match (photo could still be the wrong vehicle entirely). "No Mismatch Found" states exactly what was established.
- Copy audit otherwise clean: no accurate/guarantee/AI-detected/confirmed/verified anywhere in product paths; INSUFFICIENT ("We won't guess") and UNSUPPORTED ("cannot be confirmed or refuted") worded correctly; DECISION/SUBMISSION re-tense verified.
Reproduction: `claims_audit.sh` + read of `reportPresentation.js:14,18`.
Evidence: same files.
Recommended smallest fix: guidance → "The photo appears inconsistent with the cited violation. If you choose to dispute the challan, you can attach this report — review the details below first." Title → "No Mismatch Found". Both are copy-only, zero logic impact.
Retest 2026-09-18 vs 0da52f1: BUILD applied essentially this wording (verified by read of reportPresentation.js:14,18); old strings gone repo-wide (grep, executed); INSUFFICIENT/UNSUPPORTED copy still correct; no accurate/guarantee/AI-detected/confirmed/verified in product paths.
Status: CLOSED (copy fix verified)

## ID: RED-011
Severity: P2
Claim/Component: Claim-selection screen (`frontend/src/App.jsx` ClaimScreen)
Expected: Per the Multi-Claim Contract ("require explicit user selection"), Continue must require an active choice.
Actual: `useState(candidateClaims[0])` pre-checks the first candidate with Continue always enabled — a click-through user proceeds on the default without ever choosing. Backend still enforces selection-required (requiresSelection gate), and all candidates are displayed, so no silent audit occurs; this is a UX softening of "explicit", not a contract breach.
Reproduction: read App.jsx:109-110,140-142.
Evidence: same file.
Recommended smallest fix: `choice` starts null, Continue disabled until a radio is picked. Two-line change, zero logic impact.
Status: OPEN (P2 — fix if time, does not block demo)

## Release gate

RELEASE CANDIDATE — **FAIL**. Blocking P0: RED-001 (live AWS; blocks Mode A only). Blocking P1 until fixed-or-formally-accepted: RED-003 (README:10/:39 residuals), RED-009 (CT-12/13 fuzzy false-positives). Mode B demo path (fixture E2E) is verified working and honestly labeled — the video can proceed on Mode B while these close. Canonical run still empty; video unrecorded; pre-video browser console check still owed.

## Handoff pointer

Next REDTEAM loop: retest P0-04 against `tests/adversarial/rule_expectations.json` the moment BUILD claims it; re-run `scripts/verification/secret_scan.sh` after any env/secret change; keep attacking Bedrock prompt-bias/repeatability once P0-02 spike lands (blur/crop/multi-vehicle variants).
