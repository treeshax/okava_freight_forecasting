/**
 * CSS-only ocean used when WebGL is unavailable or the 3D scene fails to load.
 * Same palette as the live scene: near-black base, deep purple, single amber glow.
 */
export default function HeroFallback() {
  return (
    <div className="ciq-hero__fallback" aria-hidden="true">
      <div className="ciq-hero__fallback-glow" />
      <div className="ciq-hero__fallback-water">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
