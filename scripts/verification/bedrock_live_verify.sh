#!/bin/sh
# REDTEAM-owned live-Bedrock repeat-variance probe. See bedrock_live_checklist.md (L-05, L-08, L-09).
# Human approval required before running: makes real InvokeModel calls (micro-cost).
# Exits 0 + SKIP banner when credentials or fixtures are absent (never fails spuriously).
# Usage: sh scripts/verification/bedrock_live_verify.sh
set -eu
cd "$(dirname "$0")/../.."
OUTDIR="${OUTDIR:-/tmp/bedrock_live}"
mkdir -p "$OUTDIR"

echo "--- L-01 creds precheck ---"
if ! aws sts get-caller-identity --output text >/dev/null 2>&1; then
  echo "SKIP: no AWS credentials in this environment (P0-01 still blocked). Nothing was called; no cost incurred."
  exit 0
fi
echo "ok: AWS identity resolves"

echo "--- L-03 fixtures precheck ---"
COUNT=$(ls scripts/fixtures/*.{jpg,jpeg,png,webp} 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -lt 5 ]; then
  echo "SKIP: only $COUNT fixture image(s) in scripts/fixtures/ (need 5). Nothing was called."
  exit 0
fi
echo "ok: $COUNT fixture images"

echo "--- L-05 repeat runs (3x spike) ---"
FAIL=0
i=1
while [ "$i" -le 3 ]; do
  if npm run spike:bedrock > "$OUTDIR/run$i.log" 2>&1; then
    echo "run$i: exit 0"
  else
    echo "run$i: SPIKE FAILED (see $OUTDIR/run$i.log)"; FAIL=1
  fi
  i=$((i + 1))
done
[ "$FAIL" -ne 0 ] && echo "FAIL: spike did not complete cleanly 3x" && exit 1

echo "--- schema-valid rate across runs ---"
grep -h '"schemaValid": true' "$OUTDIR"/run*.log | wc -l | xargs -I{} echo "schemaValid=true observations: {} (expect 15 = 5 fixtures x 3 runs)"

echo "--- L-05 variance: vehicle/helmet values per fixture across runs ---"
grep -h -E '"(vehicle_type|helmet)"' "$OUTDIR"/run*.log | sort | uniq -c | sort -rn | head -30
echo "(eyeball: identical values 3x each, or differences only at confidence < 0.7)"

echo "--- L-08 legal-leakage grep over model outputs ---"
if grep -hiE 'guilt|innocen|illegal|legal|cancel this|dispute|you should pay|fine of' "$OUTDIR"/run*.log; then
  echo "FAIL: possible legal-decision leakage in model output — file QA finding"; exit 1
else echo "ok: no legal-leakage phrases in outputs"; fi

echo "--- L-09 latency tail ---"
grep -hoE '"latencyMs": [0-9]+' "$OUTDIR"/run*.log | grep -oE '[0-9]+' | sort -n | awk '{a[NR]=$1} END {if(NR>0){print "n="NR" min="a[1]"ms p50~"a[int(NR*0.5)+1]"ms max="a[NR]"ms"} else {print "no latency samples"}}'

echo "--- done: paste L-05/L-08/L-09 numbers into bedrock_live_checklist.md ---"
