import Reveal from "../Reveal";

const STAGES = [
  {
    label: "Data sources",
    nodes: ["Market / commodity data", "Ops / environmental data", "Risk signal feeds"],
  },
  {
    label: "Ingestion",
    nodes: ["Data ingestion + rule engine"],
  },
  {
    label: "Engines",
    nodes: ["Rate forecast engine", "Vessel-port matching", "Idle-time & risk engine"],
  },
  {
    label: "Output",
    nodes: ["Decision dashboard — ranked recommendations, reasoning trace, confidence bands"],
    out: true,
  },
];

export default function TechnicalApproachSection() {
  return (
    <section className="ciq-section ciq-section--base">
      <div className="ciq-container">
        <Reveal>
          <p className="ciq-eyebrow">Technical approach</p>
          <p className="ciq-section__lead ciq-section__lead--wide">
            A pipeline, not a black box — every recommendation is traceable back to
            its inputs.
          </p>
        </Reveal>

        <Reveal className="ciq-pipeline">
          {STAGES.map((stage, i) => (
            <div
              key={stage.label}
              className={`ciq-pipeline__stage${stage.out ? " ciq-pipeline__stage--out" : ""}`}
            >
              <span className="ciq-pipeline__stage-label">{stage.label}</span>
              <div className="ciq-pipeline__nodes">
                {stage.nodes.map((n) => (
                  <span key={n} className="ciq-pipeline__node">
                    {n}
                  </span>
                ))}
              </div>
              {i < STAGES.length - 1 && (
                <div className="ciq-pipeline__connector" aria-hidden="true" />
              )}
            </div>
          ))}
        </Reveal>

        <Reveal>
          <p className="ciq-pipeline__stack">
            Python · XGBoost · LightGBM · Prophet · FastAPI · PostgreSQL · React
          </p>
        </Reveal>
      </div>
    </section>
  );
}
