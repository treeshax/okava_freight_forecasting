import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Anchor,
  AlertTriangle,
  Clock,
  TrendingUp,
  Minus,
  Activity,
  Droplets,
  Sun,
  MapPin,
  BarChart2,
  CloudRain,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Ship,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  eastCoastPorts,
  originPorts,
  bunkerData,
  bdiHistory,
  seasonalData,
} from "../data/mockData";

const API_BASE = "http://localhost:8000/api";

const ORIGIN_OPTIONS = [
  { code: "NCWL", name: "Newcastle (Australia)", flag: "🇦🇺" },
  { code: "RICH", name: "Richards Bay (South Africa)", flag: "🇿🇦" },
  { code: "SAMA", name: "Samarinda (Indonesia)", flag: "🇮🇩" },
  { code: "HAMP", name: "Hampton Roads (USA)", flag: "🇺🇸" },
  { code: "VOST", name: "Vostochny (Russia)", flag: "🇷🇺" },
];

const DEST_OPTIONS = [
  { code: "PRDP", name: "Paradip Port", state: "Odisha" },
  { code: "VIZG", name: "Visakhapatnam (Vizag)", state: "Andhra Pradesh" },
  { code: "GNGV", name: "Gangavaram Port", state: "Andhra Pradesh" },
  { code: "HALD", name: "Haldia Dock Complex", state: "West Bengal" },
  { code: "DHMR", name: "Dhamra Port", state: "Odisha" },
  { code: "GPPR", name: "Gopalpur Port", state: "Odisha" },
  { code: "SAGA", name: "Sagar Sandheads (STS)", state: "West Bengal" },
];

const VESSEL_OPTIONS = [
  { id: "panamax", name: "Panamax (60–80k DWT)" },
  { id: "capesize", name: "Capesize (100–180k DWT)" },
  { id: "supramax", name: "Supramax (50–60k DWT)" },
  { id: "handysize", name: "Handysize (30–40k DWT)" },
];

/* ── Congestion bar ─────────────────────────── */
const CongestionBar = ({ index }) => {
  const colors = [
    "#10b981", "#10b981", "#10b981",
    "#84cc16", "#84cc16",
    "#f59e0b", "#f59e0b",
    "#ef4444", "#ef4444", "#dc2626",
  ];
  const textColor = index >= 8 ? "#ef4444" : index >= 5 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 10,
            borderRadius: 2,
            background: i < index ? colors[i] : "var(--bg-primary)",
            opacity: i < index ? 1 : 0.3,
          }}
        />
      ))}
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: textColor,
          marginLeft: 5,
        }}
      >
        {index}/10
      </span>
    </div>
  );
};

/* ── Weather badge ──────────────────────────── */
const WeatherBadge = ({ weather, alert }) => {
  const Icon = alert ? AlertTriangle : Sun;
  const color = alert ? "#ef4444" : "#10b981";
  const bg = alert ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)";
  const border = alert ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.2)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 6,
        background: bg,
        border: `1px solid ${border}`,
        fontSize: "0.72rem",
        fontWeight: 600,
        color,
      }}
    >
      <Icon size={12} />
      {weather}
    </div>
  );
};

/* ── Chart tooltip ──────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-bright)",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "0.68rem",
          marginBottom: 5,
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      {payload.map((p, i) => (
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
            {p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Main component ─────────────────────────── */
