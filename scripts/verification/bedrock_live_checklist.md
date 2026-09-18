# LIVE Bedrock Verification Checklist (REDTEAM-owned)

Run the moment P0-01 unblocks. Human approval required first: this executes
real `InvokeModel` calls (micro-cost) against the team's AWS account.
Fill in measured values; on any FAIL stop and file a QA finding — do not
proceed down the freeze sequence until all rows are PASS.

| # | Check | How | Pass bar | Result |
|---|---|---|---|---|
| L-01 | Creds are env-only, least-privilege | `aws sts get-caller-identity`; confirm no key files in repo (`secret_scan.sh` green) | Identity resolves; no secrets on disk | |
| L-02 | Model enabled in region | `aws bedrock list-foundation-models --region ap-south-1` contains `$BEDROCK_MODEL_ID` (default `anthropic.claude-3-5-sonnet-20241022-v2:0`) | Model listed AND access granted (inference profile if required) | |
| L-03 | 5 fixtures present | `ls scripts/fixtures/` — clear helmet / clear no-helmet / clear car / blurry / occluded | 5 files, all JPEG/PNG/WebP | |
| L-04 | Spike runs clean | `npm run spike:bedrock` exit 0 | All 5 return `schemaValid: true` | |
| L-05 | Repeat variance (same image ×3) | `sh scripts/verification/bedrock_live_verify.sh` | `vehicle_type.value` + `helmet.status` identical across runs, or differing only with confidence < 0.7 (which the engine degrades safely) | |
| L-06 | Blur degrades, doesn't guess | Blurry fixture observation | `image_quality: poor` and/or `helmet.status: uncertain` with low confidence — NOT a confident `not_visible` | |
| L-07 | Crop/multi-vehicle degrades | Occluded fixture observation | `uncertainties` non-empty and/or confidence < 0.7 — NOT a confident verdict fuel | |
| L-08 | No legal-decision leakage | `bedrock_live_verify.sh` greps raw outputs for `guilt|innocen|illegal|\blegal\b|cancel|dispute|fine` | Zero hits in model text (prompt forbids it; verify, don't trust) | |
| L-09 | Latency acceptable for demo | Per-image `latencyMs` from spike output | p100 < 30s (else demo needs a loading state — file P1) | |
| L-10 | Engine still green on live shapes | `npm test` after feeding one live observation through `evaluateConsistency` | 14/14 matrix + suite green; live observation validates via `validateObservation` | |
| L-11 | Metrics frozen | Copy model ID, region, per-image latency, schema-valid rate into `docs/CANONICAL_RUN.md` | Canonical run populated; README/SUBMISSION numbers (if any) match it exactly | |

After L-01..L-11 all PASS: RED-001 can close, P0-02 evidence is real, and the
UI gate inputs (real AWS request + validated observations) exist.
