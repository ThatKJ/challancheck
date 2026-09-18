# Task Board

## P0

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P0-01 | Verify AWS credentials/model access | BUILD | IN_PROGRESS | |
| P0-02 | Bedrock multimodal spike | BUILD | TODO | |
| P0-03 | Observation schema validation | BUILD | TODO | |
| P0-04 | Core deterministic rule engine | BUILD | TODO | |
| P0-05 | Adversarial rule audit | REDTEAM | IN_PROGRESS | Engine absent; 14 traps pre-registered in tests/adversarial/rule_expectations.json; see QA RED-005 |
| P0-06 | Secret/security scan | REDTEAM | IN_PROGRESS | Scan clean on tracked files+history (script verified); GAP: no root .gitignore — see QA RED-004 |
| P0-07 | Core E2E workflow | BUILD | TODO | |

## P1

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P1-01 | Upload screenshot/PDF | BUILD | TODO | |
| P1-02 | Violation extraction | BUILD | TODO | |
| P1-03 | Evidence crop/extraction | BUILD | TODO | |
| P1-04 | Side-by-side result | BUILD | TODO | |
| P1-05 | Failure states | BUILD | TODO | |
| P1-06 | Deployment | BUILD | TODO | |
| P1-07 | Demo narrative | LEAD | TODO | |
| P1-08 | Claim audit | REDTEAM | IN_PROGRESS | 3 claim defects filed (QA RED-003); scanner at scripts/verification/claims_audit.sh |

## P2

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| P2-01 | Evidence PDF | BUILD | TODO | |
| P2-02 | Visual highlighting | UI | BLOCKED | UI_READY=false |
| P2-03 | Motion/polish | UI | BLOCKED | UI_READY=false |
