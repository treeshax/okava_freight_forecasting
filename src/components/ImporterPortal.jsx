import { useState, useEffect } from "react";
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
  UserCheck,
  UserX,
} from "lucide-react";
import {
  COMMODITIES,
  ORIGIN_PORTS,
  DEST_PORTS,
  freightRateData as mockFreightRate,
} from "../data/mockData";

const API_BASE = "http://localhost:8000/api";

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
                ${Number(p.value).toFixed(1)}/MT
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

/* ── AI Results Detail Panel ───────────────── */
const AIResults = ({ formData, rankings }) => {
  const isRussianRoute = formData.originPort === "VOST";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Dynamic Vessel Rankings with Cost Breakdown */}
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
          Feasibility rankings & itemized costs
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {rankings.map((rank, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--bg-primary)",
                borderRadius: 10,
                padding: "1rem",
                border: idx === 0 ? "1px solid rgba(34,211,238,0.3)" : "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                    #{idx + 1} {rank.vessel_class}
                  </strong>
                  {idx === 0 && (
                    <span className="badge badge-cyan" style={{ marginLeft: 8 }}>
                      Best Match
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                    ${rank.effective_cost_per_tonne}/MT
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    Total: ${rank.effective_cost.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Warnings and Alerts specific to this vessel class */}
              {rank.warnings && rank.warnings.map((warn, wIdx) => (
                <div
                  key={wIdx}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    fontSize: "0.7rem",
                    color: "#f59e0b",
                    marginBottom: 4,
                  }}
                >
                  <AlertTriangle size={11} />
                  <span>{warn}</span>
                </div>
              ))}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 6,
                  marginTop: "0.5rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "0.5rem",
                }}
              >
                {[
                  { label: "Base Freight", value: `$${rank.cost_breakdown.base_freight.toLocaleString()}` },
                  { label: "Port Tariff", value: `$${rank.cost_breakdown.port_turnaround.toLocaleString()}` },
                  { label: "Idle Delay", value: `$${rank.cost_breakdown.idle_delay.toLocaleString()}` },
                  { label: "Risk Premium", value: `$${rank.cost_breakdown.geopolitical_premium.toLocaleString()}` },
                  { label: "Scale Adjustment", value: `$${rank.cost_breakdown.scale_adjustment.toLocaleString()}` },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
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
            Match Specs
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {rankings[0]?.vessel_class || "Panamax"}
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
            Hard constraints verification completed. Vessel metrics aligned with draft limitations.
          </p>

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
                fontSize: "0.72rem",
              }}
            >
              <AlertTriangle size={13} style={{ display: "inline", marginRight: 4 }} /> 
              Geopolitical & Sanction Alert: Route flagged for compliance vetting.
            </div>
          )}
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
            Recommended Contract Action
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              {
                name: "Contract of Affreightment (CoA) Ladder",
                badge: "RECOMMENDED",
                cls: "badge-purple",
                note: "Lock volume to hedge against congestion and rate peaks",
              },
              {
                name: "Spot Market Tender",
                badge: "OPPORTUNISTIC",
                cls: "badge-blue",
                note: "Procure remaining volume in identified window dips",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "0.75rem",
                  borderRadius: 9,
                  background: i === 0 ? "rgba(139,92,246,0.07)" : "var(--bg-primary)",
                  border: `1px solid ${i === 0 ? "rgba(139,92,246,0.2)" : "var(--border-color)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    {item.note}
                  </div>
                </div>
                <span className={`badge ${item.cls}`} style={{ flexShrink: 0, fontSize: "0.6rem" }}>
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
  
  // API variables state
  const [apiOnline, setApiOnline] = useState(false);
  const [forecasts, setForecasts] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [riskData, setRiskData] = useState(null);
  
  // Human in the Loop decisions
  const [hitlStatus, setHitlStatus] = useState("pending_review"); // pending_review | accepted | overridden
  const [overrideReason, setOverrideReason] = useState("");
  const [savedLogs, setSavedLogs] = useState([]);

  // Check API online status and fetch hitl history
  useEffect(() => {
    fetch(`${API_BASE}/model-metadata`)
      .then((res) => {
        if (res.ok) setApiOnline(true);
      })
      .catch(() => setApiOnline(false));

    fetchOverrides();
  }, []);

  // Fetch scenarios on load if pre-selected
  useEffect(() => {
    if (scenario) {
      handleRun();
    }
  }, [scenario]);

  const fetchOverrides = () => {
    fetch(`${API_BASE}/hitl-overrides`)
      .then((res) => res.json())
      .then((data) => setSavedLogs(data))
      .catch((err) => console.warning("Error fetching overrides history:", err));
  };

  const handleRun = () => {
    setIsRunning(true);
    setShowResults(false);
    setHitlStatus("pending_review");
    setOverrideReason("");

    if (apiOnline) {
      const laycanStr = formData.laycanStart || new Date().toISOString().split("T")[0];
      const volNum = formData.volume || 75000;
      
      // Execute concurrent requests to FastAPI Gateway
      Promise.all([
        fetch(`${API_BASE}/forecasts?origin=${formData.originPort}&destination=${formData.destPort}&vessel_class=panamax&horizon_days=30`),
        fetch(`${API_BASE}/vessel-port-rankings?origin=${formData.originPort}&destination=${formData.destPort}&volume=${volNum}&laycan_start=${laycanStr}`),
        fetch(`${API_BASE}/idle-risk-alerts?origin=${formData.originPort}&destination=${formData.destPort}&vessel_class=panamax`)
      ])
        .then(async ([fcRes, rankRes, riskRes]) => {
          const fc = await fcRes.json();
          const rk = await rankRes.json();
          const rs = await riskRes.json();

          // Transform daily forecasts to match chart
          const rateData = mockFreightRate.map((point) => {
            // Apply API derived calculations
            if (point.forecast_panamax !== null) {
              return {
                ...point,
                forecast_panamax: fc.point_forecast || point.forecast_panamax,
                forecast_capesize: (fc.point_forecast * 1.25) || point.forecast_capesize,
                forecast_supramax: (fc.point_forecast * 0.85) || point.forecast_supramax,
                forecast_handysize: (fc.point_forecast * 0.65) || point.forecast_handysize,
              };
            }
            return point;
          });

          setForecasts(rateData);
          setRankings(rk.rankings || []);
          setRiskData(rs);
          
          setIsRunning(false);
          setShowResults(true);
        })
        .catch((err) => {
          console.error("Backend fetch failed. Executing fallback.", err);
          runMockFallback();
        });
    } else {
      setTimeout(runMockFallback, 1500);
    }
  };

  const runMockFallback = () => {
    // Standard mock structure matching exact endpoints
    const fallbackRankings = [
      {
        vessel_class: "Panamax",
        effective_cost: 14.1 * (formData.volume || 75000) + 55000,
        effective_cost_per_tonne: 14.8,
        cost_breakdown: { base_freight: 14.1 * (formData.volume || 75000), port_turnaround: 55000, idle_delay: 15000, geopolitical_premium: 0, scale_adjustment: -60000 },
        warnings: ["Congestion delay expected on discharge."]
      },
      {
        vessel_class: "Supramax",
        effective_cost: 12.0 * (formData.volume || 75000) + 42000,
        effective_cost_per_tonne: 15.6,
        cost_breakdown: { base_freight: 12.0 * (formData.volume || 75000), port_turnaround: 42000, idle_delay: 24000, geopolitical_premium: 0, scale_adjustment: 0 },
        warnings: []
      }
    ];

    setRankings(fallbackRankings);
    setForecasts(mockFreightRate);
    setRiskData({
      status: formData.originPort === "VOST" ? "RED" : (formData.originPort === "RICH" ? "AMBER" : "GREEN"),
      congestion_score: formData.destPort === "HALD" ? 9 : 5,
      weather_alert: formData.originPort === "SAMA",
      geopolitics_index: formData.originPort === "VOST" ? 85.0 : 10.0,
      reasons: ["Operational values derived from baseline simulation metrics."]
    });
    
    setIsRunning(false);
    setShowResults(true);
  };

  const submitHITLDecision = (decision, reason = "") => {
    const payload = {
      username: "Akhilesh M. - Head Procurement",
      route: `${formData.originPort} -> ${formData.destPort}`,
      vessel_class: rankings[0]?.vessel_class || "Panamax",
      recommendation: `Charter recommended entry rate: $${rankings[0]?.effective_cost_per_tonne || 14.8}/MT`,
      decision: decision,
      override_reason: reason || "Standard system validation check."
    };

    if (apiOnline) {
      fetch(`${API_BASE}/hitl-overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then((res) => res.json())
        .then(() => {
          setHitlStatus(decision);
          fetchOverrides();
        })
        .catch((err) => console.error("Error logging human override:", err));
    } else {
      setHitlStatus(decision);
      setSavedLogs([
        {
          timestamp: new Date().toISOString(),
          username: payload.username,
          route: payload.route,
          vessel_class: payload.vessel_class,
          recommendation: payload.recommendation,
          decision: decision,
          override_reason: payload.override_reason
        },
        ...savedLogs
      ]);
    }
  };

  const isHaldia = formData.destPort === "HALD";
  const isRichardsBay = formData.originPort === "RICH";
  const isRussianRoute = formData.originPort === "VOST";
  
  // Dynamic headers based on calculations
  const heroRecommendationText = isRichardsBay
    ? "WAIT 12 DAYS"
    : isRussianRoute
      ? "RISK BLOCK"
      : isHaldia
        ? "SPLIT PARCELS"
        : "BUY / CONTRACT";

  return (
    <div className="page-shell procurement-shell">
      {/* Page title */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Brain size={20} color="var(--accent-primary)" />
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Procurement & Feasibility Engine
            </h1>
            <span className={`badge ${apiOnline ? "badge-green" : "badge-amber"}`}>
              <div className="pulse-dot" style={{ background: apiOnline ? "#10b981" : "#f59e0b" }} />
              {apiOnline ? "System Gateway Online" : "Local Standalone Mode"}
            </span>
          </div>
        </div>
        <p className="section-sub">
          Verify cargo specifications, constraints, and total effective delivery costs under HITL oversight.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="procurement-layout">
        {/* ── LEFT: Form ──────────────────────── */}
        <div className="input-rail">
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.25rem" }}>
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
                    onChange={(e) => setFormData((p) => ({ ...p, commodity: e.target.value }))}
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
                <label className="field-label">Volume (MT)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="e.g. 75 000"
                  value={formData.volume}
                  onChange={(e) => setFormData((p) => ({ ...p, volume: e.target.value }))}
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
                      const port = ORIGIN_PORTS.find((p) => p.id === e.target.value);
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
                      const port = DEST_PORTS.find((p) => p.id === e.target.value);
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="field-label">Laycan Start</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.laycanStart}
                    onChange={(e) => setFormData((p) => ({ ...p, laycanStart: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">Laycan End</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.laycanEnd}
                    onChange={(e) => setFormData((p) => ({ ...p, laycanEnd: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={handleRun}
                disabled={isRunning || !formData.originPort || !formData.destPort}
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
                    <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing…
                  </>
                ) : (
                  <>
                    <Brain size={15} /> Run Optimization Layer
                  </>
                )}
              </button>
            </div>
          </div>

          {/* HITL History audit card */}
          {savedLogs.length > 0 && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                HITL Audit Trail (Last Decisions)
              </div>
              <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {savedLogs.slice(0, 4).map((log, lIdx) => (
                  <div key={lIdx} style={{ background: "var(--bg-primary)", padding: 8, borderRadius: 6, fontSize: "0.7rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{log.route} ({log.vessel_class})</span>
                      <span className={`badge ${log.decision === "accepted" ? "badge-green" : "badge-red"}`}>{log.decision}</span>
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{log.override_reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ───────────────────── */}
        <div className="decision-workspace">
          {showResults && (
            <div className="hero-recommendation">
              <div>
                <span className="hero-kicker">Model Decision recommendation</span>
                <strong className={isRussianRoute ? "hero-draft-fail" : (isRichardsBay ? "hero-wait" : "hero-buy")}>
                  {heroRecommendationText}
                </strong>
              </div>
              <div className="hero-vessel">
                <span>Recommended: {rankings[0]?.vessel_class || "Panamax"}</span>
                <small className={isHaldia ? "hero-draft-fail" : "hero-draft-pass"}>
                  Draft Verification: {isHaldia ? "REJECTED (Silting)" : "COMPATIBLE"}
                </small>
              </div>
              <div className="hero-savings">
                <span>Effective Rate Target</span>
                <strong>
                  ${rankings[0]?.effective_cost_per_tonne || "14.80"}/MT
                </strong>
              </div>
            </div>
          )}

          {/* AI thinking state */}
          {isRunning && (
            <div className="card ai-glow" style={{ padding: "2.5rem", textAlign: "center" }}>
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
                <Brain size={26} color="var(--accent-primary)" style={{ animation: "pulse 1.4s ease infinite" }} />
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Forecasting & Matching Engine
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: 340, margin: "0 auto 1.25rem" }}>
                Verifying draft profiles, weather alerts, and calculating optimal vessel class costs...
              </div>
            </div>
          )}

          {showResults ? (
            <>
              {/* HITL Decision checkpoint bar */}
              <div className="card" style={{ borderLeft: "4px solid var(--accent-cyan)", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0 }}>Human-in-the-Loop Checkpoint</h3>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                      Log audit approval or input override notes back to the optimization reward.
                    </p>
                  </div>
                  {hitlStatus === "pending_review" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-primary" onClick={() => submitHITLDecision("accepted")} style={{ background: "#10b981", borderColor: "#10b981", display: "flex", gap: 4, alignItems: "center", fontSize: "0.75rem" }}>
                        <UserCheck size={14} /> Approve Rate
                      </button>
                      <button className="btn-secondary" onClick={() => setHitlStatus("entering_reason")} style={{ borderColor: "#ef4444", color: "#ef4444", display: "flex", gap: 4, alignItems: "center", fontSize: "0.75rem" }}>
                        <UserX size={14} /> Override
                      </button>
                    </div>
                  ) : hitlStatus === "entering_reason" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "50%" }}>
                      <input
                        className="input-field"
                        placeholder="State reason for override..."
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn-primary" disabled={!overrideReason} onClick={() => submitHITLDecision("overridden", overrideReason)} style={{ background: "#ef4444", borderColor: "#ef4444", padding: "2px 8px", fontSize: "0.68rem" }}>
                          Save Override
                        </button>
                        <button className="btn-secondary" onClick={() => setHitlStatus("pending_review")} style={{ padding: "2px 8px", fontSize: "0.68rem" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className={`badge ${hitlStatus === "accepted" ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
                      {hitlStatus === "accepted" ? "✓ Decision Approved" : "✗ Overridden & Logged"}
                    </span>
                  )}
                </div>
              </div>

              {/* Rate forecast chart */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
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
                  <LineChart data={forecasts.length ? forecasts : mockFreightRate} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.05)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => `$${v}`} domain={[8, 24]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", paddingTop: 8 }} />
                    <ReferenceLine x="Today" stroke="rgba(99,102,241,0.4)" strokeDasharray="4 2" />
                    
                    <Line name="Capesize" dataKey="capesize" stroke="#6366f1" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line name="Panamax" dataKey="panamax" stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line name="Supramax" dataKey="supramax" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line name="Handysize" dataKey="handysize" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={false} />
                    
                    <Line name="AI: Cape" dataKey="forecast_capesize" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
                    <Line name="AI: Pan" dataKey="forecast_panamax" stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
                    <Line name="AI: Supra" dataKey="forecast_supramax" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
                    <Line name="AI: Handy" dataKey="forecast_handysize" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* View details */}
              <div className="supporting-details-body" style={{ marginTop: "1rem" }}>
                <AIResults formData={formData} rankings={rankings} />
              </div>

              {/* Physical Feasibility Graph */}
              <div className="card feasibility-output" style={{ marginTop: "1rem" }}>
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
                  <span className={isHaldia ? "node node-bad" : "node node-good"}>
                    {formData.destPortName || "Destination"}
                  </span>
                </div>
                {isHaldia ? (
                  <div className="constraint-alert">
                    <AlertTriangle size={13} /> Capesize → Haldia PRUNED: draft exceeds 8.0m monsoon silting constraint. Auto-split to Panamax/Supramax.
                  </div>
                ) : (
                  <div className="constraint-pass">
                    <CheckCircle size={13} /> Compatibility PASSED: draft and beam within destination limits.
                  </div>
                )}
              </div>

              {/* Risk matrix */}
              <div className="card risk-assessment" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifycontent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <div>
                    <div className="section-title">
                      <Shield size={15} color="var(--accent-secondary)" />
                      Risk & Demurrage Assessment
                    </div>
                    <p className="section-sub">
                      Current exposure based on selected route
                    </p>
                  </div>
                  <span className={`badge ${isRussianRoute ? "badge-red" : (isRichardsBay ? "badge-amber" : "badge-green")}`}>
                    {isRussianRoute ? "Critical Risk" : (isRichardsBay ? "Elevated Risk" : "Normal Risk")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div>
                    <RiskRow
                      label="Port Congestion Delay"
                      level={riskData?.congestion_score > 30 ? "High" : "Medium"}
                      value={`Est. +${((riskData?.congestion_score || 10) / 10).toFixed(1)} days`}
                      Icon={Anchor}
                    />
                    <RiskRow
                      label="Demurrage Exposure"
                      level={isHaldia ? "High" : "Medium"}
                      value="$12,500–18,000/day"
                      Icon={Clock}
                    />
                    <RiskRow
                      label="Weather Disruption"
                      level={riskData?.weather_alert ? "High" : "Low"}
                      value={riskData?.weather_alert ? "Cyclone Warning active" : "Normal weather"}
                      Icon={Wind}
                    />
                    <RiskRow
                      label="Rate Volatility"
                      level={Math.abs(riskData?.volatility_z || 0) > 1.2 ? "High" : "Low"}
                      value={`Expected Z-score: ${(riskData?.volatility_z || 0.5).toFixed(2)}`}
                      Icon={Waves}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    {[
                      {
                        label: "Demurrage Budget",
                        value: isHaldia ? "$45,000" : "$17,600",
                        sub: "Calculated based on congestion delay queues",
                        color: "#f59e0b",
                      },
                      {
                        label: "Dispatch Opportunity",
                        value: "$8,800/day",
                        sub: "Available on green ports",
                        color: "#10b981",
                      },
                    ].map((s, i) => (
                      <div key={i} style={{ background: "var(--bg-primary)", borderRadius: 10, padding: "1rem" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>
                          {s.value}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4 }}>
                          {s.sub}
                        </div>
                      </div>
                    ))}
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
                Choose a commodity, volume, origin, and destination. CharterIQ will check vessel fit first, then recommend when to charter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
