import { UNDER_THE_HOOD } from "./content.js";
import { Reveal, Eyebrow } from "./primitives.jsx";

const OUTCOME_TONE = {
  mi: "hood-tone--mi",
  go: "hood-tone--go",
  ie: "hood-tone--ie",
  uns: "hood-tone--uns",
};

export default function UnderTheHoodSection() {
  const { observation, rule, outcomes, table } = UNDER_THE_HOOD;
  return (
    <section id="under-the-hood" className="land-section hood" aria-label="Under the hood, the evaluation logic">
      <div className="land-container">
        <Reveal className="hood__head">
          <Eyebrow>{UNDER_THE_HOOD.eyebrow}</Eyebrow>
          <h2 className="land-h2">
            {UNDER_THE_HOOD.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="land-lede">{UNDER_THE_HOOD.intro}</p>
        </Reveal>

        <div className="hood__row hood__row--top">
          <Reveal className="hood__card">
            <div className="hood__card-head">
              <span>{observation.tag}</span>
              <span className="hood__sub">{observation.sub}</span>
            </div>
            <div className="hood__code" role="img" aria-label="Example observation, labeled as a fixture example">
              {observation.fields.map(([k, v]) => (
                <div className="hood__code-line" key={k}>
                  <span className="hood__code-key">{JSON.stringify(k)}</span>
                  <span className="hood__code-val">{v}</span>
                </div>
              ))}
            </div>
            <p className="hood__note">{observation.note}</p>
          </Reveal>

          <Reveal className="hood__card hood__card--rule" styleDelay={120}>
            <div className="hood__card-head">
              <span>{rule.tag}</span>
              <span className="hood__sub">{rule.sub}</span>
            </div>
            <ol className="hood__gates">
              {rule.gates.map((g, i) => (
                <li key={g.name}>
                  <span className="hood__gate-no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="hood__gate-name">{g.name}</span>
                  <span className={`hood__gate-check ${OUTCOME_TONE[g.g] ?? ""}`}>{g.check}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal className="hood__card hood__card--outcomes" styleDelay={200}>
            <div className="hood__card-head">
              <span>{outcomes.tag}</span>
              <span className="hood__sub">{outcomes.sub}</span>
            </div>
            <div className="hood__outcome-list">
              {outcomes.rows.map(([status, title, tone]) => (
                <div className="hood__outcome" key={status}>
                  <span className="hood__outcome-status">{status}</span>
                  <span className={`hood__outcome-title ${OUTCOME_TONE[tone] ?? ""}`}>{title}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal className="hood__table-card">
          <div className="hood__table-head">
            <span className="land-mono">{table.claim} · every combination the engine decides</span>
          </div>
          <div className="hood__table-wrap">
            <table className="hood__table">
              <thead>
                <tr>
                  {table.cols.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th aria-label="Result" />
                </tr>
              </thead>
              <tbody>
                {table.rows.map(([v, h, out, tone], i) => (
                  <tr key={`${v}-${i}`}>
                    <td className="land-mono">{v}</td>
                    <td className="land-mono">{h}</td>
                    <td className={`hood__table-out ${OUTCOME_TONE[tone] ?? ""}`}>{out}</td>
                    <td aria-hidden="true" className="hood__table-tone">
                      <span className={`hood__dot ${OUTCOME_TONE[tone] ?? ""}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal className="hood__foot">
          <span className="land-mono">{UNDER_THE_HOOD.foot}</span>
        </Reveal>
      </div>
    </section>
  );
}