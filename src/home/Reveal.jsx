import { useReveal } from "./hooks/useReveal";

/** Wraps children in a scroll-reveal container (see .ciq-reveal in home.css). */
export default function Reveal({ as: Tag = "div", delay, className = "", children, ...rest }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      data-delay={delay}
      className={`ciq-reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
