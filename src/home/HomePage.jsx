import Hero from "./Hero";
import ProblemSection from "./sections/ProblemSection";
import ShiftSection from "./sections/ShiftSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import TechnicalApproachSection from "./sections/TechnicalApproachSection";
import ImpactSection from "./sections/ImpactSection";
import DifferentiatorsSection from "./sections/DifferentiatorsSection";
import CtaSection from "./sections/CtaSection";
import "./home.css";

/**
 * Charter-IQ marketing homepage. Each section is its own component (in
 * ./sections) so they can be reordered or edited independently. Nothing here
 * imports or mutates the dashboard.
 */
export default function HomePage() {
  return (
    <div className="ciq-home">
      <Hero />
      <ProblemSection />
      <hr className="ciq-hairline" />
      <ShiftSection />
      <HowItWorksSection />
      <TechnicalApproachSection />
      <ImpactSection />
      <DifferentiatorsSection />
      <CtaSection />
    </div>
  );
}
