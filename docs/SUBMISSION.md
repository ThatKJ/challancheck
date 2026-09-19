# Submission Narrative

**Problem**: When the cited violation and the attached photographic evidence in an e-Challan do not appear to match, a driver must manually inspect the evidence, reason about the mismatch, and figure out what to do next. ChallanCheck makes that comparison explicit and reviewable.
## Submission Modes

### MODE A — LIVE AWS VERIFIED
*(Use this ONLY if AWS credentials arrive and pipeline is verified)*
**Build**: ChallanCheck is an Evidence Consistency Engine that audits whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.
**AWS Usage**: Amazon Bedrock analyzes multimodal visual observation on the traffic camera evidence. The live pipeline extracts structured facts (vehicle type, helmet presence) which are then fed into a deterministic compatibility rule engine.

### MODE B — AWS NOT VERIFIED
*(Use this if AWS credentials are not provided before deadline)*
**Build**: ChallanCheck helps drivers compare the cited violation in an e-Challan with observable facts in its photographic evidence. The deterministic engine evaluates visual observations (via mocked local integration) and flags inconsistencies.
**AWS Usage**: The Bedrock integration is designed to perform multimodal visual observation on the traffic camera evidence. Due to AWS account creation blockers (credit card verification delays) during the hackathon, the live AWS pipeline remains incomplete, but the core deterministic rule engine and observation schema validators are fully functional locally.

## Technical Learning
**Initial Assumption**: Our original plan was to send the challan claim and the image to Amazon Bedrock and ask the multimodal model to verify if the challan was legally correct.
**What Failed**: We realized this created an untrustworthy legal inference boundary. The model would "guess" guilt or innocence based on low-confidence artifacts. It effectively functioned as a probabilistic legal defense generator rather than a factual tool.
**What Was Learned / Change**: To build a system with actual trust, the LLM must be strictly constrained to observation. We separated the architecture: Amazon Bedrock performs strictly factual multimodal visual observation (e.g., "Is a helmet visible?"). Application code then deterministically evaluates those observations against the legal claim. This separation is our major technical and architectural differentiator.

**AI Disclosure**:
- Used Antigravity AI agents for product ideation, task management, and code generation.
- (If Mode A): Used Amazon Bedrock for multimodal image observation.
