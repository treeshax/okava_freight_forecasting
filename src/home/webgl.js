/** Lightweight WebGL capability probe for the hero fallback decision. */
export function isWebGLAvailable() {
  if (typeof window === "undefined") return false;

  // Manual override for demos / debugging: ?webgl=off forces the CSS fallback.
  try {
    if (new URLSearchParams(window.location.search).get("webgl") === "off") {
      return false;
    }
  } catch {
    /* ignore */
  }

  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

/** Respect users who asked the OS to tone motion down. */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
