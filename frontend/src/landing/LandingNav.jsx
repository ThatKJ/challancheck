import { useEffect, useRef, useState } from "react";
import { NAV, REVIEW_HREF } from "./content.js";

const LOGO_PATH =
  "M12 3v18M8 5H4v14h4m8-14h4v14h-4";

function Wordmark() {
  return (
    <a className="land-nav__brand" href="#top" aria-label="ChallanCheck — home">
      <span className="land-nav__mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={LOGO_PATH} />
        </svg>
      </span>
      <span className="land-nav__name">
        Challan<span>Check</span>
      </span>
    </a>
  );
}

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const menuClose = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      if (Math.abs(p - progressRef.current) > 0.003) {
        progressRef.current = p;
        setProgress(p);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const el = menuClose.current;
    if (!el) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) document.body.classList.add("land-menu-open");
    else document.body.classList.remove("land-menu-open");
    return () => document.body.classList.remove("land-menu-open");
  }, [open]);

  return (
    <header className={`land-nav ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="land-nav__inner">
        <Wordmark />
        <nav className="land-nav__links" aria-label="Sections">
          {NAV.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="land-nav__right">
          <a className="land-nav__cta" href={REVIEW_HREF}>
            Try ChallanCheck
          </a>
          <button
            className="land-nav__toggle"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <nav id="landing-menu" className="land-nav__menu" aria-label="Mobile sections">
        {NAV.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        <a className="land-nav__menu-cta" href={REVIEW_HREF} onClick={() => setOpen(false)}>
          Try ChallanCheck
        </a>
      </nav>
      <div ref={menuClose} className="empty" />
      <div className="land-nav__progress" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
    </header>
  );
}