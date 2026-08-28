import Reveal from "../Reveal";

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function ModelIcon() {
  return (
    <svg className="ciq-pillar__icon" viewBox="0 0 24 24" {...S}>
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  );
}
function PortalIcon() {
  return (
    <svg className="ciq-pillar__icon" viewBox="0 0 24 24" {...S}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 13h5M8 16h8" />
    </svg>
  );
}
function RadarIcon() {
  return (
    <svg className="ciq-pillar__icon" viewBox="0 0 24 24" {...S}>
      <path d="M12 12L19 5" />
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M12 8a4 4 0 1 0 4 4" />
    </svg>
  );
}

const PILLARS = [
  {
    n: "01",
    Icon: ModelIcon,
    title: "Advanced AI model",
    points: [
      "Rules out vessel–port pairings that break draft or LOA limits, so every recommendation is physically feasible",
      "Predicts 30–90 day freight trends so you can act on the market weeks ahead",
      "Signals when to book and when to wait, to maximize landed savings",
    ],
  },
  {
    n: "02",
    Icon: PortalIcon,
    title: "Portal",
    points: [
      "Shows real-time landed costs ($/MT) for importing coal from origin countries",
      "Recommends optimal laycan windows to lock in lowest rates before price spikes",
      "Compares multi-country sourcing routes to instantly surface the cheapest option",
    ],
  },
  {
    n: "03",
    Icon: RadarIcon,
    title: "Port & risk intelligence radar",
    points: [
      "Monitors real-time anchorage queues and turnaround times across East Coast ports",
      "Issues early cyclone alerts for the Bay of Bengal to prevent supply disruptions",
      "Calculates daily demurrage exposure to eliminate costly vessel idle penalties",
    ],
  },
];

export default function HowItWorksSection() {
  return (
    <section id="platform" className="ciq-section ciq-section--surface">
      <div className="ciq-container">
        <Reveal>
          <p className="ciq-eyebrow">How Charter-IQ works</p>
          <p className="ciq-section__lead ciq-section__lead--wide">
            Three capabilities, one decision loop — from what's possible to what's
            profitable to what's at risk.
          </p>
        </Reveal>

        <div className="ciq-pillars">
          {PILLARS.map(({ n, Icon, title, points }, i) => (
            <Reveal key={n} className="ciq-pillar" delay={Math.min(3, i)}>
              <Icon />
              <div className="ciq-pillar__num">{n}</div>
              <h3>{title}</h3>
              <ul>
                {points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
