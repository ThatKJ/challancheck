# ChallanCheck (First Commit Hackathon)

## Elevate Pitch
ChallanCheck audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.

## The Problem
When the cited violation and the attached photographic evidence in an e-Challan do not appear to match, a driver must manually inspect the evidence, reason about the mismatch, and figure out what to do next.

ChallanCheck makes that comparison explicit and reviewable.

**BEFORE:**
- Read the notice
- Inspect the photo manually
- Reason about the mismatch
- Prepare an explanation manually

**AFTER:**
- Upload the e-Challan evidence
- Select the candidate violation claim
- See a structured evidence comparison
- Understand the uncertainty of the observation
- Export/use the evidence summary

## What We Are Building
ChallanCheck helps drivers compare the cited violation in an e-Challan with observable facts in its photographic evidence. The system uses a deterministic engine that evaluates visual observations and flags inconsistencies, preparing a structured grievance packet.

## Architecture & AWS Integration
The system relies on a strict trust boundary between visual observation and deterministic evaluation. This is a major technical differentiator:
- **Amazon Bedrock (Visual Observation Only)**: The Bedrock integration performs multimodal visual observation on the traffic camera evidence to extract strictly factual data (vehicle type, helmet presence). The model makes no legal judgements.
- **Application Engine (Deterministic Evaluation)**: Application rules deterministically compare the structured factual observations against the selected claim to produce consistent, reliable outcomes.

## Setup & Running Locally

**Backend — rule engine, schema validation, tests (no AWS account needed):**
```
npm install
npm test
```

**Bedrock spike (blocked pending AWS credentials — see RULES_SNAPSHOT.md):**
Once an AWS account/credentials exist, drop 5 traffic-evidence images into `scripts/fixtures/` and run:
```
AWS_REGION=<region> BEDROCK_MODEL_ID=<model-id> npm run spike:bedrock
```

**Frontend (3-screen React app for upload, claim selection, and evidence audit):**
```
cd frontend
npm install
npm run dev
```

## AI Tools Used
- Antigravity AI agents used for product ideation, task management, code generation, and verification.
- (If Mode A): Amazon Bedrock used for multimodal image observation.
