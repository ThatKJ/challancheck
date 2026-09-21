import { useEffect, useRef, useState } from "react";
import App from "./App.jsx";
import LandingPage from "./landing/LandingPage.jsx";

// Tiny hash router with exactly two destinations:
//   #/  (default)  -> the product landing page
//   #/review       -> the existing review application (App.jsx), untouched
// The review app keeps its original URL-independent behaviour; the landing
// page only ever forwards to it via <a href="#/review">.
function parseRoute(current) {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash.startsWith("review")) return "review";
  // The review app's skip link targets "#main". That is an in-page anchor, not a
  // route: stay in the app instead of bouncing the user back to the landing page.
  if (hash === "main" && current === "review") return "review";
  return "landing";
}

export default function Root() {
  const [route, setRoute] = useState(() => parseRoute("landing"));
  useEffect(() => {
    const onChange = () => setRoute((current) => parseRoute(current));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  // Entering the app from the bottom of the (very tall) landing page would otherwise leave the
  // window scrolled to wherever the shorter app page clamps it, instead of at its top.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current && route === "review") window.scrollTo(0, 0);
    mounted.current = true;
  }, [route]);
  if (route === "review") return <App />;
  return <LandingPage />;
}
