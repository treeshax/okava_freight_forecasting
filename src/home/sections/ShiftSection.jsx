import Reveal from "../Reveal";

export default function ShiftSection() {
  return (
    <section className="ciq-section ciq-section--base ciq-shift">
      <div className="ciq-container">
        <Reveal>
          <p className="ciq-shift__quote">
            We turn <em>“check the market every day and hope”</em> into{" "}
            <em>“know the market weeks out and act.”</em>
          </p>
          <hr className="ciq-shift__rule" />
        </Reveal>
      </div>
    </section>
  );
}
