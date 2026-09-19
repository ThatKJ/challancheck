# Claude 6 PM Handoff

This document is the precise handoff for Claude resuming at 6 PM. The project is currently in **FINAL MODE**. We are targeting the "Ship It" and "Best UI" judging categories for the First Commit Hackathon. 

## CURRENT STATE
The project codebase is completely frozen. The UI and Backend integration for the local fixture demo (Mode B) is complete, tested, and passing all checks (89/89 tests). We are currently blocked exclusively by an AWS-side account verification delay (`ValidationException: Operation not allowed` on Bedrock).

## LAST KNOWN GOOD COMMITS
- `7560a13` (docs: align submission narrative, learning log, and demo script to final criteria) - **HEAD**
- `c09b107` (chore: consolidate final frontend and backend artifacts for freeze) - **Code Freeze**

## FRONTEND STATUS
- **Status**: FROZEN (UI Gate = PASS)
- **Details**: The 3-screen React app (upload, claim selection, side-by-side audit) is fully responsive, polished, and handles all edge cases (AWS down, multiple claims). 

## BACKEND STATUS
- **Status**: FROZEN (89/89 Tests Passing)
- **Details**: Deterministic rule engine, observation schema validation, and violation extraction are fully implemented and verified against adversarial traps. The Bedrock adapter (`bedrockAdapter.js`) is written and cleanly fails with `AWS_NOT_CONFIGURED` or `AWS_ERROR` when appropriate. A local Node server (`server.js`) wraps the adapter for the UI.

## AWS STATUS
- **Status**: BLOCKED (AWS Account Verification Delay)
- **Details**: AWS CLI identity is verified, but Bedrock invocation throws `ValidationException: Operation not allowed` across all models. We are waiting for the AWS-side account verification gate to clear.

## OPEN P0
- **P0-01**: Verify AWS credentials/model access (Waiting for Bedrock to unblock).

## OPEN P1
- **None.** All P1s (Demo Narrative, Failure States, Violation Extraction, UI) are DONE.

## EXACT FILES TO TOUCH
**If AWS unblocks (Mode A):**
- `scripts/fixtures/*` (Drop 5 evidence images here for the spike)
- `docs/CANONICAL_RUN.md` (Update metrics with the Live AWS run)
- `docs/SUBMISSION.md` (Delete the Mode B section, keep Mode A)
- `README.md` (Remove the "If Mode A" conditional text)

**If AWS does NOT unblock (Mode B):**
- **ZERO FILES**. Do not touch anything. The project is ready for submission as-is.

## EXACT COMMANDS TO RUN
To check if AWS is unblocked:
```bash
# 1. Verify identity
aws sts get-caller-identity

# 2. Run the minimal text-check to isolate image issues
npm run check:bedrock-text

# 3. If text-check passes, run the multimodal spike
npm run spike:bedrock
```

To run the full E2E application locally:
```bash
# Terminal 1: Start Backend Server
npm run server

# Terminal 2: Start Frontend
npm run dev --prefix frontend
```

## EXPECTED RESULTS
- `npm run check:bedrock-text` should exit 0 and print `PASS` with latency metrics.
- `npm run spike:bedrock` should successfully parse the fixture images and return structured JSON matching the Observation Schema.

## DEPLOYMENT PLAN
- **Status**: CUT.
- **Details**: P1-06 (Deployment) was explicitly cut to prioritize core functionality and demo clarity. The final demo will be recorded running locally (`npm run server` + `npm run dev`), which is fully acceptable for the "Build It" tier, and we will lean on the strict Bedrock isolation architecture for the learning story.

## CANONICAL RUN PLAN
- **Current (Mode B)**: Recorded in `CANONICAL_RUN.md`. Total request latency is ~28ms using synchronous local fixture adapter.
- **Target (Mode A)**: If AWS unblocks, you must execute ONE verified E2E run against a real challan image, record the AWS latency, the detected claims, and the Bedrock observations, and overwrite `CANONICAL_RUN.md` with these real metrics.

## DO-NOT-TOUCH AREAS
- **Frontend Code**: Do not touch `frontend/src/*`. The UI is polished and frozen.
- **Core Engine**: Do not touch `backend/src/ruleEngine.js` or `backend/src/observationSchema.js`.
- **Architectural Boundary**: Do NOT allow the LLM to make legal evaluations. Bedrock is for strictly factual visual observation ONLY. 
- **Features**: Do NOT add any new features (auth, dashboards, PDF parsing, maps, etc.). The project is in FINAL MODE.
