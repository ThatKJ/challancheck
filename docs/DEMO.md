# Demo Video Script (under 3 minutes)

**Use MODE B.** Live Amazon Bedrock is unverified (`docs/CANONICAL_RUN.md` section 2), so the
recording must not say or imply that Bedrock analysed anything. Mode A is only a delta at the end
of this file, allowed after `docs/CANONICAL_RUN.md` section 3 is complete.

The demo has exactly two product cases and four beats:
**WOW** = Case A · **TRUST** = Case B · **AWS / ARCHITECTURE** = the boundary and the exact blocker · **LEARNING**.

## Before recording

- `npm install && npm install --prefix frontend`, then `npm run dev --prefix frontend` (use the port it prints).
- Stay on **Explore an example**. Do not attach a photo: the fixture observations are not derived from any
  image, and a car photo on screen would read as "it analysed this". (If you do attach one, say it is display-only.)
- Have two things ready to show: a terminal, and `docs/CANONICAL_RUN.md` section 2.
- Re-run `npm run check:bedrock-text` once beforehand. If it now **passes**, stop: this script is out of date;
  follow `docs/CANONICAL_RUN.md` section 3 and the Mode A delta.

## MODE B script (target 2:50)

**0:00–0:18 — User and problem** · *Screen: first screen, "A claim is only half the picture."*
> "An e-Challan cites a violation and attaches a photo as evidence. If the photo doesn't seem to show that
> violation, the driver has to work it out alone. ChallanCheck compares the cited claim with structured
> observations of the evidence. It is deliberately not a lawyer."

**0:18–0:38 — Honesty and the trust boundary** · *Screen: the "Fixture mode · Not live AWS" stamp, then the footer "Observations ≠ legal conclusions".*
> "One rule shapes everything: a model may only observe, and our code decides. In this demo the observations
> come from a labelled local fixture, not from Amazon Bedrock. Our account's Bedrock access is blocked, and
> I'll show exactly how at the end."

**0:38–1:18 — Case A: observable inconsistency (WOW)** · *Screen: choose "Demo: car cited for 'no helmet'"; the claim reads "Riding without helmet"; click Review evidence.*
> "The challan claims 'riding without helmet'. The structured observation says the vehicle is a car, at 95%
> confidence. Our rule (plain code) treats cars as not subject to a helmet requirement, so claim and evidence
> appear inconsistent, and it reports exactly that." *(Point to the Claimed / Observed / Result band, then to "Evidence consistency, not a legal verdict".)* "It does not say the challan is invalid or what you should do."

**1:18–1:45 — Case B: insufficient evidence (TRUST)** · *Screen: New review → "Blurry / occluded evidence photo" → Review evidence.*
> "Now an ambiguous case: poor image quality, severe occlusion, helmet uncertain at 30% confidence. The same rules
> refuse to overclaim. 'We won't guess.' Saying 'I can't tell' is a first-class result, not an error."

**1:45–2:20 — AWS and architecture** · *Screen: README "Trust boundary" diagram → terminal: `npm run check:bedrock-text` → `docs/CANONICAL_RUN.md` section 2.*
> "Amazon Bedrock is designed to be the observer only: it gets the image, never the challan text, and its reply must
> pass our schema. But live Bedrock is unverified. This is a real call from our account — 'Operation not allowed',
> in about half a second — and the applied quota for this model is zero, against an AWS default of six million.
> When that happens the app returns a coded error, never fixture data. The engine and schema are real and tested;
> the Bedrock integration is written but has not run successfully."

**2:20–2:42 — Learning** · *Screen: `docs/LEARNING.md`.*
> "Two lessons. Observe-only isn't enough: our first rule engine turned a 60%-confidence 'car' into a confident
> mismatch until an adversarial test caught it, so observations now carry their own doubt. And model access is
> architecture: we waited hours for a 'propagation delay' when the quota view showed a flat zero."

**2:42–2:50 — Close**
> "ChallanCheck makes the comparison explicit and reviewable, and says 'I can't tell' when it can't."

