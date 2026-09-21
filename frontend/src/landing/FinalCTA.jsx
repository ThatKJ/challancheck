import { FINAL_CTA } from "./content.js";
import { EvidenceArt } from "./primitives.jsx";

export default function FinalCTA() {
  return (
    <section id="try" className="land-section final" aria-label="Try ChallanCheck">
      <div className="final__visual" aria-hidden="true">
        <div className="final__static">
          <EvidenceArt />
          <span className="final__static-label">CLAIM → EVIDENCE → OBSERVATION → EVALUATION → RESULT</span>
        </div>
      </div>
      <div className="land-container final__inner">
        <span className="land-mono final__eyebrow">THE SAME OBJECT, FULLY ASSEMBLED</span>
        <h2 className="land-h2 final__title">
          {FINAL_CTA.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <p className="final__body">{FINAL_CTA.body}</p>
        <div className="final__ctas">
          <a className="land-btn land-btn--primary land-btn--lg" href={FINAL_CTA.hrefPrimary}>
            {FINAL_CTA.primary}
            <span className="land-btn__arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="land-btn land-btn--ghost land-btn--lg" href={FINAL_CTA.hrefSecondary} target="_blank" rel="noopener noreferrer">
            {FINAL_CTA.secondary}
          </a>
        </div>
      </div>
    </section>
  );
}