import { Link } from "react-router-dom";
import TechnicalApproachSection from "./sections/TechnicalApproachSection";
import "./hero.css";
import "./home.css";

/**
 * Standalone page for the engineering-facing pipeline detail, kept off the
 * landing flow. Reuses TechnicalApproachSection verbatim.
 */
export default function ArchitecturePage() {
  return (
    <div className="ciq-home">
      <nav className="ciq-section ciq-section--base" style={{ paddingBottom: 0 }}>
        <div className="ciq-container">
          <Link className="ciq-eyebrow" to="/" style={{ textDecoration: "none" }}>
            ← Back to Charter-IQ
          </Link>
        </div>
      </nav>

      <TechnicalApproachSection />

      <div className="ciq-section ciq-section--base" style={{ paddingTop: 0 }}>
        <div className="ciq-container">
          <Link className="ciq-btn ciq-btn--ghost" to="/dashboard">
            Launch dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
