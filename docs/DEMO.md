# Demo Video Script (under 3 minutes)

**The live upload path uses Amazon Rekognition** (`docs/CANONICAL_RUN.md` section 2c). Amazon Bedrock, the original
plan, never worked on this account (section 2), so the recording must not say or imply that Bedrock analysed anything,
and must not say Rekognition decided anything: it observes, our code decides. "Explore an example" is a labelled fixture
demo. The Bedrock delta at the end of this file is only for the case where `docs/CANONICAL_RUN.md` section 3 is completed.

The demo has exactly two product cases and four beats:
**WOW** = Case A · **TRUST** = Case B · **AWS / ARCHITECTURE** = the boundary and the exact blocker · **LEARNING**.

## Before recording

- `npm install && npm install --prefix frontend`, then `npm run dev --prefix frontend` (use the port it prints).
- Stay on **Explore an example**. Do not attach a photo: the fixture observations are not derived from any
  image, and a car photo on screen would read as "it analysed this". (If you do attach one, say it is display-only.)
- Have three things ready to show: a terminal, `docs/CANONICAL_RUN.md` section 2c, and the public URL
  (https://5941vqrwm1.execute-api.ap-south-1.amazonaws.com) in a second tab for the AWS beat: on **Upload evidence**,
  type "Riding without helmet", attach `demo_image.png` (a local file, not committed to the repository) and press Review evidence. The Lambda sends the photo to Amazon
  Rekognition and the report is badged "Live AWS observation · Amazon Rekognition". **The expected result for that photo is
  Insufficient Evidence**, not a mismatch: Rekognition labels both a car (99.7%) and a motorcycle (94.6%, the auto-rickshaw at
  the left edge), so the vehicle is reported as unknown. Use a synthetic or your own photo, never someone else's challan,
  because the API is public.
- Do not run `npm run check:bedrock-text`: the Bedrock investigation is closed and the live path no longer uses Bedrock.

## Script (target 2:57; trim a sentence if you speak slowly, the limit is 3:00)

**0:00–0:18 — User and problem** · *Screen: first screen, "A claim is only half the picture."*
> "An e-Challan cites a violation and attaches a photo as evidence. If the photo doesn't seem to show that
> violation, the driver has to work it out alone. ChallanCheck compares the cited claim with structured
> observations of the evidence. It is deliberately not a lawyer."

**0:18–0:38 — Honesty and the trust boundary** · *Screen: the "Fixture mode · Not live AWS" stamp, then the footer "Observations ≠ legal conclusions".*
> "One rule shapes everything: the observer may only observe, and our code decides. In the first two cases the
> observations come from a labelled local fixture. In the live upload at the end they come from Amazon Rekognition.
> Amazon Bedrock was our original plan, and our new account was blocked from it."

**0:38–1:18 — Case A: observable inconsistency (WOW)** · *Screen: choose "Demo: car cited for 'no helmet'"; the claim reads "Riding without helmet"; click Review evidence.*
> "The challan claims 'riding without helmet'. The structured observation says the vehicle is a car, at 95%
> confidence. Our rule (plain code) treats cars as not subject to a helmet requirement, so claim and evidence
> appear inconsistent, and it reports exactly that." *(Point to the Claimed / Observed / Result band, then to "Evidence consistency, not a legal verdict".)* "It does not say the challan is invalid or what you should do."

**1:18–1:45 — Case B: insufficient evidence (TRUST)** · *Screen: New review → "Blurry / occluded evidence photo" → Review evidence.*
> "Now an ambiguous case: poor image quality, severe occlusion, helmet uncertain at 30% confidence. The same rules
> refuse to overclaim. 'We won't guess.' Saying 'I can't tell' is a first-class result, not an error."

**1:45–2:27 — AWS and architecture** · *Screen: README "Trust boundary" diagram → the public URL: Upload evidence → Review evidence with `demo_image.png` → the report: the "Live AWS observation · Amazon Rekognition" badge, then "What remains uncertain" → `docs/CANONICAL_RUN.md` section 2c.*
> "Amazon Rekognition is the observer only: it gets the image, never the challan text, and our code turns its labels into
> structured facts and decides. This is the deployed app on AWS, in Mumbai. I upload a real photo, the Lambda calls
> Rekognition, and the report says where the observation came from. Rekognition saw a car and, at the edge, something it
> called a motorcycle, so our code says the vehicle is unknown and refuses to guess: Insufficient Evidence. It also can't
> tell whether anyone wears a helmet, so we never claim it. Our original plan was Amazon Bedrock; AWS Support told us
> our new account was restricted, so we shipped this path."

**2:27–2:49 — Learning** · *Screen: `docs/LEARNING.md`.*
> "Two lessons. Observe-only isn't enough: our first rule engine turned a 60%-confidence 'car' into a confident
> mismatch until an adversarial test caught it, so observations now carry their own doubt. And model access is
> architecture: we waited hours for a 'propagation delay' when the quota view showed a flat zero."

**2:49–2:57 — Close**
> "ChallanCheck makes the comparison explicit and reviewable, and says 'I can't tell' when it can't."

## Never say or show

"Bedrock analysed / powers / extracted…", "real Bedrock observations", "Rekognition decided / judged / found a violation",
"it detects helmets", "upload your challan and we…", any accuracy figure or latency benchmark, "grievance packet", or a
fixture result described as live. The live report is label detection plus our rules, on one photo.

## Claim ledger — every spoken statement, classified

| # | Statement | Class | Where it is supported |
|---|---|---|---|
| 1 | An e-Challan cites a violation and attaches a photo; the driver judges alone | VERIFIED (premise, no statistic claimed) | README "The problem" |
| 2 | It compares the claim with *structured observations* of the evidence | VERIFIED | `backend/src/auditEvidence.js`, running app |
| 3 | It is not a lawyer | VERIFIED | "Evidence consistency, not a legal verdict" note in the UI |
| 4 | A model only observes, our code decides | VERIFIED | `ruleEngine.js` imports only the schema; adapter prompt |
| 5 | Observations here come from a labelled local fixture | VERIFIED | "Fixture mode · Not live AWS" stamp; result badge |
| 6 | Amazon Bedrock, our original plan, was blocked on our new account | VERIFIED | `docs/CANONICAL_RUN.md` section 2 (executed 2026-09-19); do not re-run it live |
| 7 | Case A: car, 95%, mismatch | VERIFIED | `docs/CANONICAL_RUN.md` section 1; the UI |
| 8 | Our rule treats cars as not subject to a helmet requirement | VERIFIED | `HELMET_EXEMPT_VEHICLES` in `ruleEngine.js` |
| 9 | It doesn't call the challan invalid or advise what to do | VERIFIED | `reportPresentation.js` copy; trust note |
| 10 | Case B: poor quality, severe occlusion, helmet 30% | VERIFIED | `blurry_insufficient` in `fixtureAdapter.js` |
| 11 | "I can't tell" is a first-class result | VERIFIED | `INSUFFICIENT_EVIDENCE` state |
| 12 | Rekognition is the observer only: it gets the image, never the challan text, and our code checks the facts against a schema | VERIFIED | `backend/src/rekognitionAdapter.js` (request; `validateObservation`), `tests/unit/rekognitionAdapter.test.js` |
| 13 | A Bedrock call from our account failed "Operation not allowed" in about half a second | VERIFIED from the record only (445, 472 and 480 ms); not shown live | `docs/CANONICAL_RUN.md` sections 2 and 2b |
| 14 | Applied quota zero vs AWS default six million | REMOVED from the script (not needed for this story); cite the record only if asked | `docs/CANONICAL_RUN.md` section 2 |
| 15 | When Rekognition fails, the app returns a coded error, never fixture data | VERIFIED | `tests/unit/rekognitionAdapter.test.js`, `tests/unit/lambda.test.js`, `tests/unit/liveFailureContract.test.js` |
| 16 | Engine and schema are real and tested | VERIFIED | `npm test` |
| 17 | First engine turned a 60% "car" into a confident mismatch | VERIFIED | `docs/TASK_BOARD.md` P0-04; case ADV-09 |
| 18 | We waited hours for "propagation"; the quota was zero | VERIFIED | `docs/AGENT_LOG.md` 2026-09-19 01:05; section 2 |
| 19 | Our app and API are deployed on AWS (API Gateway + Lambda, Mumbai) | VERIFIED | `docs/CANONICAL_RUN.md` section 2c (curl and real browser, 2026-09-20); the public URL |
| 20 | On the deployed app, uploading a photo makes the Lambda call Amazon Rekognition and the report shows that observation, badged as live AWS | VERIFIED if shown live; otherwise from the record | section 2c (browser run, Lambda log, CloudTrail) |
| 21 | For this photo Rekognition labelled a car and, at the edge, a motorcycle, so our code reports the vehicle as unknown and the result is Insufficient Evidence | VERIFIED | section 2c steps 3 and 4 (the response and the report) |
| 22 | Rekognition can't tell whether anyone wears a helmet, so we never claim it | VERIFIED as design | the adapter never emits `not_visible`; `tests/unit/rekognitionAdapter.test.js` |
| 23 | Our original plan was Amazon Bedrock | VERIFIED | `docs/DECISION.md`; `backend/src/bedrockAdapter.js` |
| 24 | AWS Support told us our new account was restricted | CONDITIONAL: the team's own record of the Support reply, not in the repository; say "AWS Support told us" | team record |
| — | Any Bedrock-analysed, accuracy, or grievance-packet claim, or that Rekognition detects helmets or judges violations | REMOVED | not in the script |

## BEDROCK delta (only after `docs/CANONICAL_RUN.md` section 3 is complete)

Keep the timing and both cases. Change only these, using the recorded run's real values:

- **0:18–0:38.** Replace the fixture disclosure with: observations come from Amazon Bedrock ([model id], [region]),
  through the local backend (`npm run server`, then the UI with `VITE_API_BASE_URL`); that requires re-adding the Bedrock
  observer to the backend, which the Rekognition migration replaced.
- **Case A.** Use the **Upload evidence** tab with a real photo; the result badge must name the Bedrock source it then shows.
- **AWS beat.** Show the server's `[audit] 200 source=… region=… observerMs=…` line and the canonical run; drop the
  blocker paragraph.
- **Case B.** Use a real blurry photo only if the live model actually returned `INSUFFICIENT_EVIDENCE` for it;
  otherwise keep the fixture case and label it a fixture.
- Re-classify every ledger row against the new evidence before recording.
