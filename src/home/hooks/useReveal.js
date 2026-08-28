import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../webgl";

/**
 * Scroll-triggered reveal. Returns a ref + a boolean; attach the ref to a
 * section and use the boolean to toggle a `.is-visible` class. Fires once.
 * Under prefers-reduced-motion the element starts visible (no animation).
 */
export function useReveal({ threshold = 0.18, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, threshold, rootMargin]);

  return [ref, visible];
}
