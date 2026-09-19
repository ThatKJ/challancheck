# Deployment (infra/)

What this deploys, why, and what it costs to think about. For **what is actually
deployed right now and what was verified**, see `docs/CANONICAL_RUN.md`; this file
describes the design and the command, not the current state.

```
browser ──► API Gateway (HTTP API) ──► ONE Lambda (Node.js 22, arm64) ──► Amazon Bedrock
              POST /audit, POST /api/*         backend/lambda.js
                each throttled tight           GET /, /assets/*  the built web app (static)
              everything else  looser          GET /health       liveness, no AWS call (also /api/health)
                                               POST /audit       image -> Bedrock observation (also /api/audit)
```

The deterministic rule engine runs **in the browser** (as it does locally): the
function only relays what Bedrock observed, and never decides a verdict. On any
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
`GET /audit` (a coded JSON 405; no Bedrock call), and that an unknown POST path is refused. It never POSTs an image.
Remove everything with `aws cloudformation delete-stack --stack-name challancheck-api`
(plus the artifact bucket `challancheck-artifacts-<account>-<region>`).

## Why each piece is here

| Piece | The real problem it solves | Simpler option, and why not |
|---|---|---|
| **Lambda** | A request-driven API that is idle almost all the time. Nothing runs, or is billed, while idle, and it gives the code an IAM **role**, so no access keys exist anywhere. | EC2/ECS/App Runner: always-on cost and more to operate for a stateless function. |
| **The same Lambda serves the web app** | One origin, so **no CORS** to get wrong and no second hosting stack. The app is 5 small files and loads nothing from other origins. | S3 + CloudFront (or Amplify): more services, and CloudFront can require new-account verification. Trade-off accepted: no CDN, and each file request is a Lambda invocation. Fine at demo scale; if traffic grew, only the static files would move. |
| **API Gateway (HTTP API)** | A *public* endpoint that spends money per call needs a throttle. HTTP API gives per-route rate/burst limits. | A Lambda Function URL has no request throttling, the control we most want on a public, cost-bearing endpoint. |
| **Amazon Bedrock** | The multimodal observer. | none |
| **CloudWatch Logs** | Debugging and request timing: one structured line per request, 14-day retention, **no image data, plate text or bodies**. | none |
| **S3 (deploy time only)** | Holds the function zip for CloudFormation. Nothing at runtime touches S3. | Images travel inline as base64, so no storage service is needed. |

Deliberately absent: DynamoDB, RDS, Cognito, SQS, SNS, EventBridge, Step Functions,
ECS, EKS. Nothing in the core flow needs to persist or queue anything.

## Region and model

- **Region `ap-south-1` (Mumbai)**: the users are in India and it is the account's
  configured region. Bedrock is listed there.
- **Model `global.anthropic.claude-sonnet-5`**, the adapter's own default: a
  **candidate, not a verified choice**. It is an inference-profile ID on purpose (in
  this region the models are `INFERENCE_PROFILE`-only, so a bare model ID cannot be
  invoked). The adapter sends Anthropic's Messages format, so the model must be an
  Anthropic one; a Nova ID would fail on request shape, not access. A `global.` profile
  may route outside Asia-Pacific, which is a data-residency trade-off to make knowingly.
- **Unknowns, listed rather than assumed.** No Bedrock call has succeeded, so quality,
  latency and the multimodal request shape against a real model are unmeasured. Claude
  on this account also still needs Anthropic's first-time-use form
  (`aws bedrock get-use-case-for-model-access` says it has not been filled), and whether
  the function's role additionally needs AWS Marketplace permissions to use the model
  is unknown until access is granted.

## Security

- **No secrets.** The function uses its execution role. IAM allows exactly
  `bedrock:InvokeModel` on the one inference profile and its foundation model, and
  writing to its own log group. Not `bedrock:*`, not `Resource: "*"`, not
  AdministratorAccess. Lambda environment variables hold configuration only.
- **Bedrock is reachable only through `POST /audit` and `POST /api/*`**, two routes that each
  have their own tight throttle (default 3 requests/second sustained, burst 6, per route).
  The handler routes no other path to it, and a test reads `infra/template.yaml` and
  `backend/lambda.js` and fails if a Bedrock-reaching path lacks its own throttled route, so
  the looser static-file throttle (50/100) can never be used to reach Bedrock.
- **Web app hardening:** strict CSP (`default-src 'self'`, `frame-ancestors 'none'`,
  `connect-src 'self'`, no `unsafe-eval`, no inline script), `nosniff`, `no-referrer`,
  `X-Frame-Options: DENY`. Path traversal on the static handler is covered by tests. No
  CORS is configured because nothing cross-origin is needed.
- **No account details in responses:** error text from AWS is passed through a
  redactor (ARNs, 12-digit account ids, key ids) because an AccessDenied message can
  name the caller. `/health` (and `/api/health`) return only status, service name, mode, region and model id.
- **Abuse and cost.** The API is public and unauthenticated. A key shipped in a browser
  bundle is not a secret, so none is pretended. Anyone with the URL can still cause
  Bedrock spend up to the throttle; the Free plan's credits bound the exposure, and
  deleting the stack removes it.

## Cost: what drives it (no numbers invented)

- **Static hosting adds almost no compute**: a page view is a handful of short Lambda
  invocations serving small files.
- **API Gateway and Lambda are request-driven**: nothing is billed while idle, and
  Lambda time is dominated by waiting on Bedrock.
- **Bedrock inference is the primary variable cost** and the only AI cost. It is billed
  by input and output tokens, and an image adds input tokens, so cost scales with
  analysed images. The throttle bounds the worst case.
- **No database and nothing idle.** Nothing is persisted, so there is no storage or
  always-on service to pay for; the one S3 bucket holds a small deploy artifact.
- Prices are on AWS's pricing pages and are deliberately not copied here.

## Limits that shaped the design

API Gateway HTTP API 10 MB → Lambda synchronous request **6 MB (6,291,556 bytes)** →
Bedrock per-image limits. Base64 inflates the body by 4/3. This was observed, not just
calculated: a 4.63 MB image, which the UI used to accept (its limit was 5 MB), became a
6,466,890-byte request and the live gateway refused it with HTTP 413
`{"message":"Request Entity Too Large"}` before any of our code ran. The image cap is
therefore **3 MB** (a 4 MB request) in the browser and the server alike, pinned by
`tests/unit/uploadContract.test.js`. Lambda's timeout is 28 s, under API Gateway's 30 s
integration cut-off. The adapter itself sets no Bedrock request timeout, so a hung
call ends at Lambda's timeout as a gateway-level error, not a coded one.
