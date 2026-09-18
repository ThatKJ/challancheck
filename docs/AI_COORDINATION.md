# AI Coordination

## Current Product

ChallanCheck

An evidence-consistency engine that compares the violation claimed in an
e-Challan against observable facts in the attached photographic evidence.

The system does NOT determine guilt, innocence, legal validity, or legal advice.

## Architecture Contract

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
frontend/
infra/
scripts/
tests/

May update TASK_BOARD evidence.

Owns AWS integration and implementation.

---

AGENT 3 — RED TEAM

Owns:

docs/QA_REPORT.md
tests/adversarial/
scripts/verification/

May inspect all files.

Must not rewrite core implementation unless explicitly tasked.

---

AGENT 4 — UI

Owns frontend presentation only after UI_READY=true.

May edit:

frontend/components/
frontend/styles/
frontend/pages/ or app/

Must NOT change:

backend logic
AWS integration
rule engine semantics
observation schema
API contracts

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
  "image_quality": "good|moderate|poor",
  "occlusion": "none|partial|severe",
  "uncertainties": []
}
```

## Product Truth

Bedrock observes.

Deterministic application code evaluates compatibility.

The LLM must never decide:

guilt
innocence
legality
whether a challan should be cancelled

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

Agent 4 may not begin until Agent 2 proves:

input
→ Bedrock
→ structured observations
→ deterministic rule
→ visible useful result

and Agent 3 confirms no unresolved P0 in the core flow.

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
- **Agent 4 (UI)**: Starts only after UI Gate opens, edits frontend presentation files.

Do not make broad code changes simultaneously across agents.

## Final Merge/Freeze Sequence

Near submission, feature development must stop and follow this mechanical sequence:

1. **BUILD FREEZE**
2. Merge working implementation to main.
3. Run full tests.
4. Red Team final audit.
5. Fix ONLY P0/P1 issues.
6. **Canonical Run**: Execute one verified run; log metrics in `CANONICAL_RUN.md`.
7. Astra does final screenshot/demo polish based on Canonical Run.
8. Gemini reconciles README, SUBMISSION.md, and DEMO.md.
9. Security scan (no leaked credentials).
10. Public GitHub push.
11. Record video (Human).
12. Verify every link.
13. SUBMIT.

After canonical run, NO architecture rewrite.
After video recording, fix ONLY submission-breaking issues.
