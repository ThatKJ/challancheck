# Submission Narrative

**Problem**: Automated traffic cameras can issue incorrect e-Challans (e.g. fining a car driver for "no helmet"). Disputing them requires manually analyzing evidence and navigating a bureaucratic grievance portal.

## Submission Modes

### MODE A — LIVE AWS VERIFIED
*(Use this ONLY if AWS credentials arrive and pipeline is verified)*
**Build**: ChallanCheck is an Evidence Consistency Engine that audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.
**AWS Usage**: Amazon Bedrock analyzes multimodal visual observation on the traffic camera evidence. The live pipeline extracts structured facts (vehicle type, helmet presence) which are then fed into a deterministic compatibility rule engine.

### MODE B — AWS NOT VERIFIED
*(Use this if AWS credentials are not provided before deadline)*
**Build**: ChallanCheck is designed to be an Evidence Consistency Engine that audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation. The deterministic engine currently extracts visual facts (via mocked integration) and flags mismatches.
**AWS Usage**: The Bedrock integration will perform multimodal visual observation on the traffic camera evidence. Due to AWS account creation blockers (credit card verification delays) during the hackathon, the live AWS pipeline remains incomplete, but the core deterministic rule engine and observation schema validators are fully functional locally.

**AI Disclosure**:
- Used Antigravity AI agents for product ideation, task management, and code generation.
- (If Mode A): Used Amazon Bedrock for multimodal image observation.
