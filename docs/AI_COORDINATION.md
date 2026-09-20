# AI Coordination

## Current Product

ChallanCheck

An evidence-consistency engine that compares the violation claimed in an
e-Challan against observable facts in the attached photographic evidence.

The system does NOT determine guilt, innocence, legal validity, or legal advice.

## Architecture Contract

> Status (2026-09-20): this is the design contract. The "Amazon Bedrock multimodal observation" step never
> completed successfully (`docs/CANONICAL_RUN.md` section 2): the account's Bedrock access stayed restricted. On the
> live upload path that step is performed by **Amazon Rekognition `DetectLabels`**
> (`backend/src/rekognitionAdapter.js`, `meta.source = "amazon_rekognition"`, verified in `docs/CANONICAL_RUN.md`
> section 2c); the fixture demo uses the fixture adapter, tagged `meta.source = "fixture"`. The two "Violation
> extraction" and "Evidence image extraction" steps are not built: the claim is typed in and one image is attached.

INPUT
e-Challan screenshot/PDF

↓

Violation extraction

↓

Evidence image extraction

↓

Amazon Bedrock multimodal observation

↓

Structured observation schema

↓

Deterministic consistency engine

↓

One of:

- OBSERVABLE_INCONSISTENCY
- CONSISTENT_WITH_EVIDENCE
- INSUFFICIENT_EVIDENCE
- UNSUPPORTED_CHECK

↓

Evidence report

## Ownership

AGENT 1 — LEAD

Owns:

docs/DECISION.md
docs/TASK_BOARD.md
docs/AI_COORDINATION.md
docs/DEMO.md
docs/SUBMISSION.md

May review everything.

Should avoid changing implementation unless necessary.

---

AGENT 2 — BUILD

Owns:

backend/
infra/
scripts/
tests/

Does NOT own frontend/ as of 2026-09-18 (human-ordered transfer to Agent 4 —
see AGENT 4 section below; this transfer happened ahead of the UI_READY gate
by direct human instruction, not because the gate condition was met).

May update TASK_BOARD evidence.

Owns AWS integration and implementation.

If a backend/API contract change would affect the frontend, BUILD documents
it here (Protected Interfaces / Architecture Contract) instead of touching
frontend/ directly, and logs the needed change in AGENT_LOG for Agent 4 to
pick up. The one exception: BUILD may fix frontend/ code only to the extent
required to keep it compiling/working against a contract BUILD changed
(e.g. a renamed export), never for redesign or styling.

---

AGENT 3 — RED TEAM

Owns:

docs/QA_REPORT.md
tests/adversarial/
scripts/verification/

May inspect all files.

Must not rewrite core implementation unless explicitly tasked.

---

AGENT 4 — UI (Astra)

Owns frontend/ as of 2026-09-18 (human-ordered transfer; the UI_READY gate
below is superseded for the purpose of who owns the directory, but the gate's
underlying concern — don't polish a UI around an unproven AWS call — still
stands as guidance, not a hard block, now that a human has decided to proceed
anyway).

May edit:

frontend/ (all of it — components, styles, pages/app, App.jsx, vite config)

Must NOT change:

backend logic (backend/)
AWS integration (backend/src/rekognitionAdapter.js, backend/src/bedrockAdapter.js, backend/src/fixtureAdapter.js)
rule engine semantics (backend/src/ruleEngine.js)
observation schema (backend/src/observationSchema.js)
API contracts (the function signatures/shapes documented under Protected
Interfaces and Architecture Contract in this file)

If Astra needs a backend/contract change to support a UI idea, request it
here (AGENT_LOG) rather than changing backend/ directly — BUILD implements
contract changes to keep the schema/rule-engine ownership boundary clean.

## Protected Interfaces

### Observation Schema

Do not change without updating this document.

```json
{
  "vehicle_type": {
    "value": "motorcycle|scooter|car|truck|bus|auto_rickshaw|unknown",
    "confidence": 0
  },
  "people_visible": {
    "value": 0,
    "confidence": 0
  },
  "helmet": {
    "status": "visible|not_visible|uncertain|not_applicable",
    "confidence": 0
  },
  "license_plate": {
    "visible": false,
    "text": null,
    "confidence": 0
  },
  "image_quality": "good|moderate|poor|unknown",
  "occlusion": "none|partial|severe|unknown",
  "uncertainties": []
}
```

Changed 2026-09-20: `"unknown"` was added to `image_quality` and `occlusion`. The Amazon Rekognition observer measures no
occlusion and may return no quality values, and "not measured" must not be recorded as `"none"` or `"good"`. The rule engine
reacts only to `"poor"` and `"severe"`, so `"unknown"` never creates a verdict by itself. Helmet status keeps its existing
`"uncertain"` value for "not established".

