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
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "alert",
      title: "Haldia Monsoon Draft Restriction",
      desc: "Riverine draft capped at 8.0m. Capesize & loaded Panamax require lightering at Sagar Sandheads.",
      time: "10m ago",
      read: false,
    },
    {
      id: 2,
      type: "warning",
      title: "Richards Bay Anchorage Surge",
      desc: "7 bulk carriers queued at RBCT. Expected turnaround delay: +48 hours.",
      time: "45m ago",
      read: false,
    },
    {
      id: 3,
      type: "info",
      title: "RL Policy Calibration Complete",
      desc: "PPO verification pass updated confidence intervals and model weights for 14d horizon.",
      time: "2h ago",
      read: false,
    },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const formatted = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <header className="header-bar" style={{ position: "relative" }}>
      <div className="header-main-row">
        <div className="brand-mark" style={{ cursor: "pointer" }} onClick={() => setActivePortal("importer")}>
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
          
          {/* Notifications Button */}
          <div style={{ position: "relative" }}>
            <button
              className="btn-icon"
              title="Notifications"
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowProfile(false);
              }}
              style={{ position: "relative" }}
            >
              <Bell size={15} />
              {unreadCount > 0 && <em>{unreadCount}</em>}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  top: "120%",
                  right: 0,
                  width: 340,
                  background: "var(--bg-card, #1e293b)",
                  border: "1px solid var(--border-color, #334155)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border-color, #334155)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>
                    Operational Alerts ({unreadCount})
                  </strong>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent-primary, #38bdf8)",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: "10px 14px",
                        borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                        background: n.read ? "transparent" : "rgba(56, 189, 248, 0.05)",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (!n.read) {
                          setNotifications((prev) =>
                            prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
                          );
                          setUnreadCount((c) => Math.max(0, c - 1));
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: n.type === "alert" ? "#ef4444" : n.type === "warning" ? "#f59e0b" : "#38bdf8",
                          }}
                        >
                          {n.title}
                        </span>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{n.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                        {n.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div style={{ position: "relative" }}>
            <div
              className="avatar"
              title="Akhilesh M. - Head Procurement"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setShowProfile((prev) => !prev);
                setShowNotifications(false);
              }}
            >
              AM
            </div>

            {/* Profile Popover */}
            {showProfile && (
              <div
                style={{
                  position: "absolute",
                  top: "120%",
                  right: 0,
                  width: 250,
                  background: "var(--bg-card, #1e293b)",
                  border: "1px solid var(--border-color, #334155)",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                  zIndex: 9999,
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: "0.85rem" }}>
                    AM
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                      Akhilesh M.
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      Head of Maritime Procurement
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border-color, #334155)", paddingTop: 8, fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  <div>Organization: <strong style={{ color: "var(--text-primary)" }}>SAIL India</strong></div>
                  <div style={{ marginTop: 3 }}>Role: <span className="badge badge-cyan" style={{ fontSize: "0.6rem" }}>HITL Reviewer</span></div>
                </div>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => {
                      setScenario(null);
                      setActivePortal("importer");
                      setShowProfile(false);
                    }}
                    style={{
                      background: "rgba(148,163,184,0.1)",
                      border: "none",
                      color: "var(--text-primary)",
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    🔄 Clear Current Workspace
                  </button>
                </div>
              </div>
            )}
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
