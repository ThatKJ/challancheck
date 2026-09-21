import { ARCHITECTURE } from "./content.js";
import { Reveal, Eyebrow } from "./primitives.jsx";

const KIND_CLASS = {
  start: "arch-node--start",
  mid: "arch-node--mid",
  obs: "arch-node--obs",
  eval: "arch-node--eval",
};

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="land-section architecture" aria-label="AWS architecture">
      <div className="land-container">
        <Reveal className="architecture__head">
          <Eyebrow>{ARCHITECTURE.eyebrow}</Eyebrow>
          <h2 className="land-h2">
            {ARCHITECTURE.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="land-lede">{ARCHITECTURE.intro}</p>
        </Reveal>

        <div className="architecture__layout">
          <Reveal className="architecture__flow">
            <ol className="arch-flow">
              {ARCHITECTURE.flow.map((step, i) => (
                <li key={step.node} className={`arch-flow__item ${KIND_CLASS[step.kind] ?? ""}`}>
                  <div className="arch-flow__node">
                    <span className="arch-flow__no">{String(i + 1).padStart(2, "0")}</span>
                    <div className="arch-flow__body">
                      <strong>{step.node}</strong>
                      <span className="arch-flow__sub">{step.sub}</span>
                    </div>
                    {step.kind === "obs" && <span className="arch-flow__badge">OBSERVES ONLY</span>}
                    {step.kind === "eval" && <span className="arch-flow__badge">CODE DECIDES</span>}
                  </div>
                  {i < ARCHITECTURE.flow.length - 1 && (
                    <span className="arch-flow__link" aria-hidden="true">
                      ↓
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal className="architecture__side" styleDelay={140}>
            <h3>Guardrails, not decoration</h3>
            <dl className="arch-side">
              {ARCHITECTURE.side.map(({ k, v, kind }) => (
                <div key={k} className={`arch-side__row ${kind === "warn" ? "arch-side__row--warn" : ""}`}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="arch-side__foot">{ARCHITECTURE.foot}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}