import { useEffect, useRef, useState } from "react";
import { EVIDENCE_FRAME, EVIDENCE_FRAME_ALT } from "./evidenceFrame.js";

/** The schematic evidence frame (not a photograph) — one image, every section. */
export function EvidenceArt({ blur = 0, alt = EVIDENCE_FRAME_ALT, className = "" }) {
  const style = blur > 0 ? { filter: `blur(${blur}px) saturate(0.9)` } : undefined;
  return (
    <img
      className={`evidence-art ${className}`}
      src={EVIDENCE_FRAME}
      alt={alt}
      loading="lazy"
      width="900"
      height="675"
      style={style}
    />
  );
}

/** Fades + lifts children in when scrolled into view. */
export function Reveal({ children, className = "", as: Tag = "div", styleDelay = 0, style = {} }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(
    () => typeof window === "undefined" || !("IntersectionObserver" in window),
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      role={Tag === "li" ? undefined : undefined}
      className={`land-reveal ${shown ? "is-shown" : ""} ${className}`}
      style={{ "--_delay": `${styleDelay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, className = "" }) {
  return <span className={`eyebrow land-eyebrow ${className}`}>{children}</span>;
}