import Hero from "./Hero";
import ProblemSection from "./sections/ProblemSection";
import ShiftSection from "./sections/ShiftSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import ImpactSection from "./sections/ImpactSection";
import DifferentiatorsSection from "./sections/DifferentiatorsSection";
import CtaSection from "./sections/CtaSection";
import "./home.css";

/**
 * Charter-IQ marketing homepage. Each section is its own component (in
 * ./sections) so they can be reordered or edited independently. Nothing here
 * imports or mutates the dashboard.
 *
 * Final section order:
 *   1. Hero  2. The problem  3. The shift  4. How Charter-IQ works
 *   5. Projected impact  6. What sets us apart  7. CTA
 *
 * The engineering-heavy "Technical approach" pipeline lives on its own page
 * (/architecture → TechnicalApproachSection) rather than in the landing flow.
 */
export default function HomePage() {
  return (
    <div className="ciq-home">
      <Hero />
      <ProblemSection />
      <hr className="ciq-hairline" />
      <ShiftSection />
      <HowItWorksSection />
      <ImpactSection />
      <DifferentiatorsSection />
      <CtaSection />
    </div>
  );
}
