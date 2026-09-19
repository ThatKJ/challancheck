import { useEffect, useRef, useState } from "react";
import {
  FIXTURE_SCENARIOS,
  observeEvidenceViaFixture,
  observeEvidenceViaLiveBackend,
  classifyForSelection,
  auditEvidence,
  fileToBase64,
} from "./lib/audit.js";
import "./App.css";
import {
  Icon,
  TrustNote,
  ErrorBlock,
  EvidenceViewer,
} from "./components/ReviewPrimitives.jsx";

const humanize = (value) =>
  String(value ?? "Not available")
    .replaceAll("_", " ")
    .toLowerCase();
const claimName = (value) =>
  ({
    WITHOUT_HELMET: "Riding without helmet",
    SPEEDING: "Over speeding",
    RED_LIGHT_JUMP: "Red-light violation",
  })[value] || humanize(value);
const stateStyle = {
  OBSERVABLE_INCONSISTENCY: ["mismatch", "contrast"],
  CONSISTENT_WITH_EVIDENCE: ["consistent", "check"],
  INSUFFICIENT_EVIDENCE: ["insufficient", "eye"],
  UNSUPPORTED_CHECK: ["unsupported", "limit"],
};

function UploadScreen({ onSubmit, loading, error, onDismissError }) {
  const [mode, setMode] = useState("fixture");
  const [fixtureId, setFixtureId] = useState(FIXTURE_SCENARIOS[0].id);
  const [violationText, setViolationText] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const fileSequence = useRef(0);
  async function acceptFile(next) {
    if (!next) return;
    const sequence = ++fileSequence.current;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setFileError(
        "Choose a JPG, PNG, or WebP image. PDF extraction is not available in this build.",
      );
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setFileError("This image exceeds 10 MB. Choose a smaller image.");
      return;
    }
    if (!next.size) {
      setFileError("This file is empty. Choose an evidence image.");
      return;
    }
    const url = URL.createObjectURL(next);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (sequence !== fileSequence.current) return;
      setFile(next);
      setFileError("");
    } catch {
      if (sequence === fileSequence.current) {
        setFileError(
          "This image could not be read. Choose a valid, uncorrupted photo. Any previous image is preserved.",
        );
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return (
    <section
      className="upload-layout screen-enter"
      aria-label="Start an evidence review"
    >
      <div className="intro">
        <span className="eyebrow">A CLOSER LOOK AT THE EVIDENCE</span>
        <h1>
          A claim is only
          <br />
          half the picture.
        </h1>
        <p className="lede">
          Compare the violation on your challan with what its photographic
          evidence actually shows.
        </p>
        <ol className="method-list">
          <li>
            <span>01</span>
            <div>
              <strong>Start with the claim</strong>
              <p>One cited violation. One focused review.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Look at the evidence</strong>
              <p>Structured observations, with uncertainty intact.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>See what holds up</strong>
              <p>Deterministic rules evaluate consistency.</p>
            </div>
          </li>
        </ol>
        <div className="aws-note">
          <span className="aws-word">
            aws
            <span />
          </span>
          <p>
            Designed for Amazon Bedrock
            <span>Visual observation, separate from rule evaluation.</span>
          </p>
        </div>
      </div>
      <div className="intake-panel">
        <div className="panel-heading">
          <span className="eyebrow">NEW EVIDENCE REVIEW</span>
          <span className="small-index">01 / 03</span>
        </div>
        <h2>Begin with the evidence.</h2>
        <p className="muted">Use your photo, or explore a labeled example.</p>
        <div className="mode-tabs" role="group" aria-label="Evidence source">
          <button
            aria-pressed={mode === "fixture"}
            onClick={() => setMode("fixture")}
          >
            Explore an example
          </button>
          <button
            aria-pressed={mode === "live"}
            onClick={() => setMode("live")}
          >
            Upload evidence
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(
              mode === "fixture"
                ? { mode, fixtureId, file }
                : { mode, violationText, file },
            );
          }}
        >
          <fieldset disabled={loading}>
            {mode === "fixture" ? (
              <div className="source-fields" key="fixture">
                <div className="fixture-stamp">
                  <span className="status-dot" />
                  Fixture mode <span>Not live AWS</span>
                </div>
                <label htmlFor="fixture-select">Choose a review scenario</label>
                <select
                  id="fixture-select"
                  value={fixtureId}
                  onChange={(e) => setFixtureId(e.target.value)}
                >
                  {FIXTURE_SCENARIOS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="fixture-preview">
                  <span className="eyebrow">CLAIM AS WRITTEN</span>
                  <blockquote>
                    “
                    {
                      FIXTURE_SCENARIOS.find((s) => s.id === fixtureId)
                        .violationText
                    }
                    ”
                  </blockquote>
                  <p>
                    Canned observations. Real deterministic rules.
                    <br />
                    No live model call is used. An optional source image is for
                    display only; fixture observations are not derived from it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="source-fields" key="live">
                <label htmlFor="violation-text">
                  Claim as written on the challan
                </label>
                <textarea
                  id="violation-text"
                  required
                  maxLength={4000}
                  placeholder="e.g. Riding without helmet"
                  value={violationText}
                  onChange={(e) => setViolationText(e.target.value)}
                />
                <p className="field-hint">
                  Enter the claim manually. Text extraction is not available.
                </p>
                {violationText.trim() &&
                  !classifyForSelection(violationText).matched && (
                    <p className="unrecognized-note" role="status">
                      No recognized claim found. Check the violation wording.
                      Unrecognized claims have no supported consistency rule.
                    </p>
                  )}
              </div>
            )}
            <div className="source-fields">
              {mode === "fixture" && (
                <p className="field-hint">
                  Optional source image: user-provided. Observations: fixture /
                  development mode, not an analysis of this photo.
                </p>
              )}
              <input
                className="visually-hidden"
                tabIndex={-1}
                ref={input}
                id="evidence-file"
                aria-label="Evidence photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  acceptFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                onClick={() => input.current.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  acceptFile(e.dataTransfer.files?.[0]);
                }}
              >
                <Icon name={file ? "check" : "upload"} size={26} />
                <strong>
                  {file ? file.name : "Drop your evidence photo here"}
                </strong>
                <span>
                  {file
                    ? `${(file.size / 1024).toFixed(0)} KB · Click to replace`
                    : "or click to choose a file"}
                </span>
                <small>JPG, PNG, WebP · up to 10 MB</small>
              </button>
              {fileError && (
                <p className="field-error" role="alert">
                  {fileError}
                </p>
              )}
              {file && <EvidenceViewer file={file} compact />}
              <p className="field-hint">
                {mode === "fixture"
                  ? "Demo fixture — not live AWS evidence. Your source image stays attached throughout this review."
                  : "Live observation requires a configured backend. AWS availability is not confirmed."}
              </p>
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={
                loading || (mode === "live" && (!file || !violationText.trim()))
              }
            >
              Review evidence <Icon />
            </button>
          </fieldset>
        </form>
        <ErrorBlock error={error} onDismiss={onDismissError} />
        <TrustNote />
      </div>
    </section>
  );
}

