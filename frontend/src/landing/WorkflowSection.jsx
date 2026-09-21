import { WORKFLOW } from "./content.js";
import { Reveal, Eyebrow } from "./primitives.jsx";

export default function WorkflowSection() {
  return (
    <section id="workflow" className="land-section workflow" aria-label="How ChallanCheck works">
      <div className="land-container">
        <Reveal className="workflow__head">
          <Eyebrow>{WORKFLOW.eyebrow}</Eyebrow>
          <h2 className="land-h2">
            {WORKFLOW.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
        </Reveal>

        <ol className="workflow__stages">
          {WORKFLOW.steps.map((step, i) => (
            <Reveal as="li" key={step.n} className={`workflow__stage stage-${i + 1}`} styleDelay={i * 90}>
              <div className="workflow__card">
                <span className="workflow__no">{step.n}</span>
                <div className="workflow__name-row">
                  <span className="workflow__name">{step.name}</span>
                  <span className="workflow__arrow" aria-hidden="true">→</span>
                </div>
                <h3 className="workflow__lines">
                  {step.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </h3>
                <p className="workflow__body">{step.body}</p>
              </div>
              {i < WORKFLOW.steps.length - 1 && <span className="workflow__link" aria-hidden="true" />}
            </Reveal>
          ))}
        </ol>

        <Reveal className="workflow__result">
          <span className="workflow__result-tag">→ RESULT</span>
          <span className="workflow__result-line">
            One claim in. One evidence-consistent answer out.
          </span>
        </Reveal>

        <Reveal className="workflow__mantra">
          <strong>{WORKFLOW.mantra}</strong>
          <span>Observations describe. Rules evaluate. The two never trade places.</span>
        </Reveal>
      </div>
    </section>
  );
}