import { useEffect, useRef, useState } from "react";
import { PROBLEM } from "./content.js";
import { Eyebrow } from "./primitives.jsx";
import { useMediaQuery, useReducedMotion, useScrollProgress } from "./hooks.js";
import { EVIDENCE_FRAME, EVIDENCE_FRAME_ALT } from "./evidenceFrame.js";
import {
  MARKERS,
  LABEL_POS,
  OBSERVED_ROWS,
  ESTABLISH,
  WHY_CHAIN,
  chainStageFor,
} from "./evidenceData.js";

const PHASES = 7; // 0 claim · 1 photo · 2 link · 3 markers · 4 observed · 5 eval · 6 result

function WhyMarks({ phase }) {
  return (
    <svg
      className="why-marks"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {MARKERS.map((m, i) => {
        const visible = phase >= 3;
        const pos = LABEL_POS[m.id];
        return (
          <g
            key={m.id}
            className={`why-marks__m m-${m.id} ${visible ? "is-on" : ""}`}
            style={{ transitionDelay: `${140 * (i + 1)}ms` }}
          >
            <rect x={m.x} y={m.y} width={m.w} height={m.h} rx="3" />
            <path d={pos.leader} className="why-marks__lead" />
            <text x={pos.lx} y={pos.ly} className="why-marks__lbl">
              <tspan className="why-marks__name">{m.label}</tspan>
              <tspan className="why-marks__val" x={pos.lx} dy="12">
                {m.value}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WhyPhoto({ phase }) {
  return (
    <figure className={`why-photo ${phase >= 1 ? "is-on" : ""}`} data-slot="02 · EVIDENCE">
      <div className="why-photo__head">
        <span className="why-chip why-chip--blue">EVIDENCE</span>
        <span className="why-card__id">FRAME / 001</span>
      </div>
      <div className="why-photo__frame">
        <img src={EVIDENCE_FRAME} alt={EVIDENCE_FRAME_ALT} draggable="false" />
        <WhyMarks phase={phase} />
        <span className="why-photo__scan" aria-hidden="true" />
        <span className="why-photo__topbar" aria-hidden="true">
          FRAME · EVID.001 · SCHEMATIC
        </span>
        <span className="why-photo__badge">PHOTO WITHHELD FOR PRIVACY</span>
      </div>
      <figcaption>REGIONS FROM A RECORDED RUN · PHOTO NOT SHOWN</figcaption>
    </figure>
  );
}

function WhyClaim({ phase }) {
  return (
    <article className={`why-card why-claim ${phase >= 1 ? "is-dim" : ""}`}>
      <div className="why-card__head">
        <span className="why-card__head-l">
          <span className="why-card__ord">01</span>
          <span className="why-chip why-chip--orange">CLAIM</span>
        </span>
        <span className="why-card__id">INPUT / OBJECT</span>
      </div>
      <p className="why-claim__label">What the challan cites</p>
      <blockquote className="why-claim__quote">{PROBLEM.claim.line}</blockquote>
      <span className="why-claim__mono">CANONICAL · WITHOUT_HELMET</span>
      <dl className="why-meta">
        <div>
          <dt>SOURCE</dt>
          <dd>E-CHALLAN</dd>
        </div>
        <div>
          <dt>TYPE</dt>
          <dd>CLAIM</dd>
        </div>
        <div>
          <dt>STATUS</dt>
          <dd>TO VERIFY</dd>
        </div>
      </dl>
    </article>
  );
}

function WhyLink({ phase }) {
  return (
    <svg
      className={`why-link ${phase >= 2 ? "is-drawn" : ""}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="why-link__line" d="M 44 47 H 56" />
      <path className="why-link__tip" d="M 56 47 l -4 -3.2 m 4 3.2 l -4 3.2" />
    </svg>
  );
}

function WhyObserved({ phase }) {
  return (
    <aside className={`why-card why-obs ${phase >= 4 ? "is-on" : ""}`} data-slot="03 · OBSERVED">
      <div className="why-card__head">
        <span className="why-chip why-chip--blue">OBSERVED</span>
        <span className="why-card__id">DETECTLABELS · RECORDED RUN</span>
      </div>
      <dl className="why-obs__list">
        {OBSERVED_ROWS.map(({ id, k, v, tone }) => (
          <div className={`why-obs__row t-${tone}`} key={id}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="why-card__note">Structured facts from the image — labels and measurements only, never a verdict.</p>
    </aside>
  );
}

function WhyEstablish({ phase }) {
  return (
    <section className={`why-establish ${phase >= 5 ? "is-on" : ""}`} data-slot="03 · ESTABLISHED">
      <span className="why-chip why-chip--charcoal">WHAT THE EVIDENCE ESTABLISHES</span>
      <ul>
        {ESTABLISH.map(({ tone, mark, label, value }) => (
          <li key={label} className={`t-${tone}`}>
            <span className="why-establish__mark" aria-hidden="true">
              {mark}
            </span>
            <span className="why-establish__label">{label}</span>
            <em>{value}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WhyTrust({ phase }) {
  return (
    <div className={`why-trust ${phase >= 5 ? "is-on" : ""}`} aria-hidden="true">
      <span className="why-trust__chip why-chip why-chip--blue">AI OBSERVES</span>
      <i className="why-trust__tic" />
      <span className="why-trust__chip why-chip why-chip--charcoal">STRUCTURED OBSERVATION</span>
      <i className="why-trust__tic" />
      <span className="why-trust__chip why-chip why-chip--charcoal">CODE EVALUATES</span>
    </div>
  );
}

function WhyEvaluate({ phase }) {
  return (
    <aside className={`why-card why-eval ${phase >= 5 ? "is-on" : ""}`} data-slot="04 · EVALUATION">
      <div className="why-card__head">
        <span className="why-chip why-chip--charcoal">EVALUATION</span>
        <span className="why-card__id">RULE ENGINE · DETERMINISTIC</span>
      </div>
      <p className="why-eval__src">
        <span>CLAIM</span>
        <i aria-hidden="true">+</i>
        <span>OBSERVATIONS</span>
      </p>
      <div className="why-eval__rule">
        <span>RULE</span>
        WITHOUT_HELMET → vehicle + helmet status
      </div>
      <span className="why-eval__arrow" aria-hidden="true">
        ↓
      </span>
      <div className={`why-eval__result ${phase >= 6 ? "is-on" : ""}`}>
        <span className="why-chip why-chip--orange">INSUFFICIENT EVIDENCE</span>
        <p>The vehicle type is unresolved and helmet use is not established. The rule engine does not guess.</p>
      </div>
    </aside>
  );
}

function WhyChain({ stage }) {
  return (
    <ol className="why-chain" aria-label="Evidence chain">
      {WHY_CHAIN.map((s, i) => (
        <li key={s.n} className={i === stage ? "is-active" : ""}>
          <span className="why-chain__no">{s.n}</span>
          <span className="why-chain__name">{s.name}</span>
          <span className="why-chain__icon" aria-hidden="true" />
        </li>
      ))}
    </ol>
  );
}

export default function ProblemSection() {
  const sectionRef = useRef(null);
  // The pinned scroll-story needs ~820px of height below the nav; shorter desktop windows get the static layout.
  const desktop = useMediaQuery("(min-width: 1025px) and (min-height: 900px)");
  const reduced = useReducedMotion();
  const { beat } = useScrollProgress(sectionRef, Array.from({ length: PHASES }), {});
  const [entered, setEntered] = useState(reduced);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setEntered(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const scrollStory = desktop && !reduced;
  const phase = scrollStory ? beat : PHASES - 1;
  const stage = scrollStory ? chainStageFor(beat) : WHY_CHAIN.length - 1;

  return (
    <section
      ref={sectionRef}
      id="why"
      className={`land-section problem ${reduced ? "is-reduced" : ""} ${
        entered ? "is-entered" : ""
      }`}
      aria-label="Why ChallanCheck exists"
    >
      <div className="land-container problem__head">
        <Eyebrow>{PROBLEM.eyebrow}</Eyebrow>
        <h2 className="land-h2">
          {PROBLEM.title.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <p className="problem__sub">
          One is what the notice says.
          <br />
          The other is what the evidence actually shows.
        </p>
      </div>

      <div
        className={`why-story ${scrollStory ? "" : "why-story--static"}`}
        style={scrollStory ? { height: "280vh" } : undefined}
      >
        <div className="why-sticky">
          <div className="why-grid" aria-hidden="true" />

          <div className="why-scene">
            <div className="why-scene__mark">
              <span className="why-scene__mark-index">01</span>
              <span className="why-scene__mark-label">SCENE / WHY-01 · EVIDENCE ANALYSIS</span>
              <span className="why-scene__mark-rule" aria-hidden="true" />
            </div>

            <div className="why-top">
              <WhyClaim phase={phase} />
              <WhyLink phase={phase} />
              <WhyPhoto phase={phase} />
            </div>

            <WhyTrust phase={phase} />

            <div className="why-bottom">
              <WhyObserved phase={phase} />
              <WhyEstablish phase={phase} />
              <WhyEvaluate phase={phase} />
            </div>

            <WhyChain stage={stage} />
          </div>
        </div>
      </div>
    </section>
  );
}