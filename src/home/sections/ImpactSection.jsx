import Reveal from "../Reveal";
import { useReveal } from "../hooks/useReveal";
import { useCountUp } from "../hooks/useCountUp";

const FORECASTING = [
  { value: "85–90%", label: "prediction accuracy in 30–90 day freight forecasting" },
  { value: "8–12%", label: "reduction in average landed $/MT costs" },
  { value: "100%", label: "elimination of draft/LOA port violations" },
];

const OPERATIONS = [
  { value: "40–50%", label: "shift from spot deals to multi-voyage contracts" },
  { value: "30–40%", label: "reduction in vessel idle time and demurrage" },
  { value: "₹45–60 Cr", label: "projected annual freight savings" },
  { value: "15–20%", label: "faster berth clearance via rerouting" },
];

function Stat({ value, label, active }) {
  const display = useCountUp(value, active);
  return (
    <div className="ciq-stat">
      <div className="ciq-stat__value">{display}</div>
      <p className="ciq-stat__label">{label}</p>
    </div>
  );
}

function StatGroup({ subhead, stats, columns }) {
  const [ref, visible] = useReveal();
  return (
    <div className="ciq-impact__group" ref={ref}>
      <p className="ciq-impact__subhead">{subhead}</p>
      <div className={`ciq-impact__grid ciq-impact__grid--${columns}`}>
        {stats.map((s) => (
          <Stat key={s.label} {...s} active={visible} />
        ))}
      </div>
    </div>
  );
}

export default function ImpactSection() {
  return (
    <section className="ciq-section ciq-section--surface">
      <div className="ciq-container">
        <Reveal>
          <p className="ciq-eyebrow">Projected impact</p>
          <p className="ciq-section__lead ciq-section__lead--wide">
            What Charter-IQ is expected to move, once it's running against SAIL's
            East Coast flows.
          </p>
        </Reveal>

        <StatGroup subhead="Forecasting & algorithm" stats={FORECASTING} columns="3" />
        <StatGroup subhead="Operations" stats={OPERATIONS} columns="4" />

        <Reveal>
          <p className="ciq-section__note">
            Directional estimates from published freight-forecasting literature and
            route benchmarking — to be validated against SAIL pilot data.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
