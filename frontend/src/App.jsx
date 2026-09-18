import { useMemo, useState } from "react";
import {
  FIXTURE_SCENARIOS,
  observeEvidenceViaFixture,
  observeEvidenceViaLiveBackend,
  classifyForSelection,
  auditEvidence,
  fileToBase64,
} from "./lib/audit.js";
import "./App.css";

const SCREENS = { UPLOAD: "upload", CLAIM: "claim", RESULT: "result" };

function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;
  return (
    <div className="banner banner--error" role="alert">
      <strong>{error.code === "AWS_NOT_CONFIGURED" ? "AWS Not Configured" : "Error"}</strong>
      <p>{error.message}</p>
      <p className="banner__meta">Live AWS/Bedrock status: UNKNOWN.</p>
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

function UploadScreen({ onSubmit, loading, error, onDismissError }) {
  const [mode, setMode] = useState("fixture");
  const [fixtureId, setFixtureId] = useState(FIXTURE_SCENARIOS[0].id);
  const [violationText, setViolationText] = useState("");
  const [file, setFile] = useState(null);

  const canSubmit = mode === "fixture" ? Boolean(fixtureId) : Boolean(violationText.trim() && file);

  return (
    <section className="screen">
      <h1>1. Upload Challan / Evidence</h1>

      <div className="mode-toggle">
        <label>
          <input
            type="radio"
            name="mode"
            checked={mode === "fixture"}
            onChange={() => setMode("fixture")}
          />
          Use a dev fixture
        </label>
        <label>
          <input type="radio" name="mode" checked={mode === "live"} onChange={() => setMode("live")} />
          Upload real evidence (attempts live Bedrock)
        </label>
      </div>

      {mode === "fixture" ? (
        <div className="field-group">
          <span className="dev-tag">source = fixture</span>
          <label htmlFor="fixture-select">Dev fixture scenario</label>
          <select id="fixture-select" value={fixtureId} onChange={(e) => setFixtureId(e.target.value)}>
            {FIXTURE_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="hint">
            Dev fixtures are canned data for UI development — never live Bedrock output.
          </p>
        </div>
      ) : (
        <div className="field-group">
          <label htmlFor="violation-text">Violation text (from the challan)</label>
          <input
            id="violation-text"
            type="text"
            placeholder='e.g. "Riding without helmet"'
            value={violationText}
            onChange={(e) => setViolationText(e.target.value)}
          />
          <label htmlFor="evidence-file">Evidence photo</label>
          <input
            id="evidence-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="hint">
            This attempts a real call to AWS Bedrock. No AWS credentials are configured for this
            project yet, so it is expected to fail with an AWS error below — that failure is honest,
            not a bug.
          </p>
        </div>
      )}

      <ErrorBanner error={error} onDismiss={onDismissError} />

      <button
        type="button"
        disabled={!canSubmit || loading}
        onClick={() => onSubmit(mode === "fixture" ? { mode, fixtureId } : { mode, violationText, file })}
      >
        {loading ? "Loading…" : "Continue"}
      </button>
    </section>
  );
}

function ClaimScreen({ candidateClaims, sourceText, onSelect, onBack }) {
  const [choice, setChoice] = useState(candidateClaims[0]);

  return (
    <section className="screen">
      <h1>2. Claim to Evaluate</h1>
      <p className="hint">
        The violation text cites more than one offence — ChallanCheck evaluates one at a time. Choose
        which claim to audit.
      </p>
      <blockquote className="quoted-text">&ldquo;{sourceText}&rdquo;</blockquote>

      <div className="claim-options">
        {candidateClaims.map((claim) => (
          <label key={claim} className="claim-option">
            <input
              type="radio"
              name="claim"
              value={claim}
              checked={choice === claim}
              onChange={() => setChoice(claim)}
            />
            {claim}
          </label>
        ))}
      </div>

      <div className="button-row">
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={() => onSelect(choice)}>
          Continue
        </button>
      </div>
    </section>
  );
}

function ObservationTable({ observation }) {
  return (
    <dl className="observation-table">
      <dt>Vehicle type</dt>
      <dd>
        {observation.vehicle_type.value} ({Math.round(observation.vehicle_type.confidence * 100)}%)
      </dd>
      <dt>Helmet</dt>
      <dd>
        {observation.helmet.status} ({Math.round(observation.helmet.confidence * 100)}%)
      </dd>
      <dt>People visible</dt>
      <dd>{observation.people_visible.value}</dd>
      <dt>License plate</dt>
      <dd>{observation.license_plate.visible ? observation.license_plate.text ?? "visible" : "not visible"}</dd>
      <dt>Image quality</dt>
      <dd>{observation.image_quality}</dd>
      <dt>Occlusion</dt>
      <dd>{observation.occlusion}</dd>
      {observation.uncertainties.length > 0 && (
        <>
          <dt>Uncertainties</dt>
          <dd>{observation.uncertainties.join(", ")}</dd>
        </>
      )}
    </dl>
  );
}

function ResultScreen({ report, sourceMeta, onStartOver }) {
  const { presentation, result, violation, observation } = report;

  return (
    <section className="screen">
      <h1>3. Evidence Audit</h1>

      <div className={`source-tag source-tag--${sourceMeta.source}`}>
        source = {sourceMeta.source}
        {sourceMeta.label ? ` (${sourceMeta.label})` : ""}
      </div>

      <div className={`banner banner--${presentation.tone}`}>
        <strong>{presentation.title}</strong>
        <p>{presentation.guidance}</p>
      </div>

      <div className="audit-columns">
        <div className="audit-column">
          <h2>Claim</h2>
          <p className="quoted-text">&ldquo;{violation.sourceText}&rdquo;</p>
          <p>
            Canonical: <code>{violation.canonicalClaim}</code>
          </p>
        </div>
        <div className="audit-column">
          <h2>Visual Observations</h2>
          <ObservationTable observation={observation} />
        </div>
        <div className="audit-column">
          <h2>Deterministic Result</h2>
          <p className="result-status">{result.status}</p>
          <p>{result.reason}</p>
        </div>
      </div>

      <button type="button" onClick={onStartOver}>
        Start Over
      </button>
    </section>
  );
}

function App() {
  const [screen, setScreen] = useState(SCREENS.UPLOAD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceMeta, setSourceMeta] = useState(null);
  const [violationText, setViolationText] = useState("");
  const [observation, setObservation] = useState(null);
  const [candidateClaims, setCandidateClaims] = useState([]);
  const [report, setReport] = useState(null);

  const classification = useMemo(
    () => (violationText ? classifyForSelection(violationText) : null),
    [violationText]
  );

  async function handleUploadSubmit(input) {
    setLoading(true);
    setError(null);
    try {
      let obs;
      let meta;
      let text;

      if (input.mode === "fixture") {
        const result = await observeEvidenceViaFixture(input.fixtureId);
        obs = result.observation;
        meta = result.meta;
        text = result.violationText;
      } else {
        const { base64, mimeType } = await fileToBase64(input.file);
        const result = await observeEvidenceViaLiveBackend({ imageBase64: base64, mimeType });
        obs = result.observation;
        meta = result.meta;
        text = input.violationText;
      }

      setObservation(obs);
      setSourceMeta(meta);
      setViolationText(text);

      const { claims } = classifyForSelection(text);
      if (claims.length > 1) {
        setCandidateClaims(claims);
        setScreen(SCREENS.CLAIM);
      } else {
        const finalReport = auditEvidence({ violationText: text, observation: obs });
        setReport(finalReport);
        setScreen(SCREENS.RESULT);
      }
    } catch (err) {
      setError({ code: err.code, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleClaimSelect(selectedClaim) {
    const finalReport = auditEvidence({ violationText, selectedClaim, observation });
    setReport(finalReport);
    setScreen(SCREENS.RESULT);
  }

  function handleStartOver() {
    setScreen(SCREENS.UPLOAD);
    setLoading(false);
    setError(null);
    setSourceMeta(null);
    setViolationText("");
    setObservation(null);
    setCandidateClaims([]);
    setReport(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ChallanCheck</h1>
        <p className="app-subtitle">Evidence Consistency Engine</p>
      </header>

      {screen === SCREENS.UPLOAD && (
        <UploadScreen
          onSubmit={handleUploadSubmit}
          loading={loading}
          error={error}
          onDismissError={() => setError(null)}
        />
      )}

      {!loading && screen === SCREENS.CLAIM && (
        <ClaimScreen
          candidateClaims={candidateClaims}
          sourceText={classification?.sourceText ?? violationText}
          onSelect={handleClaimSelect}
          onBack={handleStartOver}
        />
      )}

      {!loading && screen === SCREENS.RESULT && report && (
        <ResultScreen report={report} sourceMeta={sourceMeta} onStartOver={handleStartOver} />
      )}
    </div>
  );
}

export default App;
