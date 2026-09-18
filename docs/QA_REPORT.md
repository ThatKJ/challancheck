# QA Report — Red Team (Agent 3)

Verdict: **NOT A RELEASE CANDIDATE** — 2 open P0s, 3 open P1s. Core flow does not exist yet; all findings verified against live repo state, not prose.

Audit commit: `e94b94d` + uncommitted docs restructure (Agent 1, in progress at audit time).
Audit date: 2026-09-18. Scope: `main` branch, 23 tracked files.

---

## ID: RED-001
Severity: P0
Claim/Component: "Amazon Bedrock performs multimodal visual observation" (README:13, SUBMISSION.md:6, DECISION.md:22) / AWS integration
Expected: Real Bedrock call path (SDK import, model call, region config) somewhere in the repo.
Actual: Zero Bedrock code. `backend/`, `infra/`, `scripts/`, `tests/` do not exist. Every "bedrock" match in the repo is docs prose (12 matches, all `.md`). The present-tense README claims describe an unbuilt system.
Reproduction: `ls backend infra scripts tests` → all "No such file or directory"; grep `bedrock|boto3|@aws-sdk|invoke_model` → docs-only hits.
Evidence: `git ls-files` = 23 files (docs + Vite scaffold only). Root blocker is P0-01 (AWS creds BLOCKED on human/leader-only credit form).
Recommended smallest fix: BUILD lands P0-02 spike; LEAD re-tenses README/SUBMISSION claims to future/aspirational until CANONICAL_RUN.md is populated.
Status: OPEN

## ID: RED-002
Severity: P0
Claim/Component: Core E2E workflow (P0-07) / DEMO.md flow
Expected: Upload → observe → rule → visible result.
Actual: `frontend/src/App.jsx` is the unmodified Vite starter (counter button, "Get started" HMR text). No upload, no report, no rule output. DEMO.md scripts a flow that cannot run. (Not a false-DONE — board honestly shows TODO — but it is a demo blocker and becomes submission-invalid if unchanged by Sept 20.)
Reproduction: read `frontend/src/App.jsx`; `npm run build` succeeds but builds the starter template, not the product.
Evidence: App.jsx:7-31 counter component; `dist/` output contains only starter assets.
Recommended smallest fix: BUILD proves the UI-gate chain (input → Bedrock → observations → rule → visible result) before any UI polish; keep UI agents gated (UI_READY=false respected).
Status: OPEN

## ID: RED-003
Severity: P1
Claim/Component: README "What We Built", DECISION.md "frequently issue incorrect", DEMO.md "Confidence: High"
Expected: Every judge-facing claim traceable to implementation or a verified run.
Actual: (a) README "What We Built" describes a system that is not built. (b) "frequently" is unquantified — no citation. (c) DEMO payoff asserts "Confidence: High" but no confidence semantics or canonical metrics exist yet (CANONICAL_RUN.md is an empty stub).
Reproduction: grep `accurate|detects|proves|invalid|wrong|legal|fraud|guaranteed|real-time|automatic|reliable|incorrect` → hits are problem-framing + unbuilt capability claims.
Evidence: README:10-14, DECISION.md:7, DEMO.md:6-10, CANONICAL_RUN.md stub.
Recommended smallest fix: tense-guard ("will"/"planned") until P0-02/P0-04 land; quantify-or-drop "frequently"; define confidence semantics in the observation-schema task (P0-03) before DEMO promises numbers.
Status: OPEN

## ID: RED-004
Severity: P1
Claim/Component: Fresh-clone setup / secret hygiene
Expected: Clone → install → run, with secrets impossible to commit by default.
Actual: Setup audit is MIXED. PASS: no secrets in tracked files or history (`AKIA`/`aws_secret`/`.env` searches empty), `node_modules` untracked, frontend `npm run build` succeeds (vite 8.3.0, 222ms). FAIL/GAP: (a) README setup section is a stub ("To be updated by Agent 2") — no reproducible product setup exists. (b) No root `.gitignore` — only `frontend/.gitignore` — so a future `backend/.env` or credential file at root has no ignore protection. Given P0-01 will soon inject real AWS secrets into env, this gap is time-sensitive.
Reproduction: `git log --all -S 'AKIA' -- .` (empty); `ls -a` (no root .gitignore); README:16-18 stub; `npm run build` in `frontend/` (pass).
Evidence: 23 tracked files, none matching `\.env|credential|secret|pem|key`.
Recommended smallest fix: ~~LEAD/BUILD add root `.gitignore`~~ DONE in working tree (covers `node_modules/`, `.env*`, `*.pem`, `*credentials*`; secret_scan.sh exits 0). Remaining: BUILD documents setup when P0-02 lands.
Status: PARTLY CLOSED (hygiene clean; setup docs still open)

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
Status: OPEN (deferred, P2)

---

## Release gate

RELEASE CANDIDATE — **FAIL**. Blocking: RED-001, RED-002. Also required before pass: real AWS path verified (P0-01/P0-02), canonical run populated, root .gitignore landed, RED-003 claims re-tensed, RED-005 matrix green against real engine, demo path runs end-to-end.

## Handoff pointer

Next REDTEAM loop: retest P0-04 against `tests/adversarial/rule_expectations.json` the moment BUILD claims it; re-run `scripts/verification/secret_scan.sh` after any env/secret change; keep attacking Bedrock prompt-bias/repeatability once P0-02 spike lands (blur/crop/multi-vehicle variants).
