// Upstream AWS error text can name the caller: an AccessDenied message reads
// "User: arn:aws:iam::<12-digit account>:role/... is not authorized ...". This API
// is public once deployed, so those identifiers must not reach a browser.
// Pure string function; no AWS calls.

const ARN = /arn:aws[a-z-]*:[^\s"'`,;)\]]+/gi;
const ACCESS_KEY_ID = /\b(?:AKIA|ASIA|AIDA|AROA)[0-9A-Z]{12,}\b/g;
const ACCOUNT_ID = /\b\d{12}\b/g;

/**
 * @param {unknown} text
 * @returns {string}
 */
export function redactAwsIdentifiers(text) {
  return String(text ?? "")
    .replace(ARN, "[redacted-arn]")
    .replace(ACCESS_KEY_ID, "[redacted-key-id]")
    .replace(ACCOUNT_ID, "[redacted-account]");
}