export default function PortIntelligencePortal({ setActivePortal, setScenario }) {
  const [expanded, setExpanded] = useState(null);
  const [portFilter, setPortFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("Just now");

  // Live Corridor Risk Radar State
  const [radarOrigin, setRadarOrigin] = useState("NCWL");
  const [radarDest, setRadarDest] = useState("PRDP");
  const [radarVessel, setRadarVessel] = useState("panamax");
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarData, setRadarData] = useState({
    status: "GREEN",
    volatility_z: 0.85,
    congestion_score: 4,
    reasons: [
      "Corridor operating within seasonal variance limits.",
      "Anchorage queue at Paradip within normal operating bounds (18h wait).",
    ],
  });

  // BDI time range tab
  const [bdiRange, setBdiRange] = useState("1M");
  // Bunker hub filter tab
  const [bunkerFilter, setBunkerFilter] = useState("all");

  const fetchRadarRisk = async (origin, dest, vessel) => {
    setRadarLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/idle-risk-alerts?origin=${origin}&destination=${dest}&vessel_class=${vessel}`
      );
      if (res.ok) {
        const data = await res.json();
        setRadarData(data);
      }
    } catch (e) {
      console.warn("Backend risk alert failed, using simulated corridor metrics:", e);
    } finally {
      setRadarLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarRisk(radarOrigin, radarDest, radarVessel);
  }, [radarOrigin, radarDest, radarVessel]);

  useEffect(() => {
    const mainEl = document.querySelector(".app-main");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    fetchRadarRisk(radarOrigin, radarDest, radarVessel);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }, 600);
  };

  const handlePlanVoyage = (originCode, destCode, portName) => {
    if (setScenario) {
      setScenario({
        label: `Corridor: ${originCode} ➔ ${destCode}`,
        originPort: originCode,
        destPort: destCode,
        commodity: "Thermal Coal",
        volume: "75000",
        originPortName: ORIGIN_OPTIONS.find((o) => o.code === originCode)?.name || originCode,
        destPortName: portName || DEST_OPTIONS.find((d) => d.code === destCode)?.name || destCode,
      });
    }
    if (setActivePortal) {
      setActivePortal("importer");
    }
  };

  // Filter Ports Matrix
  const filteredPorts = eastCoastPorts.filter((p) => {
    if (portFilter === "alert") return p.congestionIndex >= 7 || p.anchorageWait > 15;
    if (portFilter === "monsoon") return p.id === "HALD" || p.id === "PRDP";
    if (portFilter === "deepwater") return p.maxDraft >= 16.5;
    if (portFilter === "lightering") return p.id === "SAGA" || p.id === "HALD";
    return true;
  });

  // Filter Origin Ports
  const filteredOrigins = originPorts.filter((p) => {
    if (originFilter === "alert") return p.weatherAlert;
    if (originFilter === "utilization") return p.utilization >= 75;
    return true;
  });

  // Filter Bunker Hubs
  const filteredBunkers = bunkerData.filter((b) => {
    if (bunkerFilter === "india") return b.hub === "Visakhapatnam";
    if (bunkerFilter === "global") return b.hub !== "Visakhapatnam";
    return true;
  });

  const PORT_COLS = "170px 90px 85px 95px 125px 115px 145px 105px";

  return (
    <div style={{ padding: "1.5rem 2rem 3rem", maxWidth: 1380, margin: "0 auto" }}>
      {/* ── Page Header ─────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(99,102,241,0.2) 100%)",
                border: "1px solid rgba(34,211,238,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={20} color="#22d3ee" />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Risk Radar & Port Intelligence
                <span className="badge badge-cyan" style={{ fontSize: "0.65rem" }}>
                  <div className="pulse-dot" style={{ background: "#22d3ee" }} /> Live Gateway
                </span>
              </h1>
              <p className="section-sub" style={{ margin: 0 }}>
                Real-time corridor volatility, seasonal monsoon restrictions, port queues, and bunker market indices.
              </p>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            style={{
              background: "rgba(148, 163, 184, 0.1)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: "0.74rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: isSyncing ? "default" : "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <RefreshCw
              size={13}
              color="#22d3ee"
              style={{ animation: isSyncing ? "spin 1s linear infinite" : "none" }}
            />
            {isSyncing ? "Refreshing Feeds..." : `Sync Radar (Last: ${lastSync})`}
          </button>
        </div>
      </div>

      {/* ── LIVE CORRIDOR RISK RADAR CONTROLLER ────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          background: "linear-gradient(180deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.85) 100%)",
          border:
            radarData.status === "RED"
              ? "1px solid rgba(239,68,68,0.4)"
              : radarData.status === "AMBER"
              ? "1px solid rgba(245,158,11,0.4)"
              : "1px solid rgba(34,211,238,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color="var(--accent-primary)" />
            <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)" }}>
              Corridor Risk Radar & Idle Alert Engine
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Select Route to Scan:</span>
            {/* Origin Picker */}
            <select
              className="select-field"
              value={radarOrigin}
              onChange={(e) => setRadarOrigin(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "0.74rem", minWidth: 140 }}
            >
              {ORIGIN_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.flag} {o.name}
                </option>
              ))}
            </select>

            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>➔</span>

            {/* Destination Picker */}
            <select
              className="select-field"
              value={radarDest}
              onChange={(e) => setRadarDest(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "0.74rem", minWidth: 150 }}
            >
              {DEST_OPTIONS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>

            {/* Vessel Picker */}
            <select
              className="select-field"
              value={radarVessel}
              onChange={(e) => setRadarVessel(e.target.value)}
              style={{ padding: "4px 8px", fontSize: "0.74rem", minWidth: 120 }}
            >
              {VESSEL_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Radar Diagnostics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 180px", gap: "1.25rem", alignItems: "center" }}>
          {/* Status Badge Gauge */}
          <div
            style={{
              padding: "1rem",
              borderRadius: 10,
              background:
                radarData.status === "RED"
                  ? "rgba(239,68,68,0.12)"
                  : radarData.status === "AMBER"
                  ? "rgba(245,158,11,0.12)"
                  : "rgba(16,185,129,0.12)",
              border:
                radarData.status === "RED"
                  ? "1px solid rgba(239,68,68,0.3)"
                  : radarData.status === "AMBER"
                  ? "1px solid rgba(245,158,11,0.3)"
                  : "1px solid rgba(16,185,129,0.3)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>
              Risk Classification
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                letterSpacing: "0.05em",
                color:
                  radarData.status === "RED"
                    ? "#ef4444"
                    : radarData.status === "AMBER"
                    ? "#f59e0b"
                    : "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <div
                className="pulse-dot"
                style={{
                  background:
                    radarData.status === "RED"
                      ? "#ef4444"
                      : radarData.status === "AMBER"
                      ? "#f59e0b"
                      : "#10b981",
                }}
              />
              {radarData.status === "RED"
                ? "RED ALERT"
                : radarData.status === "AMBER"
                ? "AMBER CAUTION"
                : "GREEN NORMAL"}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: 6 }}>
              {radarData.status === "RED"
                ? "Severe delays or sanctions restriction"
                : radarData.status === "AMBER"
                ? "Elevated waiting time or volatility"
                : "Safe window for spot fixtures"}
            </div>
          </div>

          {/* Risk Metrics & Audit Reasons */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
              <div style={{ background: "var(--bg-primary)", padding: "8px 12px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Volatility Z-Score
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
                  Z = {radarData.volatility_z != null ? Number(radarData.volatility_z).toFixed(2) : "0.00"}σ
                </div>
              </div>

              <div style={{ background: "var(--bg-primary)", padding: "8px 12px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Anchorage Queue
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
                  {radarData.congestion_score || 3} bulk carriers
                </div>
              </div>

              <div style={{ background: "var(--bg-primary)", padding: "8px 12px", borderRadius: 8 }}>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Demurrage Exposure
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: radarData.status === "RED" ? "#ef4444" : "#f59e0b", marginTop: 2 }}>
                  ${((radarData.congestion_score || 3) * 12500).toLocaleString()}/voyage
                </div>
              </div>
            </div>

            {/* Audit Findings */}
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", background: "rgba(148, 163, 184, 0.05)", padding: "6px 10px", borderRadius: 6 }}>
              <strong>Radar Intelligence: </strong>
              {radarData.reasons && radarData.reasons.length > 0
                ? radarData.reasons.join(" ")
                : "No active physical or geopolitical disruption notices."}
            </div>
          </div>

          {/* Action Trigger */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => handlePlanVoyage(radarOrigin, radarDest)}
              className="btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "8px 12px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              Plan Voyage ➔
            </button>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center" }}>
              Pre-populates procurement engine with this corridor.
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK RISK SIGNAL FILTER CHIPS ─────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>
          Active Maritime Signals:
        </span>
        <button
          onClick={() => {
            setRadarOrigin("VOST");
            setRadarDest("PRDP");
          }}
          style={{
            background: radarOrigin === "VOST" ? "rgba(239,68,68,0.2)" : "rgba(148, 163, 184, 0.08)",
            border: radarOrigin === "VOST" ? "1px solid #ef4444" : "1px solid var(--border-color)",
            color: radarOrigin === "VOST" ? "#ef4444" : "var(--text-secondary)",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertTriangle size={11} /> 🇷🇺 Vostochny / Russia Sanctions Flag
        </button>

        <button
          onClick={() => {
            setRadarOrigin("NCWL");
            setRadarDest("HALD");
            setPortFilter("monsoon");
          }}
          style={{
            background: radarDest === "HALD" ? "rgba(245,158,11,0.2)" : "rgba(148, 163, 184, 0.08)",
            border: radarDest === "HALD" ? "1px solid #f59e0b" : "1px solid var(--border-color)",
            color: radarDest === "HALD" ? "#f59e0b" : "var(--text-secondary)",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CloudRain size={11} /> 🌊 Haldia Riverine Monsoon Silting (8.0m Limit)
        </button>

        <button
          onClick={() => {
            setRadarOrigin("RICH");
            setRadarDest("VIZG");
            setPortFilter("alert");
          }}
          style={{
            background: radarOrigin === "RICH" ? "rgba(34,211,238,0.2)" : "rgba(148, 163, 184, 0.08)",
            border: radarOrigin === "RICH" ? "1px solid #22d3ee" : "1px solid var(--border-color)",
            color: radarOrigin === "RICH" ? "#22d3ee" : "var(--text-secondary)",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: "0.7rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Clock size={11} /> 🇿🇦 Richards Bay High Anchorage Queue (3.2d Delay)
        </button>
      </div>

      {/* ── PORT CONSTRAINTS MATRIX ─────────────────────────── */}
      <div className="card" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <div
          style={{
            padding: "1.25rem 1.5rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div className="section-title">
              <MapPin size={15} color="var(--accent-primary)" />
              India East Coast — Port Constraints & Physical Feasibility Matrix
            </div>
            <p className="section-sub" style={{ marginTop: 2 }}>
              Click any row to view berth limits, seasonal monsoon silting restrictions, and voyage planning shortcuts.
            </p>
          </div>

          {/* Filter Buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "all", label: `All Ports (${eastCoastPorts.length})` },
              { id: "alert", label: "Alerts / High Wait" },
              { id: "monsoon", label: "Monsoon Capped" },
              { id: "deepwater", label: "Deepwater (>16.5m)" },
              { id: "lightering", label: "Offshore STS (Sagar)" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPortFilter(btn.id)}
                style={{
                  background: portFilter === btn.id ? "var(--accent-primary, #0284c7)" : "rgba(148, 163, 184, 0.08)",
                  color: portFilter === btn.id ? "#ffffff" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 930 }}>
            <div
              className="table-header"
              style={{
                display: "grid",
                gridTemplateColumns: PORT_COLS,
                alignItems: "center",
              }}
            >
              <span>Port Name</span>
              <span>Max Draft</span>
              <span>Max LOA</span>
              <span>Berths</span>
              <span>Discharge Rate</span>
              <span>Anchorage Wait</span>
              <span>Congestion</span>
              <span>Status</span>
            </div>

            {filteredPorts.map((port) => {
              const isExpanded = expanded === port.id;
              const isAlert = port.congestionIndex >= 7 || port.anchorageWait > 18;
              return (
                <React.Fragment key={port.id}>
                  <div
                    className="table-row"
                    onClick={() => setExpanded(isExpanded ? null : port.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: PORT_COLS,
                      alignItems: "center",
                      cursor: "pointer",
                      borderLeft: isAlert
                        ? "3px solid #ef4444"
                        : isExpanded
                        ? "3px solid var(--accent-primary)"
                        : "3px solid transparent",
                      background: isExpanded ? "rgba(99,102,241,0.05)" : undefined,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {port.name}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        {port.state}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color:
                          port.maxDraft < 10
                            ? "#ef4444"
                            : port.maxDraft < 14
                            ? "#f59e0b"
                            : "#10b981",
                      }}
                    >
                      {port.maxDraft}m
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {port.maxLOA}m
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {port.id === "SAGA" ? "Offshore" : `${port.berths} berths`}
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {(port.dischargeRate / 1000).toFixed(0)}K MT/d
                    </div>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            port.anchorageWait > 24
                              ? "rgba(239,68,68,0.12)"
                              : port.anchorageWait > 12
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(16,185,129,0.12)",
                          color:
                            port.anchorageWait > 24
                              ? "#ef4444"
                              : port.anchorageWait > 12
                              ? "#f59e0b"
                              : "#10b981",
                        }}
                      >
                        <Clock size={11} />
                        {port.anchorageWait}h
                      </span>
                    </div>
                    <div>
                      <CongestionBar index={port.congestionIndex} />
                    </div>
                    <div>
                      <span className={`badge ${port.status === "operational" ? "badge-green" : "badge-red"}`}>
                        {port.status}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detail Drawer */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "1rem 1.5rem",
                        background: "rgba(99,102,241,0.04)",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      {port.id === "SAGA" && (
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            background: "rgba(34,211,238,0.08)",
                            border: "1px solid rgba(34,211,238,0.25)",
                            borderRadius: 8,
                            color: "var(--accent-cyan)",
                            marginBottom: "0.875rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Anchor size={16} />
                          <span>
                            <strong>Sagar Sandheads Offshore Anchorage:</strong> Dedicated ship-to-ship (STS) lightering point for bulk carriers discharging to Haldia or Kolkata. Fully operational for Supramax and Handysize daughter vessels.
                          </span>
                        </div>
                      )}
                      {port.id === "HALD" && (
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: 8,
                            color: "#ef4444",
                            marginBottom: "0.875rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <AlertTriangle size={16} />
                          <span>
                            <strong>Monsoon Silting Warning (June–October):</strong> Permissible river draft restricted down to 8.0m. Capesize vessels cannot discharge at berths; lightering mandatory at Sagar Sandheads.
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr)) 180px",
                          gap: "0.75rem",
                          alignItems: "center",
                        }}
                      >
                        {[
                          { label: "Cargo Specialization", value: port.specialization },
                          {
                            label: "Max Vessel Class",
                            value:
                              port.maxDraft >= 17.5
                                ? "Capesize Eligible"
                                : port.maxDraft >= 14.5
                                ? "Panamax Eligible"
                                : "Supramax / Handysize",
                          },
                          {
                            label: "Handling Cranes",
                            value: port.id === "GNGV" ? "Grab + Conveyor (55k/d)" : "High-capacity grab",
                          },
                          { label: "Pilotage Window", value: "24/7 Compulsory" },
                        ].map((r, i) => (
                          <div
                            key={i}
                            style={{
                              background: "var(--bg-card)",
                              borderRadius: 8,
                              padding: "0.75rem",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                              {r.label}
                            </div>
                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                              {r.value}
                            </div>
                          </div>
                        ))}

                        {/* Plan Voyage to this Port Action */}
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlanVoyage("NCWL", port.id, port.name);
                            }}
                            className="btn-primary"
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              justifyContent: "center",
                            }}
                          >
                            <Ship size={14} /> Plan Cargo to {port.name}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── GLOBAL ORIGIN PORT TRACKER ──────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="section-title">
              <MapPin size={15} color="var(--accent-secondary)" />
              Global Origin Port Tracker (Bulk Coal & Ore Hubs)
            </div>
            <span className="badge badge-red">2 Weather Alerts Active</span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "all", label: `All Origins (${originPorts.length})` },
              { id: "alert", label: "Weather Alerts" },
              { id: "utilization", label: "High Utilization (>75%)" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setOriginFilter(btn.id)}
                style={{
                  background: originFilter === btn.id ? "var(--accent-primary, #0284c7)" : "rgba(148, 163, 184, 0.08)",
                  color: originFilter === btn.id ? "#ffffff" : "var(--text-muted)",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 9px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredOrigins.map((port) => (
            <div
              key={port.id}
              className="card"
              style={{
                borderColor: port.weatherAlert ? "rgba(239,68,68,0.3)" : "var(--border-color)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.85rem" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>{port.flag}</span>
                  <div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {port.name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{port.country}</div>
                  </div>
                </div>
                <WeatherBadge weather={port.weather} alert={port.weatherAlert} />
              </div>

              {/* Utilization bar */}
              <div style={{ marginBottom: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    Berth Utilization
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: port.utilization > 85 ? "#ef4444" : port.utilization > 70 ? "#f59e0b" : "#10b981",
                    }}
                  >
                    {port.utilization}%
                  </span>
                </div>
                <div className="risk-bar" style={{ height: 6 }}>
                  <div
                    className="risk-bar-fill"
                    style={{
                      width: `${port.utilization}%`,
                      background:
                        port.utilization > 85
                          ? "linear-gradient(90deg,#ef444466,#ef4444)"
                          : port.utilization > 70
                          ? "linear-gradient(90deg,#f59e0b66,#f59e0b)"
                          : "linear-gradient(90deg,#10b98166,#10b981)",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { label: "Loaders", value: port.loaders },
                  { label: "Queue", value: `${port.queue} vsl` },
                  { label: "Avg Delay", value: `${port.avgDelay}d` },
                ].map((r, i) => (
                  <div key={i} style={{ background: "var(--bg-primary)", borderRadius: 7, padding: "0.5rem 0.6rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{r.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  Next opening: <strong style={{ color: "var(--text-secondary)" }}>{port.nextAvailable}</strong>
                </span>
                <button
                  onClick={() => handlePlanVoyage(port.id, "PRDP")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-primary, #38bdf8)",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  Plan ➔
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MACRO FEED (BUNKER PRICES & BDI INDEX) ──────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {/* Bunker prices */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Droplets size={15} color="#22d3ee" />
              <div className="section-title">VLSFO & Marine Fuel Prices</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { id: "all", label: "All Hubs" },
                { id: "india", label: "Vizag Hub" },
                { id: "global", label: "Global Hubs" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBunkerFilter(b.id)}
                  style={{
                    background: bunkerFilter === b.id ? "var(--accent-primary)" : "rgba(148, 163, 184, 0.08)",
                    color: bunkerFilter === b.id ? "#ffffff" : "var(--text-muted)",
                    border: "none",
                    borderRadius: 5,
                    padding: "2px 7px",
                    fontSize: "0.68rem",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBunkers.map((hub) => (
            <div
              key={hub.hub}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 1fr 1fr 28px",
                alignItems: "center",
                gap: 8,
                padding: "0.65rem 0.75rem",
                borderRadius: 8,
                marginBottom: 6,
                background: "var(--bg-primary)",
              }}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {hub.hub}
              </span>
              <div>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 600 }}>VLSFO</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#22d3ee" }}>${hub.vlsfo}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 600 }}>MGO</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f59e0b" }}>${hub.mgo}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 600 }}>IFO 380</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>${hub.ifo380}</div>
              </div>
              {hub.trend === "up" ? (
                <ArrowUpRight size={16} color="#10b981" />
              ) : hub.trend === "down" ? (
                <ArrowDownRight size={16} color="#ef4444" />
              ) : (
                <Minus size={16} color="var(--text-muted)" />
              )}
            </div>
          ))}
        </div>

        {/* BDI chart */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart2 size={15} color="var(--accent-primary)" />
              <div className="section-title">Baltic Dry Index (BDI) Trend</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981" }}>1,603</span>
              <span className="badge badge-green">
                <TrendingUp size={10} /> +2.1%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={bdiHistory} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="bdiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} domain={[1200, 1800]} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" name="BDI Index" dataKey="bdi" stroke="#6366f1" fill="url(#bdiGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── SEASONAL DEMAND PATTERN ──────────────────── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
          <Activity size={15} color="#10b981" />
          <div className="section-title">
            Seasonal Demand & Rate Patterns — India East Coast Bulk Coal (Full Year)
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={seasonalData} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--text-muted)" }} domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => `$${v}`} domain={[10, 22]} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
            <Bar yAxisId="left" name="Demand Index" dataKey="demand" fill="rgba(99,102,241,0.45)" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" name="Avg Rate $/MT" type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 3 }} />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
          {[
            { period: "Sep–Nov", label: "Peak Steel Demand", cls: "badge-red", note: "Elevated rates +20–25%" },
            { period: "Apr–Aug", label: "Southwest Monsoon", cls: "badge-amber", note: "Riverine draft silting & swell" },
            { period: "Jan–Mar", label: "Off-Peak Window", cls: "badge-green", note: "Best procurement entry point" },
          ].map((s) => (
            <div key={s.period} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`badge ${s.cls}`}>{s.period}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {s.label} — {s.note}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
