#!/usr/bin/env bash
# Reproducible deploy of ChallanCheck (web app + API) using plain CloudFormation.
# One Lambda serves both the built app and /api/*. Needs only the AWS CLI,
# Node/npm and zip; no SAM/CDK/Terraform.
#
#   bash infra/deploy.sh
#
# Credentials: the standard AWS provider chain (AWS_PROFILE, `aws login`, SSO,
# env vars). Nothing credential-shaped is read, written or echoed by this script.
#
# Overrides (all optional):
#   AWS_REGION  STACK_NAME  BEDROCK_MODEL_ID  BEDROCK_FOUNDATION_MODEL_ID
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="${AWS_REGION:-ap-south-1}"
STACK="${STACK_NAME:-challancheck-api}"
MODEL_ID="${BEDROCK_MODEL_ID:-global.anthropic.claude-sonnet-5}"
FOUNDATION_MODEL_ID="${BEDROCK_FOUNDATION_MODEL_ID:-anthropic.claude-sonnet-5}"

echo "== identity =="
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
aws sts get-caller-identity --query Arn --output text | sed -E 's/^/caller: /'
echo "region: ${REGION}   stack: ${STACK}   model: ${MODEL_ID}"

BUCKET="challancheck-artifacts-${ACCOUNT}-${REGION}"
echo "== artifact bucket (private) =="
if ! aws s3api head-bucket --bucket "${BUCKET}" 2>/dev/null; then
  # us-east-1 is the one region that must NOT be given a LocationConstraint.
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" >/dev/null
  else
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" \
      --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "${BUCKET}" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  echo "created ${BUCKET}"
else
  echo "exists  ${BUCKET}"
fi

echo "== build web app (API is same-origin at /api) =="
(cd frontend && npm ci --no-audit --no-fund --loglevel=error)
VITE_API_BASE_URL=/api npm run build --prefix frontend

echo "== build function bundle =="
BUILD="$(mktemp -d)"
trap 'rm -rf "${BUILD}"' EXIT
mkdir -p "${BUILD}/pkg/backend" "${BUILD}/pkg/public"
cp -R backend/src "${BUILD}/pkg/backend/src"
cp backend/server.js backend/lambda.js "${BUILD}/pkg/backend/"
# The deployed function can never serve fixture data: the file is not in the bundle.
rm -f "${BUILD}/pkg/backend/src/fixtureAdapter.js"
cp -R frontend/dist/. "${BUILD}/pkg/public/"
cp package.json package-lock.json "${BUILD}/pkg/"
(cd "${BUILD}/pkg" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error)

echo "== scan the bundle for secrets before it leaves this machine =="
# Real key shapes and secret assignments only (not the words themselves), in our
# code and the built web app; third-party node_modules are not ours to scan.
if grep -rIEn "(AKIA|ASIA)[0-9A-Z]{16}|aws_secret_access_key[\"' ]*[:=][\"' ]*[A-Za-z0-9/+=]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----" \
     "${BUILD}/pkg/backend" "${BUILD}/pkg/public"; then
  echo "ABORT: secret-shaped content found in the bundle (above)." >&2
  exit 1
fi
echo "ok: none found"
(cd "${BUILD}/pkg" && zip -qr -X "${BUILD}/function.zip" .)
HASH="$(shasum -a 256 "${BUILD}/function.zip" | cut -c1-16)"
KEY="api/${HASH}.zip"
echo "bundle: $(du -h "${BUILD}/function.zip" | cut -f1)  key: ${KEY}"
aws s3api put-object --bucket "${BUCKET}" --key "${KEY}" --body "${BUILD}/function.zip" >/dev/null

# PREVIEW=1 creates the change set but does NOT execute it, so the exact changes
# (Add / Modify / Replace per resource) can be read before anything is applied:
#   PREVIEW=1 bash infra/deploy.sh   then   aws cloudformation describe-change-set ...
EXECUTE_FLAG=""
if [ "${PREVIEW:-0}" = "1" ]; then EXECUTE_FLAG="--no-execute-changeset"; echo "== PREVIEW: change set only, nothing will be applied =="; fi

echo "== deploy stack =="
aws cloudformation deploy ${EXECUTE_FLAG} \
  --region "${REGION}" \
  --stack-name "${STACK}" \
  --template-file infra/template.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    "BedrockModelId=${MODEL_ID}" \
    "BedrockFoundationModelId=${FOUNDATION_MODEL_ID}" \
    "CodeBucket=${BUCKET}" \
    "CodeKey=${KEY}"

if [ "${PREVIEW:-0}" = "1" ]; then echo "PREVIEW done. Nothing was applied."; exit 0; fi

SITE_URL="$(aws cloudformation describe-stacks --region "${REGION}" --stack-name "${STACK}" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" --output text)"
echo "== deployed =="
echo "SiteUrl: ${SITE_URL}   (API: ${SITE_URL}/api)"
echo "== smoke: web app (expects 200 text/html) =="
curl -sS --max-time 20 -o /dev/null -w "GET /            -> HTTP %{http_code} %{content_type}\n" "${SITE_URL}/"
echo "== smoke: GET /health and /api/health (expect 200 application/json; no AWS call) =="
# A bare 200 proves nothing: an unknown path falls through to the single-page app, which
# also answers 200 (text/html). Health must be JSON, at the root and under /api.
for p in /health /api/health; do
  got="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{content_type}' "${SITE_URL}${p}")"
  echo "GET ${p} -> ${got}"
  case "${got}" in "200 application/json"*) ;; *) echo "FAIL: GET ${p} must be 200 application/json" >&2; exit 1 ;; esac
done
curl -sS --max-time 20 "${SITE_URL}/health"
echo
echo "== smoke: GET /audit is a coded JSON 405, never HTML (no Bedrock call) =="
got="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{content_type}' "${SITE_URL}/audit")"
echo "GET /audit -> ${got}"
case "${got}" in "405 application/json"*) ;; *) echo "FAIL: GET /audit must be 405 application/json" >&2; exit 1 ;; esac
echo "== smoke: an unknown POST path is refused =="
curl -sS --max-time 20 -o /dev/null -w "POST /report      -> HTTP %{http_code} (expect 405)\n" -X POST "${SITE_URL}/report"
