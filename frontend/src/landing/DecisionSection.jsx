import { DECISION } from "./content.js";
import { Reveal, Eyebrow } from "./primitives.jsx";

function pctOf(conf) {
  const n = parseInt(String(conf).replace("%", ""), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

export default function DecisionSection() {
  return (
    <section id="decision" className="land-section decision" aria-label="AI observes, code evaluates">
      <div className="land-container">
        <Reveal className="decision__head">
          <Eyebrow>{DECISION.eyebrow}</Eyebrow>
          <h2 className="land-h2">
            {DECISION.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="land-lede">{DECISION.intro}</p>
        </Reveal>

        <div className="decision__split">
          <Reveal className="decision__panel decision__panel--obs">
            <div className="decision__panel-head">
              <span>{DECISION.observation.tag}</span>
              <span className="decision__source">{DECISION.observation.source}</span>
            </div>
            <dl className="decision__rows">
              {DECISION.observation.rows.map(([label, value, conf]) => {
                const pct = pctOf(conf);
                return (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <strong>{value}</strong>
                      {pct !== null ? (
                        <span className="decision__conf">
                          <span className="decision__bar" aria-hidden="true">
                            <i style={{ width: `${pct}%` }} />
                          </span>
                          {conf}
                        </span>
                      ) : (
                        <span>{conf}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="decision__note">{DECISION.observation.note}</p>
          </Reveal>

          <Reveal className="decision__bridge" styleDelay={120}>
            <span className="decision__bridge-capsule" aria-hidden="true">
              <span className="decision__bridge-pulse">●</span>
            </span>
            <span className="decision__bridge-label">NEVER THE DECISION MAKER</span>
          </Reveal>

          <Reveal className="decision__panel decision__panel--eval" styleDelay={120}>
            <div className="decision__panel-head">
              <span>{DECISION.evaluation.tag}</span>
              <span className="decision__source">application code · ruleEngine.js</span>
            </div>
            <dl className="decision__rows decision__rows--eval">
              {DECISION.evaluation.rows.map(([label, value, conf]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {conf ? (
                      <strong className="decision__result">{value}</strong>
                    ) : (
                      <strong>{value}</strong>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="decision__note">{DECISION.evaluation.note}</p>
          </Reveal>
        </div>

        <Reveal className="decision__foot">
          <span className="land-mono">The observation is never the verdict. The verdict is never the observation.</span>
        </Reveal>
      </div>
    </section>
  );
}