function ClaimScreen({ claims, text, onSelect, onBack }) {
  const [choice, setChoice] = useState(null);
  return (
    <section className="selection-screen screen-enter">
      <span className="eyebrow">02 / CLAIM SELECTION</span>
      <h1>
        One claim.
        <br />A focused answer.
      </h1>
      <p className="lede">
        We found {claims.length} candidate claims. Choose one to review; the
        others will remain unevaluated.
      </p>
      <div className="source-quote">
        <span className="eyebrow">ORIGINAL VIOLATION TEXT</span>
        <blockquote>“{text}”</blockquote>
      </div>
      <fieldset className="claim-options">
        <legend>Which claim would you like to audit?</legend>
        {claims.map((claim, index) => (
          <label
            className={`claim-option ${choice === claim ? "selected" : ""}`}
            key={claim}
          >
            <input
              type="radio"
              name="claim"
              value={claim}
              checked={choice === claim}
              onChange={() => setChoice(claim)}
            />
            <span className="claim-number">0{index + 1}</span>
            <span>
              <strong>{claimName(claim)}</strong>
              <small>
                {claim === "WITHOUT_HELMET"
                  ? "Review vehicle category and helmet observations"
                  : "Review whether this check is supported by the evidence"}
              </small>
            </span>
            <span className="radio-mark">
              {choice === claim && <Icon name="check" size={14} />}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="action-footer">
        <button className="text-button" onClick={onBack}>
          ← Back to evidence
        </button>
        <button
          className="primary-button"
          disabled={!choice}
          onClick={() => onSelect(choice)}
        >
          Evaluate selected claim <Icon />
        </button>
      </div>
    </section>
  );
}

function AnalysisProgress({ stage, mode }) {
  const steps = [
    "Read the supplied claim",
    mode === "fixture"
      ? "Load fixture observations"
      : "Request visual observations",
    "Evaluate with deterministic rules",
    "Prepare the evidence report",
  ];
  return (
    <div
      className="analysis-overlay"
      role="status"
      aria-live="polite"
      aria-label="Review in progress"
    >
      <div className="analysis-panel">
        <span className="eyebrow">CAREFUL BY DESIGN</span>
        <h2>Following the evidence.</h2>
        <p>
          {mode === "fixture"
            ? "Non-live example · no Bedrock request is being made."
            : "Requesting observations from the configured backend."}
        </p>
        <ol>
          {steps.map((text, index) => (
            <li
              key={text}
              className={
                index < stage ? "done" : index === stage ? "active" : ""
              }
            >
              <span>
                {index < stage ? (
                  <Icon name="check" size={16} />
                ) : (
                  `0${index + 1}`
                )}
              </span>
              {text}
              {index === stage && <span className="stage-line" />}
            </li>
          ))}
        </ol>
        <div className="analysis-skeleton" />
        <small>Observations describe. Rules evaluate.</small>
      </div>
    </div>
  );
}

function ObservationSummary({ observation }) {
  if (!observation)
    return <p className="muted">No structured observations were returned.</p>;
  const rows = [
    [
      "Vehicle type",
      observation.vehicle_type?.value,
      observation.vehicle_type?.confidence,
    ],
    ["Helmet", observation.helmet?.status, observation.helmet?.confidence],
    [
      "People visible",
      observation.people_visible?.value,
      observation.people_visible?.confidence,
    ],
    [
      "License plate",
      observation.license_plate?.visible
        ? observation.license_plate.text || "Visible, unreadable"
        : "Not visible",
      observation.license_plate?.confidence,
    ],
    ["Image quality", observation.image_quality],
    ["Occlusion", observation.occlusion],
  ];
  return (
    <>
      <div className="observation-head">
        <span>OBSERVATION</span>
        <span>CONFIDENCE</span>
      </div>
      <dl className="observation-table">
        {rows.map(([label, value, confidence]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <strong>
                {label === "License plate"
                  ? String(value ?? "Not available")
                  : humanize(value)}
              </strong>
              {typeof confidence === "number" && (
                <span>{Math.round(confidence * 100)}%</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="field-hint">
        Confidence belongs to each observation, not to the legal validity of the
        challan.
      </p>
      {Array.isArray(observation.uncertainties) &&
        observation.uncertainties.length > 0 && (
          <div className="uncertainties">
            <strong>What remains uncertain</strong>
            <ul>
              {observation.uncertainties.map((item, index) => (
                <li key={index}>{String(item)}</li>
              ))}
            </ul>
          </div>
        )}
    </>
  );
}

function ResultScreen({ report, meta, file, claims, onOtherClaim, onBack }) {
  const { presentation, result, violation, observation } = report;
  const [tone, icon] =
    stateStyle[result.status] || stateStyle.INSUFFICIENT_EVIDENCE;
  return (
    <section className="report screen-enter">
      <div className="report-heading">
        <div>
          <span className="eyebrow">03 / EVIDENCE CONSISTENCY REPORT</span>
          <h1>The evidence, in perspective.</h1>
        </div>
        <span className="source-badge">
          <span className="status-dot" />
          {meta.source === "fixture"
            ? "Demo fixture — not live AWS evidence"
            : meta.source === "bedrock"
              ? "Source: Amazon Bedrock"
              : `Source: ${meta.source || "unknown"}`}
        </span>
      </div>
      <div className={`result-hero ${tone}`}>
        <span className="result-icon">
          <Icon name={icon} size={30} />
        </span>
        <div>
          <span className="eyebrow">DETERMINISTIC CONCLUSION</span>
          <h2>{presentation.title}</h2>
          <p>{result.reason}</p>
        </div>
        <span className="result-index">
          01 claim
          <br />
          evaluated
        </span>
      </div>
      <div className="report-grid">
        <div className="evidence-column">
          <div className="section-heading">
            <h2>Evidence under review</h2>
            <span className="eyebrow">01 / SOURCE</span>
          </div>
          {file && (
            <p className="observation-source">
              Source image: user-provided.
              {meta.source === "fixture" &&
                " Display only — fixture observations are not derived from this image."}
            </p>
          )}
          <EvidenceViewer file={file} />
          <div className="claim-summary">
            <span className="eyebrow">WHAT THE CHALLAN CLAIMS</span>
            <blockquote>“{violation.sourceText}”</blockquote>
            <div>
              <span>Selected claim</span>
              <strong>{claimName(violation.canonicalClaim)}</strong>
            </div>
            {claims.length > 1 && (
              <p className="field-hint">
                1 of {claims.length} detected claims evaluated. Other claims are
                not covered by this report.
              </p>
            )}
          </div>
        </div>
        <div className="observation-column">
          <div className="section-heading">
            <h2>What was observed</h2>
            <span className="eyebrow">02 / FACTS</span>
          </div>
          <p className="observation-source">
            {meta.source === "fixture"
              ? "Observations: fixture / development mode — not model output or an analysis of the source image."
              : "Visual observations supplied by the backend."}
          </p>
          <ObservationSummary observation={observation} />
          <details className="technical-details">
            <summary>
              Review the technical record <span>+</span>
            </summary>
            <dl>
              <dt>Result code</dt>
              <dd>{result.status}</dd>
              <dt>Canonical claim</dt>
              <dd>{violation.canonicalClaim}</dd>
              <dt>Observation source</dt>
              <dd>{meta.source}</dd>
            </dl>
          </details>
        </div>
      </div>
      <div className="guidance">
        <span className="eyebrow">03 / UNDERSTANDING THIS RESULT</span>
        <p>{presentation.guidance}</p>
      </div>
      <TrustNote />
      <div className="action-footer">
        <p className="muted">A clearer view. A more informed next step.</p>
        <div className="button-row">
          {claims.length > 1 && (
            <button className="secondary-button" onClick={onOtherClaim}>
              Review another claim
            </button>
          )}
          <button className="primary-button" onClick={onBack}>
            New review <Icon />
          </button>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [screen, setScreen] = useState("upload");
  const [stage, setStage] = useState(null);
  const [mode, setMode] = useState("fixture");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const main = useRef(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);
  function evaluate(next, selectedClaim) {
    setStage(2);
    const finalReport = auditEvidence({
      violationText: next.text,
      observation: next.observation,
      selectedClaim,
    });
    if (finalReport.requiresSelection) {
      setScreen("claim");
      setStage(null);
      return;
    }
    setStage(3);
    setReport(finalReport);
    setScreen("result");
    setStage(null);
  }
  async function submit(input) {
    setMode(input.mode);
    setError(null);
    setStage(0);
    let timeout;
    try {
      const text =
        input.mode === "fixture"
          ? FIXTURE_SCENARIOS.find((s) => s.id === input.fixtureId)
              .violationText
          : input.violationText;
      const { claims } = classifyForSelection(text);
      setStage(1);
      const request =
        input.mode === "fixture"
          ? observeEvidenceViaFixture(input.fixtureId)
          : fileToBase64(input.file).then(({ base64, mimeType }) =>
              observeEvidenceViaLiveBackend({ imageBase64: base64, mimeType }),
            );
      const response = await Promise.race([
        request,
        new Promise((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                Object.assign(
                  new Error(
                    "The backend did not respond within 30 seconds. Please retry.",
                  ),
                  { code: "TIMEOUT" },
                ),
              ),
            30000,
          );
        }),
      ]);
      clearTimeout(timeout);
      if (
        !response ||
        typeof response.meta?.source !== "string" ||
        !response.observation ||
        typeof response.observation !== "object"
      ) {
        throw new Error(
          "The backend returned an incomplete observation response. Please retry.",
        );
      }
      const next = { ...response, text, claims, file: input.file };
      setData(next);
      if (claims.length > 1) {
        setScreen("claim");
        setStage(null);
      } else evaluate(next);
    } catch (err) {
      setError({
        code: err.code,
        message: err.message || "Please check your input and try again.",
      });
      setStage(null);
    } finally {
      clearTimeout(timeout);
    }
  }
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to review
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (stage === null) setScreen("upload");
          }}
        >
          <span className="brand-mark">
            <Icon name="contrast" />
          </span>
          Challan<span>Check</span>
        </a>
        <span className="header-caption">EVIDENCE, BEFORE ASSUMPTION.</span>
        <span className="environment-label">
          <span className="status-dot" />
          Development preview
        </span>
      </header>
      <nav className="journey" aria-label="Review steps">
        {["Evidence", "Claim", "Report"].map((label, index) => (
          <span
            key={label}
            aria-current={
              ["upload", "claim", "result"][index] === screen
                ? "step"
                : undefined
            }
          >
            <small>0{index + 1}</small>
            {label}
          </span>
        ))}
      </nav>
      <main
        id="main"
        ref={main}
        tabIndex={-1}
        inert={stage !== null ? true : undefined}
      >
        <div hidden={screen !== "upload"}>
          <UploadScreen
            onSubmit={submit}
            loading={stage !== null}
            error={error}
            onDismissError={() => setError(null)}
          />
        </div>
        {screen === "claim" && (
          <ClaimScreen
            claims={data.claims}
            text={data.text}
            onSelect={(claim) => evaluate(data, claim)}
            onBack={() => setScreen("upload")}
          />
        )}
        {screen === "result" && report && (
          <ResultScreen
            report={report}
            meta={data.meta}
            file={data.file}
            claims={data.claims}
            onOtherClaim={() => setScreen("claim")}
            onBack={() => setScreen("upload")}
          />
        )}
      </main>
      <footer className="app-footer">
        <span>
          ChallanCheck <span className="footer-divider">/</span> Evidence
          consistency engine
        </span>
        <span>Observations ≠ legal conclusions</span>
      </footer>
      {stage !== null && <AnalysisProgress stage={stage} mode={mode} />}
    </div>
  );
}
export default App;
