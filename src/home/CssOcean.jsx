/**
 * Pure CSS/SVG cinematic ocean. Used two ways:
 *   - as the hero fallback when WebGL is unavailable or the 3D scene fails
 *   - as the calmer backdrop for the closing CTA section
 *
 * Same palette as the live scene: near-black base, deep purple, one amber beacon.
 * All motion is disabled under prefers-reduced-motion (see hero.css / home.css).
 */
export default function CssOcean({ variant = "hero" }) {
  return (
    <div className={`ciq-cssocean ciq-cssocean--${variant}`} aria-hidden="true">
      <div className="ciq-cssocean__sky" />
      <div className="ciq-cssocean__glow" />
      <div className="ciq-cssocean__haze" />

      <div className="ciq-cssocean__sea">
        <div className="ciq-cssocean__reflection" />
        <span className="ciq-cssocean__wave" />
        <span className="ciq-cssocean__wave" />
        <span className="ciq-cssocean__wave" />
        <span className="ciq-cssocean__wave" />
      </div>

      {variant === "hero" && (
        <svg
          className="ciq-cssocean__ship"
          viewBox="0 0 640 200"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id="ciqHull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4A3F63" />
              <stop offset="0.55" stopColor="#1B1030" />
              <stop offset="1" stopColor="#0A0714" />
            </linearGradient>
          </defs>
          {/* bulk-carrier silhouette — single rigid shape, amber rim on top */}
          <path
            d="M20 132 L70 132 L86 150 L560 150 L560 120 L602 120 L602 150 L616 150
               L604 176 L120 176 L96 168 L44 168 Z"
            fill="url(#ciqHull)"
          />
          <path
            d="M150 132 L150 108 L188 108 L188 132 M214 132 L214 96 L238 96 L238 132
               M262 132 L262 104 L286 104 L286 132 M470 132 L470 82 L512 82 L512 132"
            stroke="#1B1030"
            strokeWidth="10"
            fill="none"
          />
          <path
            d="M20 132 L70 132 L86 150 L560 150 L560 120 L602 120 L602 150 L616 150"
            stroke="#D9A441"
            strokeWidth="2.5"
            fill="none"
            opacity="0.85"
          />
          {/* amber glow reflection on the water directly under the hull */}
          <ellipse
            cx="320"
            cy="188"
            rx="230"
            ry="9"
            fill="#D9A441"
            opacity="0.16"
          />
        </svg>
      )}

      <div className="ciq-cssocean__vignette" />
    </div>
  );
}
