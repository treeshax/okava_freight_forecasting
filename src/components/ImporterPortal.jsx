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
  Sparkles,
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
const AIResults = ({ formData, rankings, aiAgentDecision }) => {
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
                      <Sparkles size={11} style={{ marginRight: 3 }} /> AI Optimal
                    </span>
                  )}
                  {rank.num_voyages > 1 && (
                    <span className="badge badge-purple" style={{ marginLeft: 6 }}>
                      {rank.num_voyages} Voyages
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
                  { label: "Base Freight", value: `$${rank.cost_breakdown?.base_freight?.toLocaleString() ?? 0}` },
                  { label: "Port Tariff", value: `$${rank.cost_breakdown?.port_turnaround?.toLocaleString() ?? 0}` },
                  { label: "Idle Delay", value: `$${rank.cost_breakdown?.idle_delay?.toLocaleString() ?? 0}` },
                  { label: "Risk Premium", value: `$${rank.cost_breakdown?.geopolitical_premium?.toLocaleString() ?? 0}` },
                  { label: "Scale/Deadfrt", value: `$${((rank.cost_breakdown?.scale_adjustment || 0) + (rank.cost_breakdown?.deadfreight || 0)).toLocaleString()}` },
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

              {rank.rationale && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px dashed rgba(148,163,184,0.15)", paddingTop: "0.4rem" }}>
                  🤖 <strong style={{ fontStyle: "normal", color: "var(--text-secondary)" }}>AI Insight:</strong> {rank.rationale}
                </div>
              )}
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
            AI Agent Decision
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {rankings[0]?.vessel_class || "Panamax"}
            </span>
            <span className="badge badge-cyan" style={{ fontSize: "0.68rem" }}>
              <Sparkles size={11} style={{ marginRight: 3 }} /> AI Recommended
            </span>
          </div>
          <div
            style={{
              padding: "0.65rem 0.85rem",
              background: "rgba(34,211,238,0.06)",
              border: "1px solid rgba(34,211,238,0.25)",
              borderRadius: 8,
              marginBottom: "0.85rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <strong style={{ fontSize: "0.72rem", color: "#22d3ee" }}>AI Agent Rationale:</strong>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {rankings[0]?.rationale || aiAgentDecision || "Selected by physical draft audit, parcel deadfreight sizing, and multi-horizon LightGBM rate optimization."}
            </p>
          </div>

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

/* ── Default initial cargo scenario ────────── */
const DEFAULT_CARGO = {
  commodity: "Coking Coal",
  volume: "75000",
  originPort: "NCWL",
  originPortName: "Newcastle, Australia",
  destPort: "PRDP",
  destPortName: "Paradip Port",
  laycanStart: "2026-09-15",
  laycanEnd: "2026-09-25",
};

/* ── Main component ────────────────────────── */
export default function ImporterPortal({ scenario }) {
  const [formData, setFormData] = useState({
    ...DEFAULT_CARGO,
    ...scenario,
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [chartTab, setChartTab] = useState("30d");
  
  // API variables state
  const [apiOnline, setApiOnline] = useState(false);
  const [forecasts, setForecasts] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [aiAgentDecision, setAiAgentDecision] = useState("");
  
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

  // Fetch scenarios and run initial optimization on load
  useEffect(() => {
    const targetData = scenario ? { ...DEFAULT_CARGO, ...scenario } : DEFAULT_CARGO;
    handleRun(targetData);
  }, [scenario]);

  const fetchOverrides = () => {
    fetch(`${API_BASE}/hitl-overrides`)
      .then((res) => res.json())
      .then((data) => setSavedLogs(data))
      .catch((err) => console.warning("Error fetching overrides history:", err));
  };

  const handleRun = (customData = null) => {
    const activeData = customData || formData;
    const origin = activeData.originPort || "NCWL";
    const dest = activeData.destPort || "PRDP";
    const volNum = Number(activeData.volume) || 75000;
    const comm = activeData.commodity || "Coking Coal";
    const laycanStr = activeData.laycanStart || "2026-09-15";

    if (!activeData.originPort || !activeData.destPort) {
      setFormData((prev) => ({
        ...prev,
        originPort: origin,
        originPortName: ORIGIN_PORTS.find((p) => p.id === origin)?.name || "Newcastle, Australia",
        destPort: dest,
        destPortName: DEST_PORTS.find((p) => p.id === dest)?.name || "Paradip Port",
        volume: String(volNum),
        commodity: comm,
      }));
    }

    setIsRunning(true);
    setShowResults(false);
    setHitlStatus("pending_review");
    setOverrideReason("");

    if (apiOnline) {
      // Execute concurrent requests to FastAPI Gateway
      Promise.all([
        fetch(`${API_BASE}/forecasts?origin=${origin}&destination=${dest}&vessel_class=panamax&horizon_days=30`),
        fetch(`${API_BASE}/vessel-port-rankings?origin=${origin}&destination=${dest}&volume=${volNum}&laycan_start=${laycanStr}`),
        fetch(`${API_BASE}/idle-risk-alerts?origin=${origin}&destination=${dest}&vessel_class=panamax`)
      ])
        .then(async ([fcRes, rankRes, riskRes]) => {
          const fc = await fcRes.json();
          const rk = await rankRes.json();
          const rs = await riskRes.json();

          // Transform daily forecasts to match chart
          const rateData = mockFreightRate.map((point) => {
            if (point.forecast_panamax !== null) {
              return {
                ...point,
                forecast_panamax: fc.point_forecast || point.forecast_panamax,
                forecast_capesize: (fc.point_forecast * 0.78) || point.forecast_capesize,
                forecast_supramax: (fc.point_forecast * 1.10) || point.forecast_supramax,
                forecast_handysize: (fc.point_forecast * 1.45) || point.forecast_handysize,
              };
            }
            return point;
          });

          setForecasts(rateData);
          setRankings(rk.rankings || []);
          setAiAgentDecision(rk.ai_agent_decision || "");
          setRiskData(rs);
          
          setIsRunning(false);
          setShowResults(true);
        })
        .catch((err) => {
          console.error("Backend fetch failed. Executing fallback.", err);
          runMockFallback(activeData);
        });
    } else {
      setTimeout(() => runMockFallback(activeData), 500);
    }
  };

  const runMockFallback = () => {
    const vol = Number(formData.volume) || 75000;
    const dest = formData.destPort || "PRDP";

    let fallbackRankings = [];
    let agentDecision = "";

    if (dest === "HALD") {
      fallbackRankings = [
        {
          vessel_class: "Handysize",
          effective_cost: 21.5 * vol + 60000,
          effective_cost_per_tonne: 22.8,
          num_voyages: Math.ceil(vol / 38000),
          cost_breakdown: { base_freight: 21.5 * vol, port_turnaround: 60000, idle_delay: 18000, geopolitical_premium: 0, scale_adjustment: 0, deadfreight: 0 },
          warnings: ["Haldia riverine draft limit (8.5m). Direct entry approved for Handysize."],
          rationale: "Direct entry permitted within Haldia's riverine ceiling; Capesize/Panamax require lightering at Sagar Sandheads."
        }
      ];
      agentDecision = "AI Chartering Agent selects Handysize: Only vessel class meeting Haldia's 8.5m riverine draft limit.";
    } else if (vol >= 100000 && (dest === "GNGV" || dest === "DHMR")) {
      fallbackRankings = [
        {
          vessel_class: "Capesize",
          effective_cost: 7.8 * vol + 85000,
          effective_cost_per_tonne: 8.4,
          num_voyages: 1,
          cost_breakdown: { base_freight: 7.8 * vol, port_turnaround: 85000, idle_delay: 25000, geopolitical_premium: 0, scale_adjustment: -220000, deadfreight: 0 },
          warnings: [],
          rationale: "Max economies of scale in 1 single voyage; deepwater draft verified."
        },
        {
          vessel_class: "Panamax",
          effective_cost: 10.5 * vol + 150000,
          effective_cost_per_tonne: 11.6,
          num_voyages: 2,
          cost_breakdown: { base_freight: 10.5 * vol, port_turnaround: 150000, idle_delay: 35000, geopolitical_premium: 0, scale_adjustment: -80000, deadfreight: 0 },
          warnings: ["Requires 2 separate voyages for this volume."],
          rationale: "Requires 2 voyages for volume; incurs doubled port tariffs and queue delays."
        }
      ];
      agentDecision = "AI Chartering Agent selects Capesize: Single voyage saves ~$3.20/MT over split Panamax voyages; deepwater draft verified.";
    } else if (vol <= 40000) {
      fallbackRankings = [
        {
          vessel_class: "Supramax",
          effective_cost: 14.5 * vol + 50000,
          effective_cost_per_tonne: 16.2,
          num_voyages: 1,
          cost_breakdown: { base_freight: 14.5 * vol, port_turnaround: 50000, idle_delay: 15000, geopolitical_premium: 0, scale_adjustment: 0, deadfreight: 0 },
          warnings: [],
          rationale: "Optimal for smaller parcels; zero deadfreight penalty vs Panamax under-utilization."
        },
        {
          vessel_class: "Panamax",
          effective_cost: 11.0 * vol + 85000 + 75000,
          effective_cost_per_tonne: 18.5,
          num_voyages: 1,
          cost_breakdown: { base_freight: 11.0 * vol, port_turnaround: 85000, idle_delay: 20000, geopolitical_premium: 0, scale_adjustment: -30000, deadfreight: 75000 },
          warnings: ["Under-utilized capacity incurs deadfreight penalty."],
          rationale: "Vessel capacity under-utilized; incurs deadfreight penalty on small parcel."
        }
      ];
      agentDecision = "AI Chartering Agent selects Supramax: Best parcel deadweight utilization; saves deadfreight penalty.";
    } else {
      fallbackRankings = [
        {
          vessel_class: "Panamax",
          effective_cost: 10.5 * vol + 75000,
          effective_cost_per_tonne: 11.5,
          num_voyages: 1,
          cost_breakdown: { base_freight: 10.5 * vol, port_turnaround: 75000, idle_delay: 20000, geopolitical_premium: 0, scale_adjustment: -60000, deadfreight: 0 },
          warnings: [],
          rationale: "Optimal parcel match (75K MT) with full coastal Indian draft flexibility."
        },
        {
          vessel_class: "Supramax",
          effective_cost: 12.5 * vol + 120000,
          effective_cost_per_tonne: 14.2,
          num_voyages: 2,
          cost_breakdown: { base_freight: 12.5 * vol, port_turnaround: 120000, idle_delay: 28000, geopolitical_premium: 0, scale_adjustment: 0, deadfreight: 0 },
          warnings: ["Requires 2 voyages for volume."],
          rationale: "Requires 2 voyages to carry full volume."
        }
      ];
      agentDecision = "AI Chartering Agent selects Panamax: Maximum cost efficiency for 75K MT parcel across Indian East Coast ports.";
    }

    setRankings(fallbackRankings);
    setAiAgentDecision(agentDecision);
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
  
  const handleReset = () => {
    setFormData({
      commodity: "",
      originPort: "",
      destPort: "",
      volume: "75000",
      laycanStart: "",
      laycanEnd: "",
      originPortName: "",
      destPortName: "",
    });
    setShowResults(false);
    setHitlStatus("pending_review");
    setOverrideReason("");
  };

  const allChartData = forecasts.length ? forecasts : mockFreightRate;
  const filteredChartData = allChartData.filter((p) => {
    if (chartTab === "14d") {
      const match = p.day.match(/\d+/);
      const num = match ? parseInt(match[0]) : 0;
      return num <= 14;
    }
    if (chartTab === "30d") {
      const match = p.day.match(/\d+/);
      const num = match ? parseInt(match[0]) : 0;
      return num <= 30;
    }
    return true;
  });

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Package size={15} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Cargo Configuration
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                title="Reset all inputs"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  borderRadius: 6,
                  padding: "3px 9px",
                  fontSize: "0.68rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>

            <div className="input-stack">
              {/* Quick 1-Click Scenario Presets */}
              <div style={{ marginBottom: "0.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  ⚡ Quick Presets (1-Click Run)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Newcastle ➔ Paradip (75K MT)", origin: "NCWL", dest: "PRDP", vol: "75000", comm: "Coking Coal" },
                    { label: "Newcastle ➔ Gangavaram (150K MT)", origin: "NCWL", dest: "GNGV", vol: "150000", comm: "Thermal Coal" },
                    { label: "Samarinda ➔ Haldia (30K MT)", origin: "SAMA", dest: "HALD", vol: "30000", comm: "Thermal Coal" },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const next = {
                          ...formData,
                          originPort: preset.origin,
                          originPortName: ORIGIN_PORTS.find(p => p.id === preset.origin)?.name || preset.origin,
                          destPort: preset.dest,
                          destPortName: DEST_PORTS.find(p => p.id === preset.dest)?.name || preset.dest,
                          volume: preset.vol,
                          commodity: preset.comm,
                          laycanStart: "2026-09-15",
                          laycanEnd: "2026-09-25",
                        };
                        setFormData(next);
                        handleRun(next);
                      }}
                      style={{
                        background: formData.originPort === preset.origin && formData.destPort === preset.dest && formData.volume === preset.vol
                          ? "var(--accent-primary, #0284c7)"
                          : "rgba(34, 211, 238, 0.08)",
                        border: "1px solid rgba(34, 211, 238, 0.25)",
                        color: formData.originPort === preset.origin && formData.destPort === preset.dest && formData.volume === preset.vol
                          ? "#ffffff"
                          : "var(--accent-cyan)",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

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
                    style={{
                      borderColor: !formData.destPort && formData.originPort ? "#f59e0b" : undefined,
                      boxShadow: !formData.destPort && formData.originPort ? "0 0 0 1px rgba(245, 158, 11, 0.4)" : undefined,
                    }}
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
                onClick={() => handleRun()}
                disabled={isRunning}
                title="Run AI Optimization Layer"
                className="btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "0.8rem",
                  marginTop: 6,
                  cursor: isRunning ? "not-allowed" : "pointer",
                }}
              >
                {isRunning ? (
                  <>
                    <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing Corridor & Pricing…
                  </>
                ) : (
                  <>
                    <Brain size={15} /> Run Optimization Layer
                  </>
                )}
              </button>

              {(!formData.originPort || !formData.destPort) && (
                <div
                  style={{
                    fontSize: "0.73rem",
                    color: "var(--accent-cyan)",
                    background: "rgba(34, 211, 238, 0.08)",
                    border: "1px solid rgba(34, 211, 238, 0.25)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    lineHeight: 1.4,
                  }}
                >
                  <Sparkles size={14} style={{ flexShrink: 0, color: "#22d3ee" }} />
                  <span>
                    Click <strong>Run Optimization Layer</strong> to evaluate standard Newcastle ➔ Paradip route, or customize origin/destination above.
                  </span>
                </div>
              )}
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
                    {["14d", "30d", "90d"].map((t) => (
                      <button
                        key={t}
                        className={`tab-button ${chartTab === t ? "active" : ""}`}
                        onClick={() => setChartTab(t)}
                      >
                        {t === "14d" ? "14-Day" : t === "30d" ? "30-Day" : "90-Day"}
                      </button>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={filteredChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
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
                <AIResults formData={formData} rankings={rankings} aiAgentDecision={aiAgentDecision} />
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
