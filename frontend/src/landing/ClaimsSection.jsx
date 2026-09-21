import { useMemo, useState } from "react";
import { CLAIMS } from "./content.js";
import { classifyForSelection } from "../lib/audit.js";
import { Reveal, Eyebrow } from "./primitives.jsx";

const CLAIM_NAME = {
  WITHOUT_HELMET: "Riding without helmet",
  SPEEDING: "Over speeding",
  RED_LIGHT_JUMP: "Red-light violation",
  PLATE_MISMATCH: "License-plate mismatch",
  NO_PUC_CERTIFICATE: "No PUC certificate",
};

function SelectionBoard() {
  const demo = useMemo(() => {
    const text = "Overspeeding and jumping the red light";
    const { claims, sourceText } = classifyForSelection(text);
    return { claims, sourceText };
  }, []);

  const [selected, setSelected] = useState(null);

  if (!demo.claims || demo.claims.length === 0) {
    return (
      <div className="claims__board">
        <div className="claims__board-challan">
          <span className="claims__board-tag">ONE CHALLAN</span>
          <blockquote>“{demo.sourceText}”</blockquote>
        </div>
        <p className="claims__board-empty">No recognisable offence pattern found by the real classifier.</p>
      </div>
    );
  }

  return (
    <div className="claims__board">
      <div className="claims__board-challan">
        <span className="claims__board-tag">ONE CHALLAN</span>
        <blockquote>“{demo.sourceText}”</blockquote>
        <span className="claims__board-meta">CLASSIFIER · real candidate extraction, in pattern order</span>
      </div>
      <div className="claims__board-pick" role="radiogroup" aria-label="Select one claim to evaluate">
        <span className="claims__board-label">SELECT ONE CLAIM</span>
        <div className="claims__board-options">
          {demo.claims.map((claim) => {
            const active = selected === claim;
            return (
              <button
                type="button"
                key={claim}
                role="radio"
                aria-checked={active}
                aria-label={CLAIM_NAME[claim] ?? claim}
                className={`claims__board-option ${active ? "is-selected" : ""}`}
                onClick={() => setSelected(active ? null : claim)}
              >
                <span className="claims__board-radio" aria-hidden="true" />
                <strong>{CLAIM_NAME[claim] ?? claim}</strong>
                <span className="land-mono">{claim}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="claims__board-line" aria-live="polite">
        {selected
          ? `Selected: ${CLAIM_NAME[selected] ?? selected} → one claim, one evaluation. The other candidate stays unevaluated — and is said to be so.`
          : "No silent selection. Choose one claim; the rest stay unevaluated."}
      </p>
    </div>
  );
}

export default function ClaimsSection() {
  return (
    <section id="claims" className="land-section claims" aria-label="Multiple claims, explicit selection">
      <div className="land-container">
        <Reveal className="claims__head">
          <Eyebrow>{CLAIMS.eyebrow}</Eyebrow>
          <h2 className="land-h2">
            {CLAIMS.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="land-lede">{CLAIMS.intro}</p>
        </Reveal>

        <Reveal className="claims__board-wrap">
          <SelectionBoard />
        </Reveal>

        <ol className="claims__flow">
          {CLAIMS.steps.map((step, i) => (
            <Reveal as="li" key={step.tag} className="claims__step" styleDelay={i * 90}>
              <div className="claims__card">
                <span className="claims__tag">{step.tag}</span>
                <div className="claims__lines">
                  {step.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </div>
                <span className="claims__note mono">{step.note}</span>
              </div>
              {i < CLAIMS.steps.length - 1 && (
                <span className="claims__arrow" aria-hidden="true">
                  ↓
                </span>
              )}
            </Reveal>
          ))}
        </ol>

        <Reveal className="claims__foot">
          <span className="land-mono">No silent selection. No collapsed verdict. One claim, one evaluation.</span>
        </Reveal>
      </div>
    </section>
  );
}