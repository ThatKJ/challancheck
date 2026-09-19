#!/bin/sh
# REDTEAM-owned claim audit. Lists judge-facing strong claims for manual review.
# Usage: sh scripts/verification/claims_audit.sh
# Rule: every listed claim must trace to implementation or CANONICAL_RUN.md metrics.
set -eu
cd "$(dirname "$0")/../.."
echo "--- strong-claim words in docs/UI ---"
git grep -nE 'accurate|detects|proves|invalid|wrong|legal|fraud|guaranteed|real-time|automatic|reliable|frequently|Built' -- README.md docs frontend/src ':!docs/QA_REPORT.md' 2>/dev/null || echo "(no hits)"
echo "--- present-tense AWS capability claims (must be re-tensed until P0-02 lands) ---"
# Case-insensitive: README:29 "performs multimodal visual observation" slipped
# past the old case-sensitive 'Performs multimodal' (see QA RED-017).
git grep -niE 'Performs multimodal|extracts structured facts|acts as the visual observer' -- README.md docs 2>/dev/null || echo "(no hits)"
echo "--- review each hit against QA RED-003 ---"
