import Reveal from "../Reveal";

const ITEMS = [
  {
    title: "Two-layer hybrid architecture",
    body: "Charter-IQ prunes physically impossible routes (draft/LOA limits) before forecasting, preventing impossible charter recommendations.",
  },
  {
    title: "PSU-tailored engine",
    body: "Solves India-specific port constraints and SAIL's plant supply chains where generic global freight tools fail.",
  },
];

export default function DifferentiatorsSection() {
  return (
    <section className="ciq-section ciq-section--base">
      <div className="ciq-container">
        <Reveal>
          <p className="ciq-eyebrow">What sets us apart</p>
        </Reveal>
        <div className="ciq-apart__grid">
          {ITEMS.map((it, i) => (
            <Reveal key={it.title} className="ciq-apart__card" delay={Math.min(3, i)}>
              <h3>{it.title}</h3>
              <p>{it.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
