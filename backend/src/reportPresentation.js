// P1-05: user-facing framing for each rule-engine verdict. Kept separate from
// ruleEngine.js's `reason` (the technical explanation) so copy can change
// without touching decision logic, and vice versa. No AWS, no judgement about
// guilt — "actionable" only means "evidence supports disputing the challan",
// never "the challan is legally invalid" (see docs/AI_COORDINATION.md).

import { RESULTS } from "./ruleEngine.js";

const PRESENTATIONS = {
  [RESULTS.OBSERVABLE_INCONSISTENCY]: {
    title: "Evidence Mismatch Found",
    tone: "alert",
    guidance:
      "The photo appears inconsistent with the cited violation. If you choose to dispute the challan, you can attach this report — review the details below first.",
    actionable: true,
  },
  [RESULTS.CONSISTENT_WITH_EVIDENCE]: {
    title: "No Mismatch Found",
    tone: "neutral",
    guidance:
      "The evidence photo appears consistent with the cited violation. No mismatch was found.",
    actionable: false,
  },
  [RESULTS.INSUFFICIENT_EVIDENCE]: {
    title: "Insufficient Evidence",
    tone: "warning",
    guidance:
      "We could not confidently determine this from the photo (e.g. it may be blurry, cropped, or ambiguous). We won't guess — consider requesting a clearer image or manual review.",
    actionable: false,
  },
  [RESULTS.UNSUPPORTED_CHECK]: {
    title: "Cannot Verify From a Single Photo",
    tone: "info",
    guidance:
      "This type of violation cannot be confirmed or refuted from one photo alone (e.g. speed, signal timing, or registry lookups require more than a still image).",
    actionable: false,
  },
};

/**
 * @param {string} status - one of ruleEngine.js RESULTS
 * @returns {{title: string, tone: string, guidance: string, actionable: boolean}}
 */
export function presentResult(status) {
  return (
    PRESENTATIONS[status] ?? {
      title: "Unknown Result",
      tone: "warning",
      guidance: "This result type is not recognized. Treat as inconclusive.",
      actionable: false,
    }
  );
}
