import { UNCERTAINTY } from "./content.js";
import { Reveal, Eyebrow, EvidenceArt } from "./primitives.jsx";

export default function UncertaintySection() {
  return (
    <section id="uncertainty" className="land-section uncertainty" aria-label="Uncertainty is a valid result">
      <div className="land-container">
        <div className="uncertainty__grid">
          <Reveal className="uncertainty__copy">
            <Eyebrow>{UNCERTAINTY.eyebrow}</Eyebrow>
            <h2 className="land-h2">
              {UNCERTAINTY.title.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h2>
            <p className="land-lede">{UNCERTAINTY.intro}</p>
            <p className="uncertainty__line">{UNCERTAINTY.line}</p>
            <p className="uncertainty__note">{UNCERTAINTY.note}</p>
          </Reveal>

          <Reveal className="uncertainty__scene" styleDelay={120}>
            <div className="uncertainty__frame">
              <EvidenceArt blur={8} alt="A deliberately blurred schematic evidence frame" />
              <span className="uncertainty__scan" aria-hidden="true" />
              <span className="uncertainty__thumbmeta">ILLUSTRATION · DELIBERATELY BLURRED</span>
            </div>
            <div className="uncertainty__chips">
              {UNCERTAINTY.chips.map(([label, value], i) => (
                <span className="uncertainty__chip" key={label} style={{ "--i": i }}>
                  <i>{label}</i>
                  <b>{value}</b>
                </span>
              ))}
            </div>
            <div className="uncertainty__result">
              <span className="uncertainty__result-eyebrow">RESULT · DETERMINISTIC</span>
              <strong>{UNCERTAINTY.result}</strong>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}