# Task Board

| Task | Priority | Owner | Status | Dependency | Verification |
|------|----------|-------|--------|------------|--------------|
| Provide AWS Credentials | P0 | Human | BLOCKED | None | Secrets injected into env |
| Setup backend project structure (Node) | P0 | Agent 2 (aws-4c) | IN_PROGRESS | None | Repo has working boilerplate |
| Create AWS Architecture (CDK/SAM or manual script) | P0 | Agent 2 (aws-4c) | IN_PROGRESS | Setup | AWS resources defined |
| Implement Textract + Bedrock Lambda | P0 | Agent 2 (aws-4c) | TODO | AWS Arch | Lambda can process a test image and output JSON |
| Setup frontend project structure (React) | P0 | Agent 2 (aws-0b) | IN_PROGRESS | None | Repo has working React boilerplate |
| Implement Frontend upload & display | P0 | Agent 2 (aws-0b) | TODO | Frontend setup | Can upload image and show dummy data table |
| Integrate Frontend with API Gateway | P0 | Agent 2 (aws-0b) | TODO | Frontend, Lambda | End-to-end flow works with real image |
| Security check (no leaked credentials) | P0 | Agent 3 | TODO | End-to-end | No secrets in git, IAM least privilege |
| Test failure states (bad image, timeout) | P1 | Agent 3 | TODO | End-to-end | App shows graceful error message |
| UI Polish & Loading states | P2 | Agent 2 | TODO | End-to-end | Looks premium, smooth loading animations |
| Record 3-minute demo video | P0 | Human | TODO | UI Polish | Video file ready |
| Finalize README & Submission | P0 | Agent 1 | TODO | Video ready | README matches final metrics and AI disclosure |
