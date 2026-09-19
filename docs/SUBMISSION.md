# Submission Narrative

**Selected mode: B — AWS NOT VERIFIED** (as of 2026-09-19).
Amazon Bedrock has not returned a successful response for this project. The demonstrated
observation path is a local fixture adapter. The Mode A copy at the end of this file is a
template that must not be used unless `docs/CANONICAL_RUN.md` section 3 is complete.

## Problem

An e-Challan cites a violation and attaches a photograph as evidence. When the photo does
not appear to show the cited violation, the driver has to inspect it, reason about the gap,
and decide what to do next, alone. ChallanCheck makes that comparison explicit and reviewable.
It helps Indian drivers who received an automated e-Challan.

## What we built

ChallanCheck is an evidence-consistency engine. It compares one cited violation with
observable facts in the attached photograph, using a strict boundary:

```
source evidence → visual observation → structured facts → deterministic evaluation → result
```

The observer (Amazon Bedrock by design, a local fixture adapter in the demo) only produces
structured facts. Application code alone evaluates them against the selected claim and returns
one of `OBSERVABLE_INCONSISTENCY`, `CONSISTENT_WITH_EVIDENCE` (shown as "No Mismatch Found"),
`INSUFFICIENT_EVIDENCE` or `UNSUPPORTED_CHECK`. It never decides guilt, innocence, legal validity,
or what the user should do.

### What works (each item is executed by `npm test` or visible in the running app)

- **Claim handling.** Free-text violation labels map to canonical claims, tolerate OCR-style typos,
  and refuse to invent a claim from compliance-sounding text ("No helmet violation detected").
  If a challan cites several offences, all are surfaced and the user must choose one; nothing is
  chosen silently (`backend/src/violationClassifier.js`, 13 adversarial traps).
- **Observation schema.** Every observation is validated; a malformed one degrades to
  `INSUFFICIENT_EVIDENCE` instead of crashing (`backend/src/observationSchema.js`).
- **Deterministic rule engine.** 14 pre-registered adversarial cases plus unit tests. Its one supported
  check is "riding without helmet" against vehicle type and helmet observation.
- **Uncertainty handling.** Low confidence, poor image quality, severe occlusion or an unknown vehicle
  produce `INSUFFICIENT_EVIDENCE`: the engine says it cannot tell instead of guessing.
- **Unsupported-check behaviour.** Speeding, red-light, plate-mismatch and PUC claims are recognised and
  answered `UNSUPPORTED_CHECK`, because one still photo cannot confirm or refute them.
- **Fixture observations.** Six labelled scenarios drive the demo and cover all four results. They are
  canned, carry `meta.source = "fixture"`, and the UI says "Demo fixture — not live AWS evidence".
- **UI.** Three screens (evidence, claim selection, report), verified live in a browser earlier
  (`docs/QA_REPORT.md`); build and lint pass.
- **Failure honesty.** The local backend relay returns a coded error and no observation when Bedrock
  refuses a call; tests pin that at the server, the adapter and the frontend client.

### What is blocked

Real Amazon Bedrock multimodal execution. No live observation of a real photo exists, so nothing here
demonstrates model accuracy, latency or repeatability.

### Why (exact blocker, executed 2026-09-19)

Every `InvokeModel` call from our AWS account (`ap-south-1`, profile `global.anthropic.claude-sonnet-5`)
fails in about half a second with `ValidationException: Operation not allowed`, for text-only and for
image requests alike. The account's applied quota for "Global cross-region model inference tokens per
minute for Anthropic Claude Sonnet 5" is `0`, against an AWS default of `6,000,000`, and Bedrock reports
the model `NOT_AUTHORIZED` for the account. We believe an account-level limit is the cause; we have not
been able to lift it. Full command record: `docs/CANONICAL_RUN.md` section 2.

## Where AWS fits

Amazon Bedrock is designed to be the visual observer, and only that. `backend/src/bedrockAdapter.js`
sends the image with a prompt that forbids legal reasoning and does not contain the challan text,
requires JSON matching the observation schema, and raises a coded error (`AWS_NOT_CONFIGURED`,
`AWS_ERROR`) on any failure instead of substituting data. That code is implemented and tested against
real AWS state. It has never completed a successful call, so live AWS mode is unverified.

## Architecture: current vs target

**CURRENT (what exists; runs locally, nothing is deployed to AWS)**

```
React/Vite app ──┬─ "Explore an example" → fixture adapter (canned observation, no AWS call)
                 └─ "Upload evidence"    → POST /audit → local Node relay → Amazon Bedrock (unverified)
                                              ↓
         schema validation → deterministic rule engine (same module, runs in the browser) → result
```

**TARGET / FUTURE SHIP-IT (design only; not built, not deployed)**

```
static frontend → API Gateway → Lambda (the same adapter) → Amazon Bedrock → deterministic rule engine
```

The rule engine is the same module wherever it runs; today it executes in the browser, and it could move
into the Lambda without change. S3 would be added only if evidence had to be stored; the current relay
does not persist images. No other AWS services are proposed.

**Ship It readiness: BLOCKED.** It needs a real AWS service path (unverified), a public deployed URL
(none exists) and a deployed end-to-end run (none exists).

## What we learned

Five real events, each traceable in this repository (`docs/LEARNING.md`):

1. **Let the model observe, and let the evaluator refuse.** A rule engine with no confidence gate turned a 60%-confidence "car" into a confident inconsistency; the observation now carries its doubt.
2. **A false positive is worse than a miss.** Our own OCR-tolerance fix fabricated two claims that red-team traps caught.
3. **Live and fixture adapters must never silently stand in for each other.** Provenance is a field, and failures keep their real cause.
4. **Region, model and account access are architecture.** Inference-profile-only models and a zero applied quota cost us hours we spent waiting for "propagation".
5. **Contracts must be tested across the boundary.** A 10 MB UI limit against a 5 MB server limit was invisible to each side's own tests.

## AI disclosure

AI coding agents were used for product ideation, task management, implementation, red-team review,
UI verification and documentation. The tools named in the repository's own logs
(`docs/AGENT_LOG.md`, `docs/AI_COORDINATION.md`, `docs/QA_REPORT.md`) are Antigravity, Gemini (documentation),
Claude (implementation and a red-team resweep), Muse (tests) and opencode (UI verification scripts).
Repository history is written under one human git identity.
No AI model runs in the demonstrated path: the fixture adapter returns canned observations. The Bedrock
adapter is written to call Claude on Amazon Bedrock, but it has not executed successfully.

---

## Mode A — LIVE AWS VERIFIED (template; NOT SELECTED)

Use only after every step in `docs/CANONICAL_RUN.md` section 3 is complete, and replace the bracketed
values with that run's recorded output.

**Build.** ChallanCheck compares an e-Challan's cited violation with structured visual observations of its
photograph. Observations come from Amazon Bedrock; application code alone evaluates them.

**AWS usage.** A real photo was sent to Amazon Bedrock ([model id], [region]) through `backend/src/bedrockAdapter.js`,
returned a schema-valid observation in [latency] ms, and was evaluated by the deterministic rule engine
(see the recorded run). The Mode B limitations about unsupported claims and single-photo evidence still apply.
