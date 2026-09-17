# AI Coordination

- **Current product decision**: Invoice digitizer (KiranaSync).
- **Protected interfaces/files**: `docs/*` (Agent 1 owns).
- **Active agent responsibilities**:
  - **Agent 1 (Command/Product)**: Protects product truth, manages scope, rules, and submission narrative.
  - **Agent 2 (Implementation)**: Writes the application code, AWS integration, and frontend.
  - **Agent 3 (Red Team/Verification)**: Security checks, failure state testing, validating AWS usage.
- **Important verified facts**: AWS must perform a core function. Deadline is Sept 20. Video must be <= 3 mins.
- **Integration contracts**: Frontend sends base64 image or multipart form to API Gateway. Lambda returns JSON array of items: `[{name, quantity, price}]`.
- **Unresolved risks**: Exact submission cutoff time on Sept 20. Need to verify AWS credentials/access with the human.
- **Multi-agent note (2026-09-18)**: Two sessions are both running as Agent 2 in parallel (human's explicit choice, to coordinate via this doc + TASK_BOARD.md rather than one standing down): `aws-4c` owns backend/AWS infra (Lambda, API Gateway, Textract/Bedrock pipeline, DynamoDB, IaC); `aws-0b` owns frontend (React scaffold, upload UI, results table, API integration against the `[{name, quantity, price}]` contract below). aws-4c went unreachable via cross-session messaging shortly after claiming its tasks — if it resumes, re-sync via TASK_BOARD.md before editing shared files (README.md, docs/*) to avoid clobbering its work. Both agents lack AWS credentials; frontend proceeds against a mocked API response until credentials are provided.
