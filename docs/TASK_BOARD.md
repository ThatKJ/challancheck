# Task Board

| Task | Priority | Owner | Status | Dependency | Verification |
|------|----------|-------|--------|------------|--------------|
| Minimal Bedrock Multimodal Spike | P0 | Agent 2 | TODO | None | Script successfully extracts structured JSON from 5 diverse traffic images |
| Provide AWS Credentials | P0 | Human | BLOCKED | None | Secrets injected into env |
| Implement Bedrock rules engine | P1 | Agent 2 | TODO | Spike | Deterministic rules flag mismatches |
| Implement Frontend upload & display | P1 | Agent 2 | TODO | Engine | Can upload image and show Evidence Consistency Report |
| Security check (no leaked credentials) | P0 | Agent 3 | TODO | End-to-end | No secrets in git, IAM least privilege |
| Test failure states (bad image, ambiguous) | P1 | Agent 3 | TODO | End-to-end | App shows INSUFFICIENT EVIDENCE |
| Record 3-minute demo video | P0 | Human | TODO | Frontend | Video file ready |
| Finalize README & Submission | P0 | Agent 1 | TODO | Video ready | README matches final metrics |
