#!/bin/sh
# REDTEAM-owned secret scanner. Re-run after any env/secret change and before submission.
# Usage: sh scripts/verification/secret_scan.sh   (exit 0 = clean, 1 = leak found)
set -eu
cd "$(dirname "$0")/../.."
FAIL=0

echo "--- tracked files matching sensitive names ---"
# Self-match exclusion: this scanner's own filename contains "secret".
if git ls-files | grep -iE '\.env$|\.env\.|credential|secret|\.pem$|\.key$|id_rsa' | grep -v '^scripts/verification/secret_scan.sh$'; then
  echo "LEAK: sensitive filename tracked"; FAIL=1
else echo "ok: no sensitive filenames tracked"; fi

echo "--- content scan of tracked files ---"
# NOTE: aws_secret_access_key is matched assignment-shaped (key = VALUE) on
# purpose: the bare string appears in this scanner's own pattern list and in
# QA/AGENT_LOG prose about what was searched for — those are not leaks. A real
# leaked assignment has 20+ base64 chars after `=`/`:` and still trips this.
for pat in 'AKIA[0-9A-Z]{16}' 'aws_secret_access_key[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{20,}' 'xox[bpas]-' 'ghp_[A-Za-z0-9]{36}' '-----BEGIN [A-Z ]*PRIVATE KEY-----'; do
  if git grep -nE -e "$pat" -- . ; then echo "LEAK: pattern $pat"; FAIL=1; fi
done
[ "$FAIL" -eq 0 ] && echo "ok: no secret patterns in tracked files"

echo "--- content scan of untracked, non-ignored files (git grep is blind here) ---"
UNTRACKED=$(git ls-files --others --exclude-standard | grep -v '^node_modules/' | grep -v '^scripts/verification/' || true)
if [ -n "$UNTRACKED" ]; then
  for pat in 'AKIA[0-9A-Z]{16}' 'aws_secret_access_key[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{20,}' 'aws_session_token[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{20,}'; do
    if echo "$UNTRACKED" | xargs grep -lE -e "$pat" 2>/dev/null; then echo "LEAK in untracked files: $pat"; FAIL=1; fi
  done
  [ "$FAIL" -eq 0 ] && echo "ok: no secret patterns in untracked files"
else echo "ok: no untracked files to scan"; fi

echo "--- history scan (added lines only, value-shaped) ---"
# -S counts literal-string occurrences, so it fires on this scanner's own
# introduction commits and on QA prose quoting the patterns. Instead, scan added
# diff lines for VALUE-shaped matches, excluding regex-literal prose (which
# contains the bracket form AKIA[0-9A-Z], never a real key).
if git log --all -p -- . 2>/dev/null | grep -E '^\+[^+]*AKIA[0-9A-Z]{16}' | grep -v 'AKIA\[0-9A-Z\]' | grep -q .; then
  echo "LEAK in history: AKIA value"; FAIL=1
fi
if git log --all -p -- . 2>/dev/null | grep -E '^\+[^+]*aws_secret_access_key[[:space:]]*[:=][[:space:]]*[A-Za-z0-9/+=]{20,}' | grep -q .; then
  echo "LEAK in history: aws_secret_access_key assignment"; FAIL=1
fi
[ "$FAIL" -eq 0 ] && echo "ok: no secret patterns in history"

echo "--- root .gitignore guard (must cover env files before secrets arrive) ---"
if [ -f .gitignore ] && grep -qE '\*?\.env' .gitignore; then echo "ok: root .gitignore covers env files"
else echo "GAP: no root .gitignore covering *.env (see QA RED-004)"; FAIL=1; fi

exit "$FAIL"
