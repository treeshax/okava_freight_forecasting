import Reveal from "../Reveal";

const FACTS = [
  {
    title: "Demurrage delays",
    body: "$10,000–$30,000 daily penalties; a 5-day Capesize wait risks a $125,000 loss.",
  },
  {
    title: "Fuel price swings",
    body: "25–50% of shipping costs; sudden price jumps break the budget.",
  },
  {
    title: "Capacity mismatch",
    body: "Deadfreight penalties for unused cargo space, or spiking per-tonne rates on split orders.",
  },
  {
    title: "Infrastructure limits",
    body: "Costly double-handling, lighterage, or short-loading when a vessel exceeds a port's draft.",
  },
  {
    title: "Reactive chartering",
    body: "Unexpected spot rate spikes during peak demand destroy forecasted margins.",
  },
];

export default function ProblemSection() {
  return (
    <section id="problem" className="ciq-section ciq-section--base">
      <div className="ciq-container">
        <Reveal>
          <p className="ciq-eyebrow">The problem</p>
          <p className="ciq-section__lead ciq-section__lead--wide">
            SAIL's East Coast coal imports rely on reactive, day-by-day spot
            chartering — no freight-rate foresight, no port-capability checks.
          </p>
        </Reveal>

        <div className="ciq-problem__grid">
          {FACTS.map((f, i) => (
            <Reveal
              key={f.title}
              className="ciq-problem__card"
              delay={Math.min(3, i)}
            >
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
