# ChallanCheck (First Commit Hackathon)

## Elevate Pitch
ChallanCheck audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.

## The Problem
Automated traffic cameras can issue incorrect e-Challans (e.g. fining a car driver for "no helmet"). Disputing them requires manually analyzing evidence and navigating a bureaucratic grievance portal.

## What We Are Building
ChallanCheck is designed to be an Evidence Consistency Engine. The user uploads a screenshot of the e-Challan and its evidence photo. The deterministic engine currently extracts visual facts and identifies mismatches (like "Car vs Helmet violation"), preparing a structured grievance packet.

## AWS Integration
- **Amazon Bedrock**: The Bedrock integration will perform multimodal visual observation on the traffic camera evidence to extract structured facts (vehicle type, helmet presence) WITHOUT making legal judgements.
- **AWS Lambda / API Gateway**: Will act as the serverless backend for the rule engine.

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

**Frontend (currently the unmodified Vite starter template — not yet wired to the backend):**
```
cd frontend
npm install
npm run dev
```

## AI Tools Used
- Antigravity AI agents used for product ideation, task management, code generation, and verification.
- Amazon Bedrock used for multimodal image observation.
