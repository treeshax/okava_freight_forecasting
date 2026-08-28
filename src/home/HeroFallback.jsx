import CssOcean from "./CssOcean";

/** Hero backdrop when WebGL is unavailable or the 3D scene fails / is still loading. */
export default function HeroFallback() {
  return <CssOcean variant="hero" />;
}
