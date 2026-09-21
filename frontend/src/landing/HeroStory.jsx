import { useEffect, useRef, useState } from "react";
import { HERO_STORY_BEATS, REVIEW_HREF } from "./content.js";
import { useMediaQuery, useReducedMotion, useScrollProgress } from "./hooks.js";
import { EVIDENCE_FRAME } from "./evidenceFrame.js";
import { MARKERS, LABEL_POS, OBSERVATION_ROWS } from "./evidenceData.js";

const STEP_LABELS = ["CLAIM", "EVIDENCE", "OBSERVE", "EVALUATE", "RESULT"];

function PhaseMarker({ m, phase, index, dim }) {
  const visible = phase >= (index === 0 ? 1 : 2);
  const pos = LABEL_POS[m.id];
  return (
    <g
      className={`evid-marks__m m-${m.id} ${visible ? "is-on" : ""} ${dim ? "is-dim" : ""}`}
      style={{ transitionDelay: visible ? `${140 * (index + 1)}ms` : "0ms" }}
    >
      <rect x={m.x} y={m.y} width={m.w} height={m.h} rx="3" />
      <path d={pos.leader} className="evid-marks__lead" />
      <text x={pos.lx} y={pos.ly} className="evid-marks__lbl">
        <tspan className="evid-marks__name">{m.label}</tspan>
        <tspan className="evid-marks__val" x={pos.lx} dy="12">
          {m.value}
        </tspan>
      </text>
    </g>
  );
}

function EvidenceMarks({ phase, dim }) {
  return (
    <svg
      className="evid-frame__marks"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {MARKERS.map((m, i) => (
        <PhaseMarker key={m.id} m={m} phase={phase} index={i} dim={dim} />
      ))}
    </svg>
  );
}

function ObsPanel({ phase }) {
  return (
    <aside className={`evid-obs ${phase >= 2 ? "is-active" : ""}`}>
      <div className="evid-panel__head">
        <span>OBSERVATIONS</span>
        <span className="evid-panel__tag">DETECTLABELS · RECORDED RUN</span>
      </div>
      <dl className="evid-obs__rows">
        {OBSERVATION_ROWS.map(({ id, k, v, short, tone }) => (
          <div className={`evid-obs__row t-${tone}`} key={id}>
            <dt>{k}</dt>
            <dd>{short ?? v}</dd>
          </div>
        ))}
      </dl>
      <p className="evid-obs__note">Structured facts from the image. Labels and measurements only — never a verdict.</p>
    </aside>
  );
}

function EvidenceInspection({ phase, reduced, dim }) {
  const tilt = useTilt(reduced);
  const style = tilt
    ? { "--px": `${tilt.px}deg`, "--py": `${tilt.py}deg`, "--drift": `${tilt.drift}px` }
    : undefined;
  return (
    <div className="evid-stage" style={style}>
      <div className="evid-frame">
        <div className="evid-frame__panel">
          <div className="evid-frame__img-box">
            <EvidenceImage />
            <EvidenceMarks phase={phase} dim={dim} />
            <span className="evid-chip evid-chip--quality">
              <b>IMAGE QUALITY</b>
              <em>good</em>
            </span>
            <span className="evid-chip evid-chip--occlusion">
              <b>OCCLUSION</b>
              <em>unknown</em>
            </span>
            <span className="evid-frame__scan" aria-hidden="true" />
            <span className="evid-frame__topbar" aria-hidden="true">
              <span>FRAME · EVID.001</span>
              <span>SCHEMATIC</span>
            </span>
            <span className="evid-frame__badge">PHOTO WITHHELD FOR PRIVACY</span>
            <span className="evid-frame__meta">RECORDED RUN · ap-south-1 · 2026-09-20</span>
          </div>
        </div>
      </div>

      <svg className="evid-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="w-claim" d="M17,15 C24,26 32,37 44,46" />
        <path className="w-obs" d="M46,52 C40,55 32,54 27,52" />
        <path className="w-result" d="M52,60 C60,71 72,78 82,79" />
      </svg>

      <aside className="evid-claim is-active">
        <div className="evid-panel__head">
          <span>CLAIM</span>
          <span className="evid-panel__tag">e-CHALLAN</span>
        </div>
        <p className="evid-claim__quote">“Riding without helmet”</p>
        <span className="evid-claim__mono">CANONICAL · WITHOUT_HELMET</span>
      </aside>

      <ObsPanel phase={phase} />

      <aside className={`evid-result ${phase >= 5 ? "is-active" : ""}`}>
        <div className="evid-panel__head">
          <span>RESULT · DETERMINISTIC</span>
          <span className="evid-panel__tag evid-panel__tag--orange">UNCERTAIN</span>
        </div>
        <strong className="evid-result__title">Insufficient evidence</strong>
        <p className="evid-result__line">
          Vehicle type unresolved; helmet use not established. The rule engine will not guess.
        </p>
      </aside>
    </div>
  );
}

function EvidenceImage() {
  return <img src={EVIDENCE_FRAME} alt="" aria-hidden="true" draggable="false" />;
}

