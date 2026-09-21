import { useMemo } from "react";
import { FIXTURE_SCENARIOS, auditEvidence, classifyForSelection } from "../lib/audit.js";
import { REVIEW_HREF } from "./content.js";
import { Reveal, Eyebrow, EvidenceArt } from "./primitives.jsx";

const CLAIM_NAME = {
  WITHOUT_HELMET: "Riding without helmet",
  SPEEDING: "Over speeding",
  RED_LIGHT_JUMP: "Red-light violation",
};

function titleFor(status) {
  return (
    {
      OBSERVABLE_INCONSISTENCY: "Evidence Mismatch Found",
      CONSISTENT_WITH_EVIDENCE: "No Mismatch Found",
      INSUFFICIENT_EVIDENCE: "Insufficient Evidence",
      UNSUPPORTED_CHECK: "Cannot Verify From a Single Photo",
    }[status] ?? "Unknown Result"
  );
}

const rowsFor = (observation) => [
  ["Vehicle type", observation?.vehicle_type?.value ?? "—", observation?.vehicle_type?.confidence],
  ["Helmet", observation?.helmet?.status ?? "—", observation?.helmet?.confidence],
  ["People visible", observation?.people_visible?.value ?? "—", observation?.people_visible?.confidence],
  ["License plate", observation?.license_plate?.visible ? "Visible" : "Not detected", observation?.license_plate?.confidence],
  ["Image quality", observation?.image_quality ?? "—", null],
  ["Occlusion", observation?.occlusion ?? "—", null],
];

export default function ProductPreviewSection() {
  const demo = useMemo(() => {
    const scenario = FIXTURE_SCENARIOS.find((s) => s.id === "car_no_helmet") ?? FIXTURE_SCENARIOS[0];
    const { claims } = classifyForSelection(scenario.violationText);
    const report = auditEvidence({
      violationText: scenario.violationText,
      observation: scenario.observation,
      selectedClaim: claims[0],
    });
    return { scenario, report, claims };
  }, []);

  const { report, scenario } = demo;
  const tone =
    report.result.status === "OBSERVABLE_INCONSISTENCY" ? "mismatch" : report.result.status === "INSUFFICIENT_EVIDENCE" ? "insufficient" : "consistent";
  const rows = rowsFor(report.observation);
  const clean = (s) => String(s ?? "—").replaceAll("_", " ");
  const observed =
    report.result.status === "OBSERVABLE_INCONSISTENCY"
      ? `${clean(report.observation.vehicle_type?.value)} · helmet ${clean(report.observation.helmet?.status)}`
      : `helmet ${clean(report.observation.helmet?.status)}`;

  return (
    <section id="product-preview" className="land-section preview" aria-label="The product, in action">
      <div className="land-container">
        <Reveal className="preview__head">
          <Eyebrow>THE PRODUCT · IN ACTION</Eyebrow>
          <h2 className="land-h2">
            <span>The review,</span>
            <span>as it runs.</span>
          </h2>
          <p className="land-lede">
            This is the actual review surface, rendered by the real rule engine from a fixture observation.
            No image is analyzed here — open the review app to try your own.
          </p>
        </Reveal>

        <div className="preview__window">
          <div className="preview__topbar">
            <span className="preview__status">
              <span className="preview__dot" /> Fixture demo · deterministic rules are live
            </span>
            <a className="preview__open" href={REVIEW_HREF}>
              Open the review app →
            </a>
          </div>

          <div className="preview__grid">
            <Reveal className="preview__evidence" >
              <span className="eyebrow land-eyebrow preview__label">EVIDENCE UNDER REVIEW</span>
              <div className="preview__frame">
                <EvidenceArt />
                <span className="preview__frame-meta">FIXTURE SCENARIO · SCHEMATIC FRAME · NO IMAGE ANALYZED</span>
              </div>
              <div className="preview__quote">
                <span className="eyebrow land-eyebrow">WHAT THE CHALLAN CLAIMS</span>
                <blockquote>“{scenario.violationText}”</blockquote>
                <span className="preview__claim">
                  Selected claim · <b>{CLAIM_NAME[report.violation.canonicalClaim] ?? report.violation.canonicalClaim}</b>
                </span>
              </div>
            </Reveal>

            <div className="preview__findings">
              <Reveal className={`preview__verdict ${tone}`}>
                <span className="eyebrow land-eyebrow preview__verdict-eyebrow">DETERMINISTIC CONCLUSION</span>
                <strong>{titleFor(report.result.status)}</strong>
                <p>{report.result.reason}</p>
                <div className="preview__band">
                  <span>
                    <i>Claimed</i>
                    <b>{CLAIM_NAME[report.violation.canonicalClaim] ?? "—"}</b>
                  </span>
                  <span>
                    <i>Observed</i>
                    <b>{observed}</b>
                  </span>
                  <span>
                    <i>Result</i>
                    <b>{titleFor(report.result.status)}</b>
                  </span>
                </div>
              </Reveal>

              <Reveal className="preview__table" styleDelay={160}>
                <span className="eyebrow land-eyebrow preview__label">WHAT WAS OBSERVED</span>
                <dl>
                  {rows.map(([label, value, confidence]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <b>{String(value ?? "—").replaceAll("_", " ")}</b>
                        {typeof confidence === "number" && confidence > 0 && <span>{Math.round(confidence * 100)}%</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>
          </div>

          <Reveal className="preview__foot">
            <span className="land-mono">
              Confidence belongs to each observation — never to the legal validity of the challan.
            </span>
            <a className="land-btn land-btn--primary" href={REVIEW_HREF}>
              Try another scenario
              <span className="land-btn__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}