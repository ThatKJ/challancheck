# Deployment (infra/)

What this deploys, why, and what it costs to think about. For **what is actually
deployed right now and what was verified**, see `docs/CANONICAL_RUN.md`; this file
describes the design and the command, not the current state.

```
browser ──► API Gateway (HTTP API) ──► ONE Lambda (Node.js 22, arm64) ──► Amazon Rekognition (DetectLabels)
              POST /audit, POST /api/*         backend/lambda.js
                each throttled tight           GET /, /assets/*  the built web app (static)
              everything else  looser          GET /health       liveness, no AWS call (also /api/health)
                                               POST /audit       image -> Rekognition observation (also /api/audit)
```

The deterministic rule engine runs **in the browser** (as it does locally): the
function only relays what Rekognition observed, and never decides a verdict. On any
failure it returns a coded error with a non-2xx status and **never an
observation**; there is no fixture path in the deployed bundle (`fixtureAdapter.js`
is deleted from it, and a test guards the entry points).

## Deploy

```
bash infra/deploy.sh                 # build, scan, upload, deploy, smoke-test
PREVIEW=1 bash infra/deploy.sh       # same, but only creates the change set; applies nothing
```

Needs the AWS CLI, Node/npm and `zip` (no SAM/CDK/Terraform). Credentials are the
standard provider chain (`aws login`, `AWS_PROFILE`, SSO); nothing credential-shaped is
read, written or printed. The script builds the web app with `VITE_API_BASE_URL=/api`,
bundles it with the function, **scans the bundle for secret-shaped content and aborts if
any is found**, uploads the zip to a private S3 bucket, deploys `template.yaml`, then
smoke-tests `/`, `GET /health` and `GET /api/health` (which must answer JSON, not the app's HTML),
`GET /audit` (a coded JSON 405; no AWS call), and that an unknown POST path is refused. It never POSTs an image.
Remove everything with `aws cloudformation delete-stack --stack-name challancheck-api`
(plus the artifact bucket `challancheck-artifacts-<account>-<region>`).

## Why each piece is here

| Piece | The real problem it solves | Simpler option, and why not |
|---|---|---|
| **Lambda** | A request-driven API that is idle almost all the time. Nothing runs, or is billed, while idle, and it gives the code an IAM **role**, so no access keys exist anywhere. | EC2/ECS/App Runner: always-on cost and more to operate for a stateless function. |
| **The same Lambda serves the web app** | One origin, so **no CORS** to get wrong and no second hosting stack. The app is 5 small files and loads nothing from other origins. | S3 + CloudFront (or Amplify): more services, and CloudFront can require new-account verification. Trade-off accepted: no CDN, and each file request is a Lambda invocation. Fine at demo scale; if traffic grew, only the static files would move. |
| **API Gateway (HTTP API)** | A *public* endpoint that spends money per call needs a throttle. HTTP API gives per-route rate/burst limits. | A Lambda Function URL has no request throttling, the control we most want on a public, cost-bearing endpoint. |
| **Amazon Rekognition** (`DetectLabels`) | The visual observer: labels, instance boxes and image-quality measurements. A managed service, nothing to provision. | Amazon Bedrock was the original design (a multimodal model as observer); the account's Bedrock access stayed restricted, so it is not deployed. |
| **CloudWatch Logs** | Debugging and request timing: one structured line per request, 14-day retention, **no image data, plate text or bodies**. | none |
| **S3 (deploy time only)** | Holds the function zip for CloudFormation. Nothing at runtime touches S3. | Images travel inline as base64, so no storage service is needed. |

Deliberately absent: DynamoDB, RDS, Cognito, SQS, SNS, EventBridge, Step Functions,
ECS, EKS. Nothing in the core flow needs to persist or queue anything.

## Region and observer

- **Region `ap-south-1` (Mumbai)**: the users are in India and it is the account's
  configured region. Rekognition `DetectLabels` was called there successfully (the direct
  CLI call and the deployed function; `docs/CANONICAL_RUN.md` section 2c).
- **Observer: Rekognition `DetectLabels`** with `GENERAL_LABELS` and `IMAGE_PROPERTIES`,
  minimum confidence 70, at most 30 labels. It takes **JPEG and PNG only** (the adapter refuses
  WebP and GIF with a coded 415 before any AWS call) and at most 5 MB of image bytes (the
  upload cap is 3 MB). The adapter (`backend/src/rekognitionAdapter.js`) maps the response into
  the observation schema; it takes no model id and the stack has no model parameters.
- **What it cannot do, so the schema says "not established" instead of guessing:** decide
  whether a rider wears a helmet, read plate text, or measure occlusion.
- **Bedrock, the original design.** The stack used to invoke a Claude inference profile
  (`global.anthropic.claude-sonnet-5`) through Bedrock. Every call was refused because the
  newly created account had temporary service and model restrictions (confirmed by AWS Support), so
  the template no longer contains any Bedrock permission, parameter or environment variable.
  `backend/src/bedrockAdapter.js` stays in the repository, is not imported by the deployed
  entry points, and still ships in the zip unused.
- **Unknowns, listed rather than assumed.** Rekognition's accuracy on real challan photos, and any
  helmet or motorcycle photo end to end on the live path, are unmeasured; one real car photo was run.

## Security

- **No secrets.** The function uses its execution role. IAM allows exactly one action,
  `rekognition:DetectLabels`, plus writing to its own log group. Not `rekognition:*`, not
  `AmazonRekognitionFullAccess`, not AdministratorAccess, no managed policy, and nothing on Bedrock.
  DetectLabels has no resource-level permissions, so its `Resource` has to be `"*"`; it is narrowed
  by a `aws:RequestedRegion` condition to the stack's region. The function has no environment variables.
  A test reads `infra/template.yaml` and fails if the policy grows.
- **Rekognition is reachable only through `POST /audit` and `POST /api/*`**, two routes that each
  have their own tight throttle (default 3 requests/second sustained, burst 6, per route).
  The handler routes no other path to it, and a test reads `infra/template.yaml` and
  `backend/lambda.js` and fails if a Rekognition-reaching path lacks its own throttled route, so
  the looser static-file throttle (50/100) can never be used to reach Rekognition.
- **Web app hardening:** strict CSP (`default-src 'self'`, `frame-ancestors 'none'`,
  `connect-src 'self'`, no `unsafe-eval`, no inline script), `nosniff`, `no-referrer`,
  `X-Frame-Options: DENY`. Path traversal on the static handler is covered by tests. No
  CORS is configured because nothing cross-origin is needed.
- **No account details in responses:** error text from AWS is passed through a
  redactor (ARNs, 12-digit account ids, key ids) because an AccessDenied message can
  name the caller. `/health` (and `/api/health`) return only status, service name, mode, region and observer name.
- **Abuse and cost.** The API is public and unauthenticated. A key shipped in a browser
  bundle is not a secret, so none is pretended. Anyone with the URL can still cause
  Rekognition spend up to the throttle; the Free plan's credits bound the exposure, and
  deleting the stack removes it.

## Cost: what drives it (no numbers invented)

- **Static hosting adds almost no compute**: a page view is a handful of short Lambda
  invocations serving small files.
- **API Gateway and Lambda are request-driven**: nothing is billed while idle, and
  Lambda time is dominated by waiting on Rekognition.
- **Rekognition `DetectLabels` is the primary variable cost** and the only AI cost. It is
  billed per image analysed, so cost scales with uploads. The throttle bounds the worst case.
- **No database and nothing idle.** Nothing is persisted, so there is no storage or
  always-on service to pay for; the one S3 bucket holds a small deploy artifact.
- Prices are on AWS's pricing pages and are deliberately not copied here.

## Limits that shaped the design

API Gateway HTTP API 10 MB → Lambda synchronous request **6 MB (6,291,556 bytes)** →
Rekognition's per-image limit (5 MB of bytes; JPEG and PNG). Base64 inflates the body by 4/3. This was observed, not just
calculated: a 4.63 MB image, which the UI used to accept (its limit was 5 MB), became a
6,466,890-byte request and the live gateway refused it with HTTP 413
`{"message":"Request Entity Too Large"}` before any of our code ran. The image cap is
therefore **3 MB** (a 4 MB request) in the browser and the server alike, pinned by
`tests/unit/uploadContract.test.js`. Lambda's timeout is 28 s, under API Gateway's 30 s
integration cut-off. The adapter sets no Rekognition request timeout of its own (SDK defaults), so a hung
call ends at Lambda's timeout as a gateway-level error, not a coded one.