## Never say or show in Mode B

"Bedrock analysed / powers / extracted…", "real Bedrock observations", "upload your challan and we…", any latency or
accuracy figure, "deployed" or a URL, "grievance packet", or a fixture result described as live.

## Claim ledger — every spoken statement, classified

| # | Statement | Class | Where it is supported |
|---|---|---|---|
| 1 | An e-Challan cites a violation and attaches a photo; the driver judges alone | VERIFIED (premise, no statistic claimed) | README "The problem" |
| 2 | It compares the claim with *structured observations* of the evidence | VERIFIED | `backend/src/auditEvidence.js`, running app |
| 3 | It is not a lawyer | VERIFIED | "Evidence consistency, not a legal verdict" note in the UI |
| 4 | A model only observes, our code decides | VERIFIED | `ruleEngine.js` imports only the schema; adapter prompt |
| 5 | Observations here come from a labelled local fixture | VERIFIED | "Fixture mode · Not live AWS" stamp; result badge |
| 6 | Bedrock access is blocked | VERIFIED | `docs/CANONICAL_RUN.md` section 2 (executed) |
| 7 | Case A: car, 95%, mismatch | VERIFIED | `docs/CANONICAL_RUN.md` section 1; the UI |
| 8 | Our rule treats cars as not subject to a helmet requirement | VERIFIED | `HELMET_EXEMPT_VEHICLES` in `ruleEngine.js` |
| 9 | It doesn't call the challan invalid or advise what to do | VERIFIED | `reportPresentation.js` copy; trust note |
| 10 | Case B: poor quality, severe occlusion, helmet 30% | VERIFIED | `blurry_insufficient` in `fixtureAdapter.js` |
| 11 | "I can't tell" is a first-class result | VERIFIED | `INSUFFICIENT_EVIDENCE` state |
| 12 | Bedrock is designed as observer only: it gets the image, never the challan text, and its reply must pass our schema | VERIFIED as design (code, not a live run) | `backend/src/bedrockAdapter.js` (prompt and request body; `validateObservation`) |
| 13 | A real call from our account fails "Operation not allowed" in about half a second | VERIFIED if the terminal is shown live; otherwise from the record (445 and 472 ms) | `npm run check:bedrock-text`; section 2 |
| 14 | Applied quota zero vs AWS default six million | CONDITIONAL: re-run the `service-quotas` commands in section 2 before recording | `docs/CANONICAL_RUN.md` |
| 15 | When Bedrock refuses, the app returns a coded error, never fixture data | VERIFIED | `tests/unit/server.test.js`, `tests/unit/liveFailureContract.test.js`; section 2 |
| 16 | Engine and schema are real and tested | VERIFIED | `npm test` |
| 17 | First engine turned a 60% "car" into a confident mismatch | VERIFIED | `docs/TASK_BOARD.md` P0-04; case ADV-09 |
| 18 | We waited hours for "propagation"; the quota was zero | VERIFIED | `docs/AGENT_LOG.md` 2026-09-19 01:05; section 2 |
| — | Any Bedrock-analysed, latency, accuracy, deployed, or grievance-packet claim | REMOVED | not in the script |

## MODE A delta (only after `docs/CANONICAL_RUN.md` section 3 is complete)

Keep the timing and both cases. Change only these, using the recorded run's real values:

- **0:18–0:38.** Replace the fixture disclosure with: observations come from Amazon Bedrock ([model id], [region]),
  through the local backend (`npm run server`, then the UI with `VITE_API_BASE_URL`).
- **Case A.** Use the **Upload evidence** tab with a real photo; the result badge must read "Source: Amazon Bedrock".
- **AWS beat.** Show the server's `[audit] 200 model=… region=… bedrockMs=…` line and the canonical run; drop the
  blocker paragraph.
- **Case B.** Use a real blurry photo only if the live model actually returned `INSUFFICIENT_EVIDENCE` for it;
  otherwise keep the fixture case and label it a fixture.
- Re-classify every ledger row against the new evidence before recording.
