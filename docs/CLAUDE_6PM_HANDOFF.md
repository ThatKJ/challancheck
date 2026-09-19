# Claude 6 PM Handoff

Auditor resweep completed 2026-09-19 ~15:25 UTC window (Claude offline). Prior handoff content below was verified line-by-line against the repo and updated — do not trust the pre-sweep version.

## CURRENT STATE

**FINAL MODE, Mode B ready.** `npm test` 89/89 pass, `npm run build --prefix frontend` passes, `oxlint` clean, `secret_scan.sh` exit 0 (after auditor hardening, see below). Sole P0 remains the AWS-side Bedrock account gate — unchanged, human-owned, blocks Mode A only.

## LAST KNOWN GOOD COMMITS

- `ac4703f` (docs: add CLAUDE_6PM_HANDOFF.md and mark P1-07 as DONE) - **HEAD** (landed mid-sweep from the human; resolves the one uncommitted file the sweep found)
- `c09b107` (chore: consolidate final frontend and backend artifacts for freeze) - **Code Freeze**

## UNCOMMITTED WORK (auditor's — review before committing)

- `scripts/verification/secret_scan.sh` — self-false-positive hardening (RED-015 fix). Verified: exit 0 clean; planted-AKIA → exit 1; planted key assignment → exit 1; planted prose → exit 0. Safe to commit.
- `scripts/verification/claims_audit.sh` — one-flag fix (`-i` on the present-tense grep; caught README:29, see RED-017). Safe to commit.
- `docs/QA_REPORT.md` — appended RESWEEP section (RED-014..RED-017). Safe to commit.
- `docs/CLAUDE_6PM_HANDOFF.md` — this rewrite. Safe to commit.

No other uncommitted changes. No stash. Nothing else was modified — product code untouched.

## FRONTEND STATUS

- **Status**: FROZEN (UI Gate = PASS, undisturbed — no UI files touched in this window)
- **Details**: 3-screen app verified by prior live-browser gate; static recheck in this window (zero `console.*` in `frontend/src`, breakpoints + `prefers-reduced-motion` present, no AWS SDK in src or dist) found nothing new.

## BACKEND STATUS

- **Status**: FROZEN (89/89 tests passing, re-executed in this window)
- **Details**: Rule engine, schema validation, classifier, fixture/live separation all hold by re-read. One NEW contract finding for BUILD (no fix applied — BUILD-owned): **RED-016**: frontend accepts 10 MB uploads, backend caps at 5 MB image / 8 MB body → 5–10 MB files pass the client then 413. Align frontend limit+copy to 5 MB or raise backend limits.

## AWS STATUS

- **Status**: BLOCKED (AWS Account Verification Delay) — unchanged
- **Details**: `bedrock_live_verify.sh` → SKIP (0 fixtures in `scripts/fixtures/`). Adapter/spike/text-check/server wrapper all correct by read; first green run still owed. See RED-014.

## OPEN P0

- **RED-014** (carryover of RED-001): live Bedrock invocation never succeeded. Human-owned AWS gate.

## OPEN P1

- **RED-015**: scanner false-red gate — **FIXED by auditor, uncommitted** (commit the two scanner files to bank it).
- **RED-016**: 10 MB (frontend) vs 5 MB / 8 MB (backend) upload-limit mismatch — **OPEN, BUILD-owned**, 2-line + copy fix specified in QA_REPORT.
- **RED-017**: README:29-30 present-tense live-path claims ("performs… to extract…", "to produce consistent, reliable outcomes") — **OPEN, LEAD/BUILD-owned**, re-tense to designed-to/Mode-A-conditional.
- All pre-sweep P1s remain CLOSED. No new P0.

## EXACT FILES TO TOUCH

**Bank the audit (recommended first commit):**
- `scripts/verification/secret_scan.sh`, `scripts/verification/claims_audit.sh`, `docs/QA_REPORT.md`, `docs/CLAUDE_6PM_HANDOFF.md` (this file)

**If AWS unblocks (Mode A):**
- `scripts/fixtures/*` (drop 5 evidence images)
- `README.md:29-30` (re-tense per RED-017 — required in BOTH modes, judges read it regardless)
- `frontend/src/App.jsx:53` + dropzone copy (align to backend 5 MB per RED-016 — required before any live demo with real phone photos)
- `docs/CANONICAL_RUN.md` (overwrite with live metrics)
- `docs/SUBMISSION.md` (delete Mode B section, keep Mode A)

**If AWS does NOT unblock (Mode B):**
- `README.md:29-30` (RED-017 re-tense — still required; it claims live capability that was never demonstrated)
- Nothing else. No product code changes.

## EXACT COMMANDS TO RUN

```bash
# 0. Bank the audit + verify green baseline
git add scripts/verification/secret_scan.sh scripts/verification/claims_audit.sh docs/QA_REPORT.md docs/CLAUDE_6PM_HANDOFF.md
git commit -m "chore: harden secret scanner, fix claims-audit case gap, record red-team resweep"
sh scripts/verification/secret_scan.sh; echo "exit:$?"   # want 0
npm test                                                  # want 89/89
npm run build --prefix frontend                           # want pass

# 1. AWS unblock check (human-owned)
aws sts get-caller-identity
npm run check:bedrock-text
npm run spike:bedrock   # needs 5 images in scripts/fixtures/ first

# 2. Local E2E (either terminal pair)
npm run server                                   # Terminal 1 (127.0.0.1:8787)
npm run dev --prefix frontend                    # Terminal 2
```

## EXPECTED RESULTS

- `secret_scan.sh` → exit 0 with all-ok lines (post-fix baseline recorded in QA RED-015).
- `npm test` → 9 files, 89 tests, all pass.
- `npm run check:bedrock-text` → exit 0 + `PASS` + latency (only after AWS gate clears; currently expected FAIL/SKIP).
- `npm run spike:bedrock` → one schema-valid record per fixture image (only after gate clears + fixtures added).

## DEPLOYMENT PLAN

- **Status**: CUT (intentional, consistently documented). Local demo (`npm run server` + `npm run dev`) is the plan. `server.js` binds loopback; `PORT`/`ALLOWED_ORIGINS` env overrides exist. Nothing to fix.

## CANONICAL RUN PLAN

- **Current (Mode B)**: `CANONICAL_RUN.md` stands (28 ms fixture path). Do not touch unless Mode A lands.
- **Target (Mode A)**: one verified E2E run on a real challan image → overwrite `CANONICAL_RUN.md` with region, model, latency, claims, observations, verdict.

## DO-NOT-TOUCH AREAS

- `frontend/src/*` — frozen, gate passed. (RED-016 fix touches one limit + copy string only.)
- `backend/src/ruleEngine.js`, `backend/src/observationSchema.js` — frozen core.
- Architectural boundary: Bedrock observes ONLY; never let the model decide guilt/legality/cancellation.
- No new features (auth, dashboards, PDF parsing, maps, Hindi classifier support, illustrative fixture imagery — all explicitly cut or deferred in QA).
- Do not "fix" RED-014 with mocks, fixture-as-live relabeling, or prompt tricks. A coded honest error beats a fabricated green run.
