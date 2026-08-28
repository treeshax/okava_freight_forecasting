import { Suspense, lazy, useState, Component } from "react";
import { Link } from "react-router-dom";
import { isWebGLAvailable } from "./webgl";
import HeroFallback from "./HeroFallback";
import "./hero.css";

// The Three.js scene (three + r3f + the GLB) is code-split so it never blocks
// first paint of the page.
const ShipHeroScene = lazy(() => import("./ShipHeroScene"));

/** Swap in the CSS fallback if anything in the 3D scene throws. */
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.warn("[Charter-IQ] hero scene failed, using fallback:", err);
  }
  render() {
    if (this.state.failed) return <HeroFallback />;
    return this.props.children;
  }
}

export default function Hero() {
  // No SSR in this Vite app, so probing WebGL during the first render is safe.
  const [webgl] = useState(isWebGLAvailable);

  return (
    <section className="ciq-hero">
      <div className="ciq-hero__scene">
        {/* CSS ocean always paints first; the canvas draws over it when ready */}
        <HeroFallback />
        {webgl && (
          <div className="ciq-hero__canvas">
            <SceneBoundary>
              <Suspense fallback={null}>
                <ShipHeroScene />
              </Suspense>
            </SceneBoundary>
          </div>
        )}
        <div className="ciq-hero__vignette" />
      </div>

      <div className="ciq-hero__content">
        <p className="ciq-hero__eyebrow">
          Smart India Hackathon 2026 · SAIL — Ministry of Steel
        </p>
        <h1 className="ciq-hero__wordmark">
          CHARTER<span>·</span>IQ
        </h1>
        <p className="ciq-hero__subhead">
          AI freight forecasting and vessel chartering intelligence for bulk
          steel-raw-material procurement — read the market before you fix the
          ship.
        </p>
        <div className="ciq-hero__actions">
          <Link className="ciq-btn ciq-btn--primary" to="/dashboard">
            Launch dashboard
          </Link>
          <a className="ciq-btn ciq-btn--ghost" href="#platform">
            How it works
          </a>
        </div>
      </div>

      <div className="ciq-hero__credit">
        Ship model: “Cruisership 2012” by Herminio Nieves — used with credit
      </div>
    </section>
  );
}
