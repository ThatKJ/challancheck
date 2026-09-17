# ChallanCheck (First Commit Hackathon)

## Elevate Pitch
ChallanCheck audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.

## The Problem
Automated traffic cameras can issue incorrect e-Challans (e.g. fining a car driver for "no helmet"). Disputing them requires manually analyzing evidence and navigating a bureaucratic grievance portal.

## What We Built
**ChallanCheck** is an Evidence Consistency Engine. The user uploads a screenshot of the e-Challan and its evidence photo. The app extracts visual facts and uses deterministic rules to identify mismatches (like "Car vs Helmet violation"), preparing a structured grievance packet.

## AWS Integration
- **Amazon Bedrock**: Performs multimodal visual observation on the traffic camera evidence to extract structured facts (vehicle type, helmet presence) WITHOUT making legal judgements.
- **AWS Lambda / API Gateway**: Serverless backend for the rule engine.

## Setup & Running Locally

*(To be updated by Agent 2)*

## AI Tools Used
- Antigravity AI agents used for product ideation, task management, code generation, and verification.
- Amazon Bedrock used for multimodal image observation.