## Product Truth

The visual observer observes: Amazon Rekognition on the live upload path (Amazon Bedrock was the original design).

Deterministic application code evaluates compatibility.

The observer (a model or a managed service) must never decide:

guilt
innocence
legality
whether a challan should be cancelled

## Multi-Claim Contract

Decided 2026-09-18 (human product decision; reconciles RED-008 with the
"one violation per audit" rule in docs/DECISION.md Scope Limitations).

- ChallanCheck may detect multiple candidate violations from one challan.
- It must NEVER silently choose one.
- If exactly one supported claim is found, it may proceed with that claim.
- If multiple supported claims are found, surface all candidates and require
  explicit user selection.
- Exactly ONE selected violation is evaluated per individual audit.
- The user can subsequently audit another detected claim separately.

Implementation: `backend/src/violationClassifier.js` returns every recognized
claim in `claims[]`, never just the first. `backend/src/auditEvidence.js`
evaluates immediately when `claims.length <= 1`; when `claims.length > 1` and
no valid `selectedClaim` is given, it returns `{requiresSelection: true,
candidateClaims}` instead of evaluating anything. The frontend's Screen 2
(claim selection) only appears in that ambiguous case. Auditing a second
detected claim today means re-submitting the same violation text/evidence
from Screen 1 and picking the other candidate on Screen 2 — this satisfies
the contract but isn't a one-click "audit the other claim" shortcut; that
UX polish is unbuilt (out of scope during this freeze).

## Priority

P0:
submission invalid / core broken / AWS not real / security issue

P1:
major judge/demo/reliability problem

P2:
polish

P3:
nice-to-have

No P3 work while actionable P0/P1 exists.

## UI Gate

UI_READY=false

Original rule: Agent 4 may not begin until Agent 2 proves:

input
→ Bedrock
→ structured observations
→ deterministic rule
→ visible useful result

and Agent 3 confirms no unresolved P0 in the core flow.

SUPERSEDED 2026-09-18 for ownership purposes: the human directly ordered
frontend ownership transferred to Agent 4 (Astra) ahead of this gate opening
(live Bedrock still hasn't succeeded — see P0-01/P0-02 in TASK_BOARD.md).
UI_READY itself stays `false` until the real condition above is met — that
flag is still meaningful for judging demo/submission readiness — but it no
longer blocks Agent 4 from owning and editing frontend/.

## Communication Rule

Every agent must:

inspect git status/diff/log before work
read this file
read TASK_BOARD.md
claim task
work
verify
update task evidence
append short entry to AGENT_LOG.md
immediately select next task

Never assume another agent's summary is true.

## Git and Branch Coordination

To avoid simultaneous uncontrolled editing:
- **Agent 1 (LEAD)**: Stays mostly read-only on `main`, edits `docs/`.
- **Agent 2 (BUILD)**: Owns the actual implementation branch (e.g., `agent/build` or `main`).
- **Agent 3 (RED TEAM)**: Reads BUILD's branch frequently, only commits to `tests/` and `docs/QA_REPORT.md`.
- **Agent 4 (UI/Astra)**: Owns `frontend/` as of 2026-09-18 (human-ordered, ahead of UI Gate — see UI Gate section). Edits frontend freely; does not touch `backend/`.

Do not make broad code changes simultaneously across agents.

## Final Merge/Freeze Sequence

Near submission, feature development must stop and follow this mechanical sequence:

1. **BUILD FREEZE** (COMPLETED: `c09b107`)
2. Merge working implementation to main. (COMPLETED)
3. Run full tests. (COMPLETED: 89/89)
4. Red Team final audit. (COMPLETED: UI Gate PASS)
5. Fix ONLY P0/P1 issues. (COMPLETED: All P1 closed)
6. **Canonical Run**: Execute one verified run; log metrics in `CANONICAL_RUN.md`. (COMPLETED: Mode B / 28ms)
7. Astra does final screenshot/demo polish based on Canonical Run. (COMPLETED)
8. Gemini reconciles README, SUBMISSION.md, and DEMO.md. (COMPLETED)
9. Security scan (no leaked credentials). (COMPLETED: False positives accounted for)
10. Public GitHub push. (PENDING)
11. Record video (Human). (PENDING)
12. Verify every link. (PENDING)
13. SUBMIT. (PENDING)

After canonical run, NO architecture rewrite.
After video recording, fix ONLY submission-breaking issues.
