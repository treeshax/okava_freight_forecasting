import { Link } from "react-router-dom";
import CssOcean from "../CssOcean";
import Reveal from "../Reveal";

export default function CtaSection() {
  return (
    <section className="ciq-section ciq-cta ciq-section--base">
      <div className="ciq-cta__ocean">
        <CssOcean variant="calm" />
      </div>
      <Reveal className="ciq-cta__inner">
        <p className="ciq-cta__kicker">See it in action</p>
        <h2 className="ciq-cta__title">Enter the platform</h2>
        <Link className="ciq-btn ciq-btn--primary" to="/dashboard">
          Launch dashboard
        </Link>
      </Reveal>
    </section>
  );
}
