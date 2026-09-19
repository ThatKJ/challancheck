import { useEffect, useRef } from "react";

const paths = {
  arrow: "M4 12h15m-6-6 6 6-6 6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  check: "m5 12 4 4L19 6",
  contrast: "M12 3v18M8 5H4v14h4m8-14h4v14h-4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3v4m0 2v1",
  limit: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8",
  image: "M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M15 7h.01",
  close: "m6 6 12 12M6 18 18 6",
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
};

export function Icon({ name = "arrow", size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}

export function TrustNote() {
  return (
    <div className="trust-note">
      <Icon name="shield" />
      <p>
        Evidence consistency, not a legal verdict.
        <span>
          This report does not determine guilt, innocence, or the legal validity
          of a challan.
        </span>
      </p>
    </div>
  );
}

export function ErrorBlock({ error, onDismiss }) {
  const alert = useRef(null);
  useEffect(() => {
    if (error) alert.current?.focus({ preventScroll: true });
  }, [error]);
  if (!error) return null;
  const title =
    error.code === "AWS_NOT_CONFIGURED"
      ? "Live observation is unavailable"
      : error.code === "TIMEOUT"
        ? "The review took too long"
        : "We couldn’t complete this review";
  return (
    <div className="error-block" role="alert" ref={alert} tabIndex={-1}>
      <Icon name="limit" />
      <div>
        <strong>{title}</strong>
        <p>{error.message}</p>
        <small>
          Your inputs are preserved. You can retry or choose a labeled example.
        </small>
        {error.code?.startsWith("AWS") && (
          <p className="mono">Live AWS / Bedrock status: UNKNOWN</p>
        )}
      </div>
      <button
        className="icon-button"
        aria-label="Dismiss error"
        onClick={onDismiss}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}

export function EvidenceViewer({ file, compact = false }) {
  const preview = useRef(null);
  const expanded = useRef(null);
  const dialog = useRef(null);
  const frame = useRef(null);
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (preview.current) preview.current.src = objectUrl;
    if (expanded.current) expanded.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  useEffect(() => {
    // Subtle pointer parallax on the evidence plane: desktop pointers only,
    // disabled entirely under prefers-reduced-motion. Progressive enhancement —
    // without it the viewer is a static framed image.
    const el = frame.current;
    if (!el || !file) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [file]);
  return (
    <div
      ref={frame}
      className={`evidence-viewer ${compact ? "compact" : ""} ${file ? "has-image" : ""}`}
    >
      {file ? (
        <>
          <img
            key={`${file.name}-${file.size}-${file.lastModified}`}
            ref={preview}
            alt={`Uploaded evidence: ${file.name}`}
          />
          <button
            className="expand-button"
            type="button"
            onClick={() => dialog.current.showModal()}
          >
            <Icon name="expand" /> Expand evidence
          </button>
          <dialog
            ref={dialog}
            className="image-dialog"
            aria-label="Expanded evidence"
            onClick={(e) => {
              if (e.target === e.currentTarget) dialog.current.close();
            }}
          >
            <button
              type="button"
              className="icon-button"
              aria-label="Close evidence"
              onClick={() => dialog.current.close()}
            >
              <Icon name="close" />
            </button>
            <img ref={expanded} alt={`Expanded evidence: ${file.name}`} />
          </dialog>
        </>
      ) : (
        <div className="evidence-empty">
          <span className="image-mark">
            <Icon name="image" size={32} />
          </span>
          <strong>No source photograph</strong>
          <p>
            This example contains structured fixture observations only. No image
            was analyzed.
          </p>
          <span className="eyebrow">DEVELOPMENT FIXTURE · NON-LIVE</span>
        </div>
      )}
    </div>
  );
}
