# Product Decision — PROVISIONAL LOCK

> **Status note (2026-09-19).** This is the original product decision and describes intent. What is actually built
> is in `README.md` and `docs/SUBMISSION.md`. **Not built:** PDF input, OCR or automatic extraction of the violation
> text and evidence image from a screenshot, the grievance packet, and the grievance-portal link. Live Amazon Bedrock
> is unverified (`docs/CANONICAL_RUN.md`).

## User
Indian driver who received an automated e-Challan (traffic ticket).

## Problem
Automated traffic cameras can issue incorrect e-Challans (e.g., fining a car driver for "no helmet", or misidentifying a license plate). Disputing them requires manually analyzing the evidence photo and navigating a bureaucratic grievance portal.

## Product: ChallanCheck
An Evidence Consistency Engine that audits whether the photographic evidence attached to an e-challan is consistent with the violation being claimed.

## One-Sentence Pitch
ChallanCheck audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.

## Primary Input
A screenshot or PDF of the e-Challan, including the traffic camera's "evidence" photo and the claimed violation text. *(As built: the claim is typed in manually and one evidence image is attached; screenshot/PDF extraction is not built.)*

## Primary Pipeline
Upload -> Extract violation + metadata -> Extract attached evidence image -> Amazon Bedrock multimodal analysis -> Structured observations -> Deterministic compatibility rules -> Evidence Consistency Report -> Grievance-ready evidence packet. *(As built: claim + image -> observation -> deterministic rules -> report. The extraction steps and the grievance packet are not built; the Bedrock step is unverified.)*

## Role of AWS
Amazon Bedrock multimodal processing (Claude 3) is planned to act as the visual observer. It will extract structured facts from the image (e.g., vehicle type, helmet presence) without making legal judgements. *(The adapter currently targets the `global.anthropic.claude-sonnet-5` inference profile; no call has succeeded.)*

## Demo Wow Moment
"This challan says: No Helmet. But this is the attached evidence." -> Shows a car.
Click "Audit Evidence".
The app observes "Passenger car" and the deterministic engine flags: "Mismatch: Vehicle category appears inconsistent with the cited violation."
*(Original intent, not built: generate a grievance packet with a button to "Open official grievance portal". As built, the app shows the evidence consistency report only.)*

## Explicit Non-Goals
- DO NOT act as an AI lawyer.
- DO NOT make legal guilt/innocence decisions.
- DO NOT try to connect directly to the government database (uploading screenshots is safer).

## Scope Limitations
- ChallanCheck evaluates ONE violation at a time. If the challan's violation text cites multiple claims, the system detects and surfaces all of them and the user explicitly chooses which one to audit — it never silently defaults to the first/primary claim (Addresses RED-008; human product decision, 2026-09-18, supersedes an earlier draft of this section that proposed silently auditing "the primary targeted claim").

## Safety / Truth Rule
The AI only observes visual facts. The application code (deterministic rules) decides if those facts conflict with the violation claim. If the image is too blurry, the system explicitly outputs "INSUFFICIENT EVIDENCE".