# What We Learned

Five things that actually happened while building ChallanCheck. Each one points at
evidence you can open in this repository.

**Provenance note.** An earlier draft of this file (and of `docs/SUBMISSION.md`) said
the model "would guess guilt or innocence" when asked whether a challan was correct.
We never observed that: Amazon Bedrock has never returned a response for this project
(see `docs/CANONICAL_RUN.md`). The observe-only boundary is a design decision we made
on day one, not a lesson from watching a model fail, and that sentence was removed.

### Learning 1 — Let the model observe, and let the evaluator refuse

INITIAL ASSUMPTION:
If the model only reports structured facts (`vehicle_type`, `helmet`, `image_quality`…)
and never sees the challan text, plain rules can safely turn those facts into a result.
That boundary was fixed in our first ChallanCheck commit (`docs/DECISION.md`, "Safety / Truth Rule").

WHAT WENT WRONG / WHAT WE DISCOVERED:
The boundary alone was not enough. The red-team's pre-registered case ADV-09 is a frame
with a car and a motorcycle where the observer says "car" at 0.6 confidence. Without a
confidence gate that frame resolves to "the evidence shows a car, which is not subject to a
helmet requirement", a confident inconsistency built on a 60% guess. Our first rule engine
lacked the gate and the matrix caught it (`docs/TASK_BOARD.md` P0-04).

WHAT WE LEARNED:
Separating observation from evaluation moves the risk, it doesn't remove it. The observation
has to carry its own doubt, and the evaluator has to be allowed to say "I can't tell".

WHAT WE CHANGED:
Every observed field carries a confidence; the schema adds `image_quality`, `occlusion` and
`uncertainties[]`; the engine returns `INSUFFICIENT_EVIDENCE` below 0.7 confidence, on poor
quality, or on severe occlusion. The result "consistent" is worded "No Mismatch Found"
because the engine finds no contradiction; it does not confirm a match (QA RED-010).
`tests/adversarial/rule_expectations.json` (14 cases) locks it in.

### Learning 2 — A false positive is worse than a miss, even in deterministic code

INITIAL ASSUMPTION:
"Deterministic" means safe: text matching on the challan's violation label can't hallucinate.

WHAT WENT WRONG / WHAT WE DISCOVERED:
The red-team fed it real-world phrasing. "No helmet violation detected" was classified as a
`WITHOUT_HELMET` claim, and "Registration number KA01AB1234" as a plate mismatch (QA RED-007).
We then added OCR-noise tolerance (edit-distance-1 fuzzy matching), and that fix created two
new fabricated claims: "All signals working normally" became a red-light violation, and
"speed limits observed" became speeding (QA RED-009, cases CT-12/CT-13).

WHAT WE LEARNED:
A fabricated claim corrupts everything downstream, so the classifier may only suppress or
match; it must never invent. Every fix needs an adversarial test, because the fix itself
can open a new hole.

WHAT WE CHANGED:
Suppression guards run before matching, and each offence now needs an explicit cue next to
its keyword. 13 classifier traps (`tests/adversarial/classifier_traps.json`) run in `npm test`,
and unrecognised text degrades to `UNSUPPORTED_CHECK` instead of being guessed.

### Learning 3 — Live and fixture adapters must never silently stand in for each other

INITIAL ASSUMPTION:
While Bedrock access was pending, a fixture adapter could keep the whole flow demonstrable,
and swapping it for the live one later would be a one-line change.

WHAT WENT WRONG / WHAT WE DISCOVERED:
"Falls back to the fixture" is exactly how a demo ends up presenting canned data as AWS output.
During this final audit we also found a related mislabel in our own error handling: the frontend
relabelled every failed backend answer as `AWS_NOT_CONFIGURED`, so a configured account whose
Bedrock call was refused would have been shown as "not configured" (commit `0450423`).

WHAT WE LEARNED:
Provenance has to be a first-class field, and failures have to keep their real cause.

WHAT WE CHANGED:
Fixture results carry `meta.source = "fixture"` and the UI badge says "Demo fixture — not live
AWS evidence". `backend/server.js` and `backend/src/bedrockAdapter.js` never import the fixture
adapter (static-guard tests), and a failed Bedrock call returns a coded error with no
`observation` (502 `AWS_ERROR`). `tests/unit/liveFailureContract.test.js` pins both sides.

### Learning 4 — Region, model and account access are part of the AWS architecture

INITIAL ASSUMPTION:
Pick a Claude model ID, call `InvokeModel`, and it works. When the call was refused, we treated it
as a verification / propagation delay and polled for hours (`docs/AGENT_LOG.md`, 2026-09-19 01:05).

WHAT WENT WRONG / WHAT WE DISCOVERED:
Two separate things. (1) In `ap-south-1` the Claude models are inference-profile-only, so a bare
model ID such as `anthropic.claude-sonnet-5` is not invokable on demand. (2) Every call then failed
in about half a second with `ValidationException: Operation not allowed`, for every model we tried.
On 2026-09-19 the Service Quotas view showed the applied value for "Global cross-region model
inference tokens per minute for Anthropic Claude Sonnet 5" as `0`, against an AWS default of
`6,000,000` (`docs/CANONICAL_RUN.md`).

