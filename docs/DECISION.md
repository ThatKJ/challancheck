# Product Decision — PROVISIONAL LOCK

## User
Indian driver who received an automated e-Challan (traffic ticket).

## Problem
Automated traffic cameras can issue incorrect e-Challans (e.g., fining a car driver for "no helmet", or misidentifying a license plate). Disputing them requires manually analyzing the evidence photo and navigating a bureaucratic grievance portal.

## Product: ChallanCheck
An Evidence Consistency Engine that audits whether the photographic evidence attached to an e-challan is consistent with the violation being claimed.

## One-Sentence Pitch
ChallanCheck audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.

## Primary Input
A screenshot or PDF of the e-Challan, including the traffic camera's "evidence" photo and the claimed violation text.

## Primary Pipeline
Upload -> Extract violation + metadata -> Extract attached evidence image -> Amazon Bedrock multimodal analysis -> Structured observations -> Deterministic compatibility rules -> Evidence Consistency Report -> Grievance-ready evidence packet.

## Role of AWS
Amazon Bedrock multimodal processing (Claude 3) acts as the visual observer. It extracts structured facts from the image (e.g., vehicle type, helmet presence) without making legal judgements. 

## Demo Wow Moment
"This challan says: No Helmet. But this is the attached evidence." -> Shows a car.
Click "Audit Evidence".
The app observes "Passenger car" and the deterministic engine flags: "Mismatch: Vehicle category appears inconsistent with the cited violation."
Generates a grievance packet with a button to "Open official grievance portal".

## Explicit Non-Goals
- DO NOT act as an AI lawyer.
- DO NOT make legal guilt/innocence decisions.
- DO NOT try to connect directly to the government database (uploading screenshots is safer).

## Scope Limitations
- ONE violation is evaluated per audit. If a challan cites multiple offences, the system will only audit the primary targeted claim (Addresses RED-008).

## Safety / Truth Rule
The AI only observes visual facts. The application code (deterministic rules) decides if those facts conflict with the violation claim. If the image is too blurry, the system explicitly outputs "INSUFFICIENT EVIDENCE".