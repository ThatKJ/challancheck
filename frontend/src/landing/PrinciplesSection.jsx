import { PRINCIPLES } from "./content.js";
import { Reveal, Eyebrow } from "./primitives.jsx";

export default function PrinciplesSection() {
  return (
    <section id="principles" className="land-section principles" aria-label="ChallanCheck principles">
      <div className="land-container">
        <Reveal className="principles__head">
          <Eyebrow>WHY CHALLANCHECK</Eyebrow>
          <h2 className="land-h2">
            <span>Built on three</span>
            <span>refusals.</span>
          </h2>
        </Reveal>

        <ol className="principles__list">
          {PRINCIPLES.map((p, i) => (
            <Reveal as="li" key={p.n} className="principles__item" styleDelay={i * 100}>
              <span className="principles__no">{p.n}</span>
              <h3>{p.name}</h3>
              <p>{p.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}