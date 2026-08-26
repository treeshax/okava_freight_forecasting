import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  Eye,
  EyeOff,
  FlaskConical,
  Moon,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { DEMO_SCENARIOS } from "../data/mockData";

const tickers = [
  { label: "BDI", value: "1,603", change: "+2.1%", up: true },
  { label: "Brent", value: "$84.20/bbl", change: "+1.2%", up: true },
  { label: "VLSFO SGP", value: "$598/MT", change: "-0.8%", up: false },
  { label: "Cape TC", value: "$21,400/d", change: "+3.4%", up: true },
  { label: "Pan TC", value: "$16,200/d", change: "+1.8%", up: true },
  { label: "Iron Ore", value: "$104.5/MT", change: "-0.5%", up: false },
  { label: "NWC Coal", value: "$132/MT", change: "+0.7%", up: true },
];

function RateStrip({ visible, onToggle }) {
  if (!visible)
    return (
      <div className="rate-strip rate-strip-collapsed">
        <button
          className="rate-strip-toggle"
          onClick={onToggle}
          title="Show live rates"
          aria-label="Show live rates"
        >
          <Eye size={14} /> Show rates
        </button>
      </div>
    );
  return (
    <div className="rate-strip">
      <span className="rate-strip-label">Live rates</span>
      <div className="rate-strip-track">
        <div className="rate-strip-items">
          {[...tickers, ...tickers].map((ticker, index) => (
            <div className="rate-strip-item" key={`${ticker.label}-${index}`}>
              <span>{ticker.label}</span>
              <strong>{ticker.value}</strong>
              <b className={ticker.up ? "rate-up" : "rate-down"}>
                {ticker.up ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                {ticker.change}
              </b>
            </div>
          ))}
        </div>
      </div>
      <button
        className="rate-strip-toggle"
        onClick={onToggle}
        title="Hide live rates"
        aria-label="Hide live rates"
      >
        <EyeOff size={14} /> Hide rates
      </button>
    </div>
  );
}

export default function Header({
  theme,
  toggleTheme,
  scenario,
  setScenario,
  setActivePortal,
}) {
  const [time, setTime] = useState(new Date());
  const [showRateStrip, setShowRateStrip] = useState(true);
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatted = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return (
    <header className="header-bar">
      <div className="header-main-row">
        <div className="brand-mark">
          <div className="brand-icon">
            <Zap size={16} color="white" />
          </div>
          <div className="brand-copy">
            <strong>
              CHARTER<span>IQ</span>
            </strong>
            <small>SAIL BULK CARGO DECISION SUPPORT</small>
          </div>
        </div>
        <div className="header-divider" />
        <div className="demo-picker">
          <FlaskConical size={14} color="var(--accent-amber)" />
          <select
            aria-label="Quick Demo Scenarios for Judges"
            value={scenario?.label || ""}
            onChange={(event) => {
              const next = Object.values(DEMO_SCENARIOS).find(
                (item) => item.label === event.target.value,
              );
              setScenario(next || null);
              setActivePortal("importer");
            }}
          >
            <option value="">Quick Demo Scenarios for Judges</option>
            {Object.values(DEMO_SCENARIOS).map((item) => (
              <option key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </div>
        <div className="header-actions">
          <div className="live-clock">
            <i />
            {formatted} IST
          </div>
          <button
            className="btn-icon"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button className="btn-icon" title="Notifications">
            <Bell size={15} />
            <em>3</em>
          </button>
          <div className="avatar" title="Akhilesh M. - Head Procurement">
            AM
          </div>
        </div>
      </div>
      <RateStrip
        visible={showRateStrip}
        onToggle={() => setShowRateStrip((value) => !value)}
      />
    </header>
  );
}
