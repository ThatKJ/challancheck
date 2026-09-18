#!/bin/sh
# REDTEAM-owned secret scanner. Re-run after any env/secret change and before submission.
# Usage: sh scripts/verification/secret_scan.sh   (exit 0 = clean, 1 = leak found)
set -eu
cd "$(dirname "$0")/../.."
FAIL=0

echo "--- tracked files matching sensitive names ---"
if git ls-files | grep -iE '\.env$|\.env\.|credential|secret|\.pem$|\.key$|id_rsa' ; then
  echo "LEAK: sensitive filename tracked"; FAIL=1
else echo "ok: no sensitive filenames tracked"; fi

echo "--- content scan of tracked files ---"
for pat in 'AKIA[0-9A-Z]{16}' 'aws_secret_access_key' 'xox[bpas]-' 'ghp_[A-Za-z0-9]{36}' '-----BEGIN [A-Z ]*PRIVATE KEY-----'; do
  if git grep -nE -e "$pat" -- . ; then echo "LEAK: pattern $pat"; FAIL=1; fi
done
[ "$FAIL" -eq 0 ] && echo "ok: no secret patterns in tracked files"

echo "--- content scan of untracked, non-ignored files (git grep is blind here) ---"
UNTRACKED=$(git ls-files --others --exclude-standard | grep -v '^node_modules/' | grep -v '^scripts/verification/' || true)
if [ -n "$UNTRACKED" ]; then
  for pat in 'AKIA[0-9A-Z]{16}' 'aws_secret_access_key' 'aws_session_token'; do
    if echo "$UNTRACKED" | xargs grep -lE -e "$pat" 2>/dev/null; then echo "LEAK in untracked files: $pat"; FAIL=1; fi
  done
  [ "$FAIL" -eq 0 ] && echo "ok: no secret patterns in untracked files"
else echo "ok: no untracked files to scan"; fi

echo "--- history scan (adds only, cheap) ---"
for pat in 'AKIA[0-9A-Z]{16}' 'aws_secret_access_key'; do
  if git log --all --oneline -S "$pat" -- . | grep -q .; then
    echo "LEAK in history: $pat"; FAIL=1
  fi
done
[ "$FAIL" -eq 0 ] && echo "ok: no secret patterns in history"

echo "--- root .gitignore guard (must cover env files before secrets arrive) ---"
if [ -f .gitignore ] && grep -qE '\*?\.env' .gitignore; then echo "ok: root .gitignore covers env files"
else echo "GAP: no root .gitignore covering *.env (see QA RED-004)"; FAIL=1; fi

exit "$FAIL"
