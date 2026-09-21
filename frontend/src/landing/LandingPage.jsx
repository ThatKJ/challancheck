import LandingNav from "./LandingNav.jsx";
import HeroStory from "./HeroStory.jsx";
import ProblemSection from "./ProblemSection.jsx";
import WorkflowSection from "./WorkflowSection.jsx";
import DecisionSection from "./DecisionSection.jsx";
import UncertaintySection from "./UncertaintySection.jsx";
import ClaimsSection from "./ClaimsSection.jsx";
import ProductPreviewSection from "./ProductPreviewSection.jsx";
import ArchitectureSection from "./ArchitectureSection.jsx";
import UnderTheHoodSection from "./UnderTheHoodSection.jsx";
import PrinciplesSection from "./PrinciplesSection.jsx";
import FinalCTA from "./FinalCTA.jsx";
import LandingFooter from "./LandingFooter.jsx";
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="landing" id="top">
      <a className="landing__skip" href="#main-content">
        Skip to content
      </a>
      <LandingNav />
      <main id="main-content" className="landing__main">
        <HeroStory />
        <ProblemSection />
        <WorkflowSection />
        <DecisionSection />
        <UncertaintySection />
        <ClaimsSection />
        <ProductPreviewSection />
        <ArchitectureSection />
        <UnderTheHoodSection />
        <PrinciplesSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}