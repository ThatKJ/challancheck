# AI Coordination

- **Current product decision**: ChallanCheck (Evidence Consistency Engine).
- **Protected interfaces/files**: `docs/*` (Agent 1 owns).
- **Active agent responsibilities**:
  - **Agent 1 (Command/Product)**: Protects product truth, manages scope, rules, and submission narrative.
  - **Agent 2 (Implementation)**: Do not build UI yet. First build a minimal Bedrock multimodal spike that extracts structured observations from 5 traffic-evidence images.
  - **Agent 3 (Red Team/Verification)**: Security checks, failure state testing, validating AWS usage.
- **Integration contracts**: Bedrock returns structured JSON observations ONLY. The application code evaluates mismatches using deterministic rules.
- **Unresolved risks**: Bedrock vision accuracy on poor quality traffic camera footage.