function CapabilityCells({ hidden }) {
  return (
    <div className="evid-strip__group" aria-hidden={hidden || undefined}>
      <div className="evid-strip__cell">
        <span className="evid-strip__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8Z" />
            <circle cx="8" cy="8" r="2" />
          </svg>
        </span>
        <p>
          <b>Visual observation</b>
          <span>Amazon Rekognition · DetectLabels</span>
        </p>
      </div>
      <div className="evid-strip__cell">
        <span className="evid-strip__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5.5v7M13 5.5v7M1.5 5.5h13M5 5.5V4M8 5.5V4M11 5.5V4M4 8.5h1M7 8.5h1" />
          </svg>
        </span>
        <p>
          <b>Deterministic evaluation</b>
          <span>Application rule engine</span>
        </p>
      </div>
      <div className="evid-strip__cell">
        <span className="evid-strip__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 8.5 3 3L13 4.5" />
          </svg>
        </span>
        <p>
          <b>Transparent results</b>
          <span>No guesswork · doubt stays visible</span>
        </p>
      </div>
    </div>
  );
}

export function CapabilityStrip() {
  return (
    <div className="evid-strip" aria-label="ChallanCheck capabilities">
      <div className="evid-strip__track">
        <CapabilityCells />
        <CapabilityCells hidden />
        <CapabilityCells hidden />
        <CapabilityCells hidden />
      </div>
    </div>
  );
}

function StoryRail({ beat }) {
  const active = Math.min(4, Math.floor((beat * 5) / 8));
  return (
    <ol className="evid-rail" aria-label="ChallanCheck review steps">
      {STEP_LABELS.map((s, i) => (
        <li key={s} className={`evid-rail__step ${i === active ? "is-active" : ""}`}>
          <span className="evid-rail__no">{String(i + 1).padStart(2, "0")}</span>
          <span className="evid-rail__name">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function StepRow() {
  return (
    <p className="hero-steprow" aria-hidden="true">
      {STEP_LABELS.map((s, i) => (
        <span key={s}>
          <i>{String(i + 1).padStart(2, "0")}</i>
          {s}
          {i < STEP_LABELS.length - 1 && <em>→</em>}
        </span>
      ))}
    </p>
  );
}

function BeatBlock({ beat, index, isActive }) {
  return (
    <div className={`story-beat ${isActive ? "is-active" : ""}`} data-beat={index} aria-hidden={!isActive}>
      <div className="story-beat__head">
        <span className="story-beat__kicker">{beat.kicker}</span>
        <span className="story-beat__tag">{beat.tag}</span>
      </div>
      <h2 className="story-beat__title">
        {beat.title.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </h2>
      <p className="story-beat__body">{beat.body}</p>
      <div className="story-beat__ctas">
        <a className="land-btn land-btn--primary" href={REVIEW_HREF}>
          Review an Evidence
          <span className="land-btn__arrow" aria-hidden="true">
            →
          </span>
        </a>
        <a className="land-btn land-btn--ghost" href="#workflow">
          See how it works
        </a>
      </div>
    </div>
  );
}

/** Subtle pointer parallax for the evidence frame. Off for touch + reduced motion. */
function useTilt(reduced) {
  const disabled =
    reduced || typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches;
  const [vals, setVals] = useState(() =>
    disabled ? { px: 0, py: 0, drift: 0 } : { px: 2.4, py: -4.2, drift: 0 },
  );
  useEffect(() => {
    if (disabled) return undefined;
    let raf = 0;
    const onMove = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const px = ((e.clientY - cy) / cy) * -2.2;
        const py = ((e.clientX - cx) / cx) * 3.4;
        const drift = ((e.clientX - cx) / cx) * 7;
        setVals((v) => (Math.abs(v.px - px) < 0.05 && Math.abs(v.py - py) < 0.05 ? v : { px, py, drift }));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [disabled]);
  return vals;
}

export default function HeroStory() {
  const sectionRef = useRef(null);
  const desktop = useMediaQuery("(min-width: 1025px)");
  const reduced = useReducedMotion();
  const { beat } = useScrollProgress(sectionRef, HERO_STORY_BEATS);
  const scrollStory = desktop && !reduced;
  const phase = scrollStory ? beat : HERO_STORY_BEATS.length - 1;

  return (
    <section
      ref={sectionRef}
      id="product"
      className={`hero-story ${reduced ? "is-reduced" : ""}`}
      aria-label="How ChallanCheck checks an e-Challan"
      style={scrollStory ? { height: "var(--story-h, 640vh)" } : undefined}
    >
      <div className={`hero-story__sticky ${scrollStory ? "" : "hero-story__static"}`}>
        <div className="evid-bg" aria-hidden="true" />

        <div className="hero-story__grid">
          <div className="story-copy">
            {HERO_STORY_BEATS.map((b, i) => (
              <BeatBlock
                key={b.kicker}
                beat={b}
                index={i}
                isActive={scrollStory ? i === beat : i === 0}
              />
            ))}
            {!scrollStory && <StepRow />}
          </div>

          <EvidenceInspection beat={beat} phase={phase} reduced={!scrollStory} dim={scrollStory ? beat >= 5 : false} />
        </div>

        {scrollStory && <StoryRail beat={beat} />}
        <CapabilityStrip />
      </div>
    </section>
  );
}