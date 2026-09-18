# Submission Narrative

**Problem**: Automated traffic cameras can issue incorrect e-Challans (e.g. fining a car driver for "no helmet"). Disputing them requires manually analyzing evidence and navigating a bureaucratic grievance portal.
**Build**: ChallanCheck is planned to be an Evidence Consistency Engine that will audit whether the photographic evidence attached to an e-challan is actually consistent with the claimed violation.
**AWS Usage**: 
- **Amazon Bedrock**: Is planned to perform multimodal visual observation on the traffic camera evidence, extracting structured facts (vehicle type, helmet presence) which will then be fed into a deterministic compatibility rule engine.

**AI Disclosure**:
- Used Antigravity AI agents for product ideation, task management, and code generation.
- Used Amazon Bedrock for multimodal image observation.
