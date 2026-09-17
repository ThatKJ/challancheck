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
