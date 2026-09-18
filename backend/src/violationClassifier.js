// P1-02: maps the free-text violation label printed on an e-Challan to one
// of the canonical claim strings the rule engine understands. This is pure
// text normalization — no AWS call, no visual observation, no judgement
// about guilt. Unrecognized text is preserved verbatim as the claim so it
// still flows safely into evaluateConsistency() and comes out UNSUPPORTED_CHECK
// (see backend/src/ruleEngine.js default case) instead of being dropped.
//
// SAFETY PRINCIPLE (see docs/QA_REPORT.md RED-007): a false positive here is
// worse than a miss — it fabricates a claim that was never made. Guards run
// before pattern matching and can only suppress a match, never invent one.
//
// OCR ROBUSTNESS (see docs/QA_REPORT.md RED-009): real challan text usually
// comes from OCR, which drops/truncates letters and mangles hyphens. Before
// matching, hyphens become spaces and any word within edit-distance 1 of a
// known keyword is corrected to that keyword. This only ever normalizes
// spelling of a keyword that's already present in some form — it cannot make
// a negation cue appear out of nowhere, so it can't resurrect a suppressed
// claim (e.g. "helmett" alone still has no negation cue and stays unmatched).

const OCR_KEYWORDS = ["helmet", "headgear", "without", "speed", "limit", "signal", "light"];

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[rows - 1][cols - 1];
}

function ocrNormalize(text) {
  return text.replace(/-/g, " ").replace(/[a-zA-Z]+/g, (word) => {
    if (word.length < 3) return word;
    const lower = word.toLowerCase();
    const corrected = OCR_KEYWORDS.find(
      (kw) => lower !== kw && Math.abs(lower.length - kw.length) <= 1 && levenshteinDistance(lower, kw) === 1
    );
    return corrected ?? word;
  });
}

// Suppress a match outright: these signal "this text is not citing an
// offence", even if an offence keyword like "helmet" appears in it.
const SUPPRESSION_GUARDS = [
  /\bcompliant\b/i, // e.g. "Rider wearing helmet - compliant"
  /\bno\b[\s\S]*\b(violation|offence|offense)\b[\s\S]*\b(detected|found|observed|noted)\b/i, // e.g. "No helmet violation detected"
  /\bn\/a\b/i, // e.g. "Helmet: N/A (car)"
  /\bregistration\s*(number|no\.?)\b/i, // e.g. "Registration number KA01AB1234" (field echo, not an offence)
];

const PATTERNS = [
  {
    claim: "WITHOUT_HELMET",
    // Requires an explicit negation cue next to helmet/headgear — bare
    // mentions of "helmet" (e.g. a compliance statement) must not match.
    test: (t) =>
      /\b(without|no|not\s+wearing|missing|absent)\b[\s\S]{0,25}(helmet|protective\s*headgear)/i.test(t) ||
      /(helmet|protective\s*headgear)[\s\S]{0,25}\b(not\s*worn|missing|absent|not\s*visible)\b/i.test(t),
  },
  {
    claim: "SPEEDING",
    test: (t) => /over[-\s]?speed|speed\s*limit|exceeding.*speed/i.test(t),
  },
  {
    claim: "RED_LIGHT_JUMP",
    test: (t) => /signal|red\s*light/i.test(t),
  },
  {
    claim: "PLATE_MISMATCH",
    // Requires BOTH a plate/registration reference AND an explicit
    // mismatch/invalid signal — a bare plate number is a field, not a claim.
    test: (t) =>
      /\b(number\s*plate|license\s*plate|registration)\b/i.test(t) &&
      /\b(mismatch|invalid|fake|forged|doesn'?t\s*match|does\s*not\s*match)\b/i.test(t),
  },
  {
    claim: "NO_PUC_CERTIFICATE",
    test: (t) => /\bpuc\b|pollution\s*(under\s*)?control/i.test(t),
  },
];

function slugify(text) {
  return (
    text
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "UNKNOWN_VIOLATION"
  );
}

/**
 * @param {string} violationText - raw text extracted from the e-Challan (e.g. OCR output)
 * @returns {{ claim: string, claims: string[], matched: boolean, sourceText: string }}
 *
 * `claims` lists EVERY recognized offence found in the text, in pattern order
 * (see docs/DECISION.md "Scope Limitations" — RED-008 product decision:
 * multiple claims are surfaced for explicit user selection, never silently
 * collapsed to one). `claim` is kept for backward compatibility and equals
 * `claims[0]` when there's a single match, or the slugified fallback when
 * there's none — callers that must handle ambiguity should read `claims`.
 */
export function classifyViolation(violationText) {
  const sourceText = typeof violationText === "string" ? violationText.trim() : "";

  if (!sourceText) {
    return { claim: "UNKNOWN_VIOLATION", claims: [], matched: false, sourceText };
  }

  const matchText = ocrNormalize(sourceText);

  if (SUPPRESSION_GUARDS.some((guard) => guard.test(matchText))) {
    return { claim: slugify(sourceText), claims: [], matched: false, sourceText };
  }

  const claims = PATTERNS.filter(({ test }) => test(matchText)).map(({ claim }) => claim);

  if (claims.length === 0) {
    return { claim: slugify(sourceText), claims: [], matched: false, sourceText };
  }

  return { claim: claims[0], claims, matched: true, sourceText };
}
