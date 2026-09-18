// Orchestration layer for P0-07 (core E2E workflow), built ahead of Bedrock
// access so only the observation source needs swapping in once P0-01/P0-02
// unblock — this file makes no AWS calls and is fully testable today.
//
// NOT itself the E2E workflow: the real pipeline is
//   upload -> extract violation text -> extract evidence image
//   -> Bedrock observation -> auditEvidence() [this file] -> report
// Bedrock's observation is still a required external input here, deliberately —
// see docs/AI_COORDINATION.md "Product Truth": this module composes an
// already-produced observation with the violation claim; it does not decide
// what the image contains.
//
// Multi-claim handling (docs/DECISION.md "Scope Limitations", RED-008):
// ChallanCheck evaluates ONE claim at a time. If the violation text cites
// more than one offence, this function refuses to guess — it returns
// requiresSelection:true with every candidate claim, and the caller (UI)
// must pass one back as `selectedClaim` on a follow-up call.

import { classifyViolation } from "./violationClassifier.js";
import { evaluateConsistency } from "./ruleEngine.js";
import { presentResult } from "./reportPresentation.js";

/**
 * @param {string} violationText - raw violation label from the e-Challan
 * @returns {{ sourceText: string, claims: string[], matched: boolean }}
 */
export function classifyForSelection(violationText) {
  const { sourceText, claims, matched } = classifyViolation(violationText);
  return { sourceText, claims, matched };
}

/**
 * @param {object} input
 * @param {string} input.violationText - raw violation label from the e-Challan
 * @param {string} [input.selectedClaim] - required only when the text cites multiple claims
 * @param {object} input.observation - raw Bedrock observation (see observationSchema.js)
 * @returns {object} Evidence Consistency Report, or { requiresSelection: true, candidateClaims } if ambiguous
 */
export function auditEvidence({ violationText, selectedClaim, observation }) {
  const { sourceText, claim: fallbackClaim, claims, matched } = classifyViolation(violationText);
  const candidates = claims.length > 0 ? claims : [fallbackClaim];

  let claim;
  if (candidates.length > 1) {
    if (!selectedClaim || !candidates.includes(selectedClaim)) {
      return {
        requiresSelection: true,
        violation: { sourceText, candidateClaims: candidates, recognized: matched },
        generatedAt: new Date().toISOString(),
      };
    }
    claim = selectedClaim;
  } else {
    claim = candidates[0];
  }

  const { status, reason } = evaluateConsistency(claim, observation);

  return {
    requiresSelection: false,
    violation: {
      sourceText,
      canonicalClaim: claim,
      candidateClaims: candidates,
      recognized: matched,
    },
    observation,
    result: { status, reason },
    presentation: presentResult(status),
    generatedAt: new Date().toISOString(),
  };
}
