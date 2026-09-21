import { useEffect, useRef, useState } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useInView(ref, { rootMargin = "0px" } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

/** Observe scroll progress (0..1) of a tall section; also returns the current beat index. */
export function useScrollProgress(ref, beats, { mobile: _mobile = false } = {}) {
  const progress = useRef(0);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        progress.current = 0;
        return;
      }
      const p = Math.min(1, Math.max(0, -rect.top / total));
      progress.current = p;
      const next = Math.min(beats.length - 1, Math.floor(p * beats.length));
      setBeat((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, beats.length]);
  return { progress, beat };
}

/** Generic IntersectionObserver entrance animation config. */
export function useReveal(threshold = 0.18) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, shown };
}