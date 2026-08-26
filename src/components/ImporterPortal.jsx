import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import {
  Brain,
  AlertTriangle,
  Clock,
  Package,
  CheckCircle,
  Shield,
  BarChart2,
  Waves,
  Wind,
  Anchor,
  Loader,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import {
  COMMODITIES,
  ORIGIN_PORTS,
  DEST_PORTS,
  freightRateData,
  eastCoastPorts,
} from "../data/mockData";

/* ── Chart tooltip ─────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-bright)",
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 170,
      }}
    >
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "0.68rem",
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      {payload.map(
        (p, i) =>
          p.value != null && (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                fontSize: "0.76rem",
                marginBottom: 2,
              }}
            >
              <span style={{ color: p.color }}>{p.name}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
                ${p.value.toFixed(1)}/MT
              </span>
            </div>
          ),
      )}
    </div>
  );
};

/* ── Risk row ──────────────────────────────── */
const RiskRow = ({ label, level, value, Icon }) => {
  const color =
    level === "High" ? "#ef4444" : level === "Medium" ? "#f59e0b" : "#10b981";
  const pct = level === "High" ? 78 : level === "Medium" ? 52 : 26;
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} color={color} />
          <span
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {value}
          </span>
          <span
            className={`badge badge-${level === "High" ? "red" : level === "Medium" ? "amber" : "green"}`}
          >
            {level}
          </span>
        </div>
      </div>
      <div className="risk-bar">
        <div
          className="risk-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
          }}
        />
      </div>
    </div>
  );
};

/* ── AI Results ────────────────────────────── */
const AIResults = ({ formData }) => {
  const destPort = eastCoastPorts.find((p) => p.id === formData.destPort);
  const isHaldia = destPort?.id === "HALD";
  const isRichardsBay = formData.originPort === "RICH";
  const isRussianRoute = formData.originPort === "VOST";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Entry Window */}
      <div className="card" style={{ borderColor: "rgba(99,102,241,0.3)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
                marginBottom: 3,
              }}
            >
              AI Market Entry Strategy
            </div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Optimal Charter Window
            </div>
          </div>
          <span
            className={`badge ${isRichardsBay ? "badge-green" : isRussianRoute ? "badge-amber" : "badge-green"}`}
          >
            <CheckCircle size={10} />{" "}
            {isRichardsBay
              ? "WAIT 12 DAYS"
              : isRussianRoute
                ? "RISK REVIEW"
                : "Recommended"}
          </span>
        </div>

        {/* Simple timeline */}
        <div
          style={{
            position: "relative",
            height: 40,
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--bg-primary)",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(239,68,68,0.18) 0 35%, rgba(16,185,129,0.22) 35% 60%, rgba(245,158,11,0.12) 60% 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "37%",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#10b981",
              letterSpacing: "0.04em",
            }}
          >
            ✓ ENTER HERE
          </div>
          <div
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.62rem",
              color: "#ef4444",
              fontWeight: 600,
            }}
          >
            PEAK
          </div>
          <div
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.62rem",
              color: "#f59e0b",
              fontWeight: 600,
            }}
          >
            WATCH
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0.875rem",
          }}
        >
          {[
            {
              label: "Recommended Entry",
              value: isRichardsBay ? "WAIT 12 DAYS" : "12–15 Days",
              sub: isRichardsBay ? "Projected drop $2.40/MT" : "Sep 7–10",
              color: "#10b981",
            },
            {
              label: "Projected Savings",
              value: isRichardsBay ? "~14.8%" : "~8.5%",
              sub: "vs. today's spot",
              color: "#10b981",
            },
            {
              label: "Forecast Confidence",
              value: "87.3%",
              sub: "model accuracy",
              color: "#f59e0b",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-primary)",
                borderRadius: 10,
                padding: "0.875rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "rgba(99,102,241,0.05)",
            borderRadius: 9,
            borderLeft: "3px solid var(--accent-primary)",
          }}
        >
          <p
            style={{
              fontSize: "0.76rem",
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>
              AI Insight:
            </strong>{" "}
            {isRussianRoute
              ? "Sanctions screening and war-risk insurance premiums require approval before fixture."
              : isRichardsBay
                ? "Atlantic vessel repositioning creates a favorable wait window. Rates on Richards Bay → Vizag are forecast to soften $2.40/MT."
                : `BDI correction expected in 10–14 days as Atlantic basin vessels reposition to Pacific. Rates on ${formData.originPortName || "selected route"} → India EC forecast to soften $1.2–1.8/MT.`}
          </p>
        </div>
      </div>

      {/* Vessel + Contract — side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
        }}
      >
        {/* Vessel Recommendation */}
        <div className="card">
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Vessel Class
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              Panamax
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--accent-cyan)",
                fontWeight: 600,
              }}
            >
              75–82K DWT
            </span>
          </div>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: "1rem",
            }}
          >
            Optimal for this route. Matching draft clearance at{" "}
            {destPort?.name || "destination"} ({destPort?.maxDraft || "--"}m
            max).
          </p>

          {isHaldia && (
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "0.625rem 0.75rem",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                marginBottom: "0.875rem",
              }}
            >
              <AlertTriangle
                size={13}
                color="#ef4444"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#ef4444",
                  lineHeight: 1.4,
                }}
              >
                Capesize not permitted — Haldia draft limit is 8.5m.
              </span>
            </div>
          )}

          {isRussianRoute && (
            <div
              className="constraint-alert"
              style={{
                padding: "0.7rem",
                background: "rgba(245,158,11,.08)",
                border: "1px solid rgba(245,158,11,.25)",
                borderRadius: 8,
                color: "#f59e0b",
                marginBottom: "0.875rem",
              }}
            >
              <AlertTriangle size={13} /> Geopolitical & Insurance Risk:
              Vostochny route flagged for sanctions and war-risk premium review.
            </div>
          )}

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {[
              { label: "Voyage Days", value: "18–22 days" },
              { label: "Voyage Cost", value: "$12.8–14.2/MT" },
              { label: "Max Draft", value: "14.5m" },
              { label: "Load Rate", value: "50K MT/day" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-primary)",
                  borderRadius: 8,
                  padding: "0.625rem 0.75rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.62rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Strategy */}
        <div className="card">
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              marginBottom: "0.875rem",
            }}
          >
            Contract Strategy
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              {
                name: "3-Month COA",
                badge: "RECOMMENDED",
                cls: "badge-purple",
                note: "Lock before Q4 surge — save ~12%",
              },
              {
                name: "Spot Charter",
                badge: "ALTERNATE",
                cls: "badge-blue",
                note: "Enter when rate dips to $14.5/MT",
              },
              {
                name: "Time Charter",
                badge: "AVOID",
                cls: "badge-red",
                note: "High lock-in risk in volatile market",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  borderRadius: 9,
                  background:
                    i === 0 ? "rgba(139,92,246,0.07)" : "var(--bg-primary)",
                  border: `1px solid ${i === 0 ? "rgba(139,92,246,0.2)" : "var(--border-color)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                  >
                    {item.note}
                  </div>
                </div>
                <span
                  className={`badge ${item.cls}`}
                  style={{ flexShrink: 0, fontSize: "0.6rem" }}
                >
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main component ────────────────────────── */
export default function ImporterPortal({ scenario }) {
  const [formData, setFormData] = useState({
    commodity: "",
    originPort: "",
    destPort: "",
    volume: "",
    laycanStart: "",
    laycanEnd: "",
    originPortName: "",
    destPortName: "",
    ...scenario,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(Boolean(scenario));
  const [chartTab, setChartTab] = useState("30d");

  const handleRun = () => {
    setIsRunning(true);
    setShowResults(false);
    setTimeout(() => {
      setIsRunning(false);
      setShowResults(true);
    }, 2200);
  };

  return (
    <div className="page-shell procurement-shell">
      {/* Page title */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <Brain size={20} color="var(--accent-primary)" />
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Procurement & Feasibility Engine
          </h1>
          <span className="badge badge-purple">
            <div className="pulse-dot" style={{ background: "#8b5cf6" }} />
            AI Active
          </span>
        </div>
        <p className="section-sub">
          Enter a cargo and route to receive a clear charter recommendation.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="procurement-layout">
        {/* ── LEFT: Form ──────────────────────── */}
        <div className="input-rail">
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: "1.25rem",
              }}
            >
              <Package size={15} color="var(--accent-primary)" />
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                Cargo Configuration
              </span>
            </div>

            <div className="input-stack">
              <div className="input-section-title">Cargo Specs</div>
              <div>
                <label className="field-label">Commodity</label>
                <div style={{ position: "relative" }}>
                  <select
                    className="select-field"
                    value={formData.commodity}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, commodity: e.target.value }))
                    }
                  >
                    <option value="">Select commodity…</option>
                    {COMMODITIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Destination SAIL Plant</label>
                <select
                  className="select-field"
                  value={formData.plant || ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, plant: e.target.value }))
                  }
                >
                  <option value="">Select plant...</option>
                  <option>Rourkela (via Vizag/Paradip)</option>
                  <option>Bhilai (via Vizag)</option>
                  <option>Durgapur (via Haldia/Dhamra)</option>
                  <option>Burnpur (via Haldia)</option>
                </select>
              </div>

              <div>
                <label className="field-label">Volume (MT)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 75 000"
                  value={formData.volume}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, volume: e.target.value }))
                  }
                />
              </div>

              <div className="input-section-title">Route</div>
              <div>
                <label className="field-label">Origin Port</label>
                <div style={{ position: "relative" }}>
                  <select
                    className="select-field"
                    value={formData.originPort}
                    onChange={(e) => {
                      const port = ORIGIN_PORTS.find(
                        (p) => p.id === e.target.value,
                      );
                      setFormData((p) => ({
                        ...p,
                        originPort: e.target.value,
                        originPortName: port?.name || "",
                      }));
                    }}
                  >
                    <option value="">Select origin…</option>
                    {ORIGIN_PORTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.flag} {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Destination — India EC</label>
                <div style={{ position: "relative" }}>
                  <select
                    className="select-field"
                    value={formData.destPort}
                    onChange={(e) => {
                      const port = DEST_PORTS.find(
                        (p) => p.id === e.target.value,
                      );
                      setFormData((p) => ({
                        ...p,
                        destPort: e.target.value,
                        destPortName: port?.name || "",
                      }));
                    }}
                  >
                    <option value="">Select destination…</option>
                    {DEST_PORTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.state})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              <div className="input-section-title">Schedule</div>
              <div
                className="schedule-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    className="field-label"
                    title="Laydays Cancel Days – Period during which the vessel must arrive at origin."
                  >
                    Laycan Start ⓘ
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.laycanStart}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        laycanStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    className="field-label"
                    title="Laydays Cancel Days – Period during which the vessel must arrive at origin."
                  >
                    Laycan End ⓘ
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.laycanEnd}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, laycanEnd: e.target.value }))
                    }
                  />
                </div>
              </div>

              <button
                onClick={handleRun}
                disabled={isRunning}
                className="btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "0.8rem",
                  marginTop: 4,
                }}
              >
                {isRunning ? (
                  <>
                    <Loader
                      size={15}
                      style={{ animation: "spin 1s linear infinite" }}
                    />{" "}
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Brain size={15} /> Run AI Optimization
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mini market snapshot */}
          <div className="card market-snapshot">
            <p
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "0.875rem",
              }}
            >
              Live Market Snapshot
            </p>
            <div className="market-snapshot-grid">
              {[
                { label: "Panamax Spot", value: "$14.1/MT", up: true },
                { label: "Supramax Spot", value: "$12.0/MT", up: false },
                { label: "VLSFO Singapore", value: "$598/MT", up: false },
                { label: "NWC–Vizag TCE", value: "$18,400/day", up: true },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.55rem 0",
                    borderBottom: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: item.up ? "#10b981" : "#ef4444",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ───────────────────── */}
        <div className="decision-workspace">
          {showResults && (
            <div className="hero-recommendation">
              <div>
                <span className="hero-kicker">Recommendation</span>
                <strong
                  className={
                    formData.originPort === "RICH" ? "hero-wait" : "hero-buy"
                  }
                >
                  {formData.originPort === "RICH"
                    ? "WAIT 12 DAYS"
                    : formData.destPort === "HALD"
                      ? "BUY · SPLIT PARCELS"
                      : "BUY / REVIEW"}
                </strong>
              </div>
              <div className="hero-vessel">
                <span>Recommended: Panamax (75,000 DWT)</span>
                <small
                  className={
                    formData.destPort === "HALD"
                      ? "hero-draft-fail"
                      : "hero-draft-pass"
                  }
                >
                  Draft Check:{" "}
                  {formData.destPort === "HALD" ? "REVIEW" : "PASSED"} (
                  {formData.destPort === "HALD"
                    ? "14.5m vs 8.5m limit"
                    : "11.2m vs 12.5m limit"}
                  )
                </small>
              </div>
              <div className="hero-savings">
                <span>Est. Savings</span>
                <strong>
                  {formData.originPort === "RICH" ? "$142,000" : "$86,400"}
                </strong>
              </div>
            </div>
          )}

          {/* AI thinking state */}
          {isRunning && (
            <div
              className="card ai-glow"
              style={{ padding: "2.5rem", textAlign: "center" }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(99,102,241,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <Brain
                  size={26}
                  color="var(--accent-primary)"
                  style={{ animation: "pulse 1.4s ease infinite" }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                }}
              >
                AI Engine Running
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  maxWidth: 340,
                  margin: "0 auto 1.25rem",
                }}
              >
                Analyzing BDI trends, port congestion, vessel supply and
                seasonal patterns…
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {[
                  "BDI Feeds",
                  "Port Congestion",
                  "Vessel Supply",
                  "Rate Forecast",
                  "Risk Model",
                ].map((s, i) => (
                  <span
                    key={i}
                    className="badge badge-purple"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showResults ? (
            <>
              {/* Rate forecast chart */}
              <div className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <div className="section-title">
                      <BarChart2 size={15} color="var(--accent-primary)" />
                      Freight Rate Forecast
                    </div>
                    <p className="section-sub">
                      $/MT by vessel class — dashed = AI forecast
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["30d", "90d"].map((t) => (
                      <button
                        key={t}
                        className={`tab-button ${chartTab === t ? "active" : ""}`}
                        onClick={() => setChartTab(t)}
                      >
                        {t === "30d" ? "30-Day" : "90-Day"}
                      </button>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={freightRateData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(99,102,241,0.05)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                      tickFormatter={(v) => `$${v}`}
                      domain={[8, 24]}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "0.72rem", paddingTop: 8 }}
                    />
                    <ReferenceLine
                      x="Today"
                      stroke="rgba(99,102,241,0.4)"
                      strokeDasharray="4 2"
                      label={{
                        value: "Today",
                        position: "top",
                        fontSize: 9,
                        fill: "var(--accent-primary)",
                      }}
                    />
                    <ReferenceArea
                      x1="Day +10"
                      x2="Day +15"
                      fill="rgba(16,185,129,0.05)"
                      label={{
                        value: "Best Entry",
                        fontSize: 9,
                        fill: "#10b981",
                        position: "insideTop",
                      }}
                    />
                    <Line
                      name="Capesize"
                      dataKey="capesize"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="Panamax"
                      dataKey="panamax"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="Supramax"
                      dataKey="supramax"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="Handysize"
                      dataKey="handysize"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="AI: Cape"
                      dataKey="forecast_capesize"
                      stroke="#6366f1"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="AI: Pan"
                      dataKey="forecast_panamax"
                      stroke="#22d3ee"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="AI: Supra"
                      dataKey="forecast_supramax"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      connectNulls={false}
                    />
                    <Line
                      name="AI: Handy"
                      dataKey="forecast_handysize"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Keep secondary detail available without competing with the primary decision. */}
              {showResults && (
                <details className="supporting-details">
                  <summary>View charter details and contract strategy</summary>
                  <div className="supporting-details-body">
                    <AIResults formData={formData} />
                  </div>
                </details>
              )}

              <div className="card feasibility-output">
                <div className="section-title">
                  <Shield size={15} color="#22d3ee" />
                  Physical Feasibility Graph
                </div>
                <p className="section-sub">
                  Hard draft, LOA, and UKC checks run before rate calculations.
                </p>
                <div className="feasibility-nodes">
                  <span className="node node-good">
                    {formData.originPortName || "Origin"}
                  </span>
                  <ArrowRight size={13} />
                  <span className="node node-ai">Vessel filter</span>
                  <ArrowRight size={13} />
                  <span
                    className={
                      formData.destPort === "HALD"
                        ? "node node-bad"
                        : "node node-good"
                    }
                  >
                    {formData.destPortName || "Destination"}
                  </span>
                </div>
                {formData.destPort === "HALD" ? (
                  <div className="constraint-alert">
                    <AlertTriangle size={13} /> Capesize → Haldia PRUNED: draft
                    exceeds 8.5m. Auto-split to Panamax parcels.
                  </div>
                ) : (
                  <div className="constraint-pass">
                    <CheckCircle size={13} /> Panamax PASSED: draft and beam
                    within destination limits.
                  </div>
                )}
              </div>

              {/* Risk matrix */}
              <div className="card risk-assessment">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <div className="section-title">
                      <Shield size={15} color="var(--accent-secondary)" />
                      Risk & Demurrage Assessment
                    </div>
                    <p className="section-sub">
                      Current exposure based on selected route
                    </p>
                  </div>
                  <span className="badge badge-amber">Elevated Risk</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                  }}
                >
                  <div>
                    <RiskRow
                      label="Port Congestion Delay"
                      level="High"
                      value="Est. +2.5–4.5 days"
                      Icon={Anchor}
                    />
                    <RiskRow
                      label="Demurrage Exposure"
                      level="Medium"
                      value="$12,500–18,000/day"
                      Icon={Clock}
                    />
                    <RiskRow
                      label="Weather Disruption"
                      level="Low"
                      value="8% cyclone probability"
                      Icon={Wind}
                    />
                    <RiskRow
                      label="Rate Volatility"
                      level="Medium"
                      value="Expected σ $1.8/MT"
                      Icon={Waves}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.875rem",
                    }}
                  >
                    {[
                      {
                        label: "Demurrage Budget",
                        value: "$26,500",
                        sub: "1.5 days @ $17,667/day avg",
                        color: "#f59e0b",
                      },
                      {
                        label: "Dispatch Opportunity",
                        value: "$8,800/day",
                        sub: "Gangavaram best-case",
                        color: "#10b981",
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--bg-primary)",
                          borderRadius: 10,
                          padding: "1rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: 4,
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontSize: "1.4rem",
                            fontWeight: 800,
                            color: s.color,
                            lineHeight: 1,
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {s.sub}
                        </div>
                      </div>
                    ))}
                    <div
                      style={{
                        padding: "0.875rem",
                        background: "rgba(239,68,68,0.06)",
                        border: "1px solid rgba(239,68,68,0.18)",
                        borderRadius: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <AlertTriangle
                          size={14}
                          color="#ef4444"
                          style={{ flexShrink: 0 }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              color: "#ef4444",
                              marginBottom: 3,
                            }}
                          >
                            Haldia Alert
                          </div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              lineHeight: 1.5,
                            }}
                          >
                            36hr anchorage wait, congestion 9/10. Consider
                            Paradip or Dhamra.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="first-use-panel">
              <div className="first-use-icon">
                <Brain size={24} />
              </div>
              <span className="eyebrow">READY WHEN YOU ARE</span>
              <h2>Start with the cargo on the left</h2>
              <p>
                Choose a commodity, volume, origin, and destination. CharterIQ
                will check vessel fit first, then recommend when to charter.
              </p>
              <div className="first-use-steps">
                <span>
                  <b>1</b> Describe cargo
                </span>
                <span>
                  <b>2</b> Set route
                </span>
                <span>
                  <b>3</b> Run analysis
                </span>
              </div>
              <p className="first-use-hint">
                For a guided tour, choose a scenario from{" "}
                <strong>Quick Demo Scenarios for Judges</strong> above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