WHAT WE LEARNED:
Model availability, inference profiles, regional routing and account quotas belong in the design
review, not in a setup footnote. Compare applied quotas with defaults on day one, before waiting.
A quota of 0 alongside an instant, identical refusal points at a static account limit rather than
a delay; that is our inference. We can show the correlation but not AWS's internal mechanism,
and we have not been able to lift it ourselves.

WHAT WE CHANGED:
`DEFAULT_MODEL_ID` is a system-defined inference profile (a test guards against a bare ID), the
region and model are environment-overridable, and `npm run check:bedrock-text` is a one-call gate
that tells "account/quota problem" apart from "image handling problem". The project stays in
Mode B until a real multimodal call succeeds.

### Learning 5 — Contracts must be tested across the boundary, not on each side

INITIAL ASSUMPTION:
If the frontend and the backend each pass their own tests, the upload flow works.

WHAT WENT WRONG / WHAT WE DISCOVERED:
The UI accepted 10 MB while the server capped images at 5 MB (8 MB for the JSON body), so a
file could pass the client and then fail with HTTP 413 (QA RED-016). Related: the browser derives
`File.type` from the filename, so a PNG saved as `.jpg` would reach Bedrock with the wrong media
type. Neither side's own tests could see either problem.

WHAT WE LEARNED:
A limit or a code is a contract; the only test that counts reads both ends.

WHAT WE CHANGED:
The UI limit and copy are 5 MB (`0f5f639`), and the server trusts the image bytes over the declared
type (`backend/src/imageType.js`). `tests/unit/uploadContract.test.js` now pins the frontend limit
and copy to the backend's exported constants, checks that base64 inflation fits the body cap, and checks
the client's accepted types are a subset of the server's.

FOLLOW-UP, on the deployed path (2026-09-19) — the contract was still one layer short:
`uploadContract.test.js` passed, yet the platform between the two ends has its own limit. API Gateway
and Lambda accept at most 6 MB (6,291,556 bytes) for a synchronous request, and base64 inflates an image by
4/3. We measured it against the live gateway instead of trusting the arithmetic: a 4.63 MB image, which the
5 MB UI accepted, became a 6,466,890-byte request, and the gateway answered HTTP 413
`{"message":"Request Entity Too Large"}`. That is the platform's own shape, not our
`{"error":{"code","message"}}`, and it arrived before any of our code ran. The limit is now 3 MB per image
(a ~4 MB request) with a 5 MB body cap in both the UI and the server, still pinned by the same test. The
lesson widened: the contract includes the platform in the middle, and only the deployed platform can show it.

### Learning 6 — Reconstruct AWS state from AWS before acting on it

INITIAL ASSUMPTION:
Nothing was deployed. The docs said so, and the one deploy command we had run was reported as rejected.

WHAT WENT WRONG / WHAT WE DISCOVERED:
An IAM listing for an unrelated identity check showed a role named `challancheck-api-FunctionRole-…`.
A CloudFormation stack `challancheck-api` had been created on 2026-09-19 at 12:31 UTC from an earlier template
on an unmerged branch (API only, a Nova model, CORS `*`), and its public API was answering. We did not determine who
ran it. The public `main` did not contain the code it was running, so the deployment could not be reproduced from
the repository.

WHAT WE LEARNED:
Read AWS's own state (stacks, roles, functions) before deciding what to build, and never let "the command was
rejected" stand in for "nothing happened". A deployment that the public repository cannot recreate is not one to submit.

WHAT WE CHANGED:
We probed the old stack read-only, then built the deployment path from `main` (a thin Lambda around the existing
server logic plus the static app) and previewed the update as a CloudFormation change set: 5 modify, 1 add,
0 replace, 0 remove. We executed exactly that change set, so the URL did not change, and recorded the history in
`docs/CANONICAL_RUN.md` section 2b. `infra/deploy.sh` gained `PREVIEW=1` for this.

### Learning 7 — One origin removed the hosting question

INITIAL ASSUMPTION:
A public URL for the web app means a second hosting service (S3 with CloudFront, or Amplify) and CORS between it
and the API.

WHAT WE DISCOVERED:
The built app is five small files that load nothing from other origins. Whether CloudFront or Amplify could be
created on this restricted account was unknown, and could not be found out without trying to create them.

WHAT WE LEARNED:
When the assets are that small, serving them from the function that already exists is the smaller architecture:
fewer services, no CORS, and no dependency on an approval we could not check. It has a real cost (no CDN, and each
file request is a Lambda invocation), which is acceptable at this scale and reversible.

WHAT WE CHANGED:
One Lambda serves the static app and the API, with the API only under `/api/*`, which is also the only route
that can reach Bedrock and so the only one throttled tightly (3 req/s, burst 6). In a real browser against the
public URL the app loaded under a strict Content-Security-Policy with 0 violations and 0 JS errors.
