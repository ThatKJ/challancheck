import { FOOTER_LINKS } from "./content.js";

export default function LandingFooter() {
  return (
    <footer className="land-footer" aria-label="Footer">
      <div className="land-container land-footer__inner">
        <div className="land-footer__brand">
          <span className="land-footer__name">
            Challan<span>Check</span>
          </span>
          <p>Evidence consistency for e-Challans.</p>
        </div>
        <nav className="land-footer__links" aria-label="Footer links">
          {FOOTER_LINKS.map((link) =>
            link.href.startsWith("http") ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ) : (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ),
          )}
        </nav>
      </div>
      <div className="land-container land-footer__legal">
        <span>Observations are not legal conclusions.</span>
        <span>AWS · Amazon Rekognition · deterministic evaluation</span>
      </div>
    </footer>
  );
}