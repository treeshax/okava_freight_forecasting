import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "../webgl";

/**
 * Quiet count-up. Once `active` is true, animates the single number in `text`
 * from 0 → its value (one time), keeping any prefix/suffix ("100%" → 0…100%).
 * Ranges ("85–90%", "₹45–60 Cr") read badly mid-count, so they're left alone.
 * Reduced-motion users never see the animation.
 */
export function useCountUp(text, active, duration = 900) {
  const target = useMemo(() => parseTarget(text), [text]);
  const [num, setNum] = useState(target ? target.value : 0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current || !target || prefersReducedMotion()) return;
    started.current = true;

    const start = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setNum(Number((target.value * eased).toFixed(target.decimals)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  if (!target) return text;
  return text.replace(target.raw, num.toFixed(target.decimals));
}

function parseTarget(text) {
  if (/\d\s*[–—-]\s*\d/.test(text)) return null; // it's a range
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  return {
    raw: match[0],
    value: parseFloat(match[0]),
    decimals: (match[0].split(".")[1] || "").length,
  };
}
