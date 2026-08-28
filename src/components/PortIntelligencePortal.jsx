import React, { useState } from "react";
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
} from "lucide-react";
import {
  eastCoastPorts,
  originPorts,
  bunkerData,
  bdiHistory,
  seasonalData,
} from "../data/mockData";

/* ── Congestion bar ─────────────────────────── */
const CongestionBar = ({ index }) => {
  const colors = [
    "#10b981",
    "#10b981",
    "#10b981",
    "#84cc16",
    "#84cc16",
    "#f59e0b",
    "#f59e0b",
    "#ef4444",
    "#ef4444",
    "#dc2626",
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
export default function PortIntelligencePortal() {
  const [expanded, setExpanded] = useState(null);

  const PORT_COLS = "130px 80px 70px 60px 110px 110px 140px 90px";

  return (
    <div style={{ padding: "2rem", maxWidth: 1380, margin: "0 auto" }}>
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
          <Anchor size={20} color="#22d3ee" />
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Port Intelligence & Market Data
          </h1>
          <span className="badge badge-cyan">
            <div className="pulse-dot" style={{ background: "#22d3ee" }} /> Live
          </span>
        </div>
        <p className="section-sub">
          Seven-port East Coast matrix, route risk signals, loader status, and
          macro-market indicators.
        </p>
      </div>

      <div className="risk-badge-row">
        <span className="badge badge-amber">
          <AlertTriangle size={11} /> Geopolitical & Insurance Risk · Vostochny
          / Russia
        </span>
        <span className="badge badge-amber">
          <CloudRain size={11} /> Seasonal Shock · Bay of Bengal cyclone /
          monsoon window
        </span>
        <span className="badge badge-cyan">
          <Activity size={11} /> IMO Compliance · CII/EEXI speed restrictions
        </span>
      </div>

      {/* ── PORT MATRIX ─────────────────────────── */}
      <div className="card" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem 1.5rem 1rem" }}>
          <div className="section-title">
            <MapPin size={15} color="var(--accent-primary)" />
            India East Coast — Port Constraints Matrix
          </div>
          <p className="section-sub" style={{ marginTop: 2 }}>
            Click any row to expand details.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 820 }}>
            <div
              className="table-header"
              style={{ display: "grid", gridTemplateColumns: PORT_COLS }}
            >
              <span>Port</span>
              <span>Max Draft</span>
              <span>Max LOA</span>
              <span>Berths</span>
              <span>Discharge Rate</span>
              <span>Anchorage Wait</span>
              <span>Congestion</span>
              <span>Status</span>
            </div>

            {eastCoastPorts.map((port) => {
              const isExpanded = expanded === port.id;
              const isAlert = port.congestionIndex >= 8;
              return (
                <React.Fragment key={port.id}>
                  <div
                    className="table-row"
                    onClick={() => setExpanded(isExpanded ? null : port.id)}
                    style={{
                      gridTemplateColumns: PORT_COLS,
                      cursor: "pointer",
                      borderLeft: isAlert
                        ? "3px solid #ef4444"
                        : isExpanded
                          ? "3px solid var(--accent-primary)"
                          : "3px solid transparent",
                      background: isExpanded
                        ? "rgba(99,102,241,0.05)"
                        : undefined,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {port.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                        }}
                      >
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
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {port.maxLOA}m
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {port.id === "SAGA" ? "N/A (STS)" : port.berths}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {(port.dischargeRate / 1000).toFixed(0)}K MT/day
                    </div>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            port.anchorageWait > 24
                              ? "rgba(239,68,68,0.1)"
                              : port.anchorageWait > 12
                                ? "rgba(245,158,11,0.1)"
                                : "rgba(16,185,129,0.1)",
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
                    <CongestionBar index={port.congestionIndex} />
                    <span
                      className={`badge ${port.status === "operational" ? "badge-green" : "badge-red"}`}
                    >
                      {port.status}
                    </span>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        padding: "1rem 1.5rem",
                        background: "rgba(99,102,241,0.04)",
                        borderBottom: "1px solid var(--border-color)",
                        animation: "slideUp 0.2s ease",
                      }}
                    >
                      {port.id === "SAGA" && (
                        <div style={{ padding: "0.75rem", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 8, color: "var(--accent-cyan)", marginBottom: "0.875rem", fontSize: "0.75rem" }}>
                          <Anchor size={12} style={{ display: "inline", marginRight: 4 }} />
                          Sagar Sandheads is an offshore ship-to-ship (STS) lightering anchorage, not a berthing port. Capesize cargo must be lightered to Supramax/Handysize daughters.
                        </div>
                      )}
                      {port.id === "HALD" && (
                        <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, color: "#ef4444", marginBottom: "0.875rem", fontSize: "0.75rem" }}>
                          <AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} />
                          Haldia Dock Complex is subjected to severe seasonal monsoonal silting. Draft is restricted from 8.8m down to 8.0m during June-October.
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px,1fr))",
                          gap: "0.75rem",
                        }}
                      >
                        {[
                          {
                            label: "Specialization",
                            value: port.specialization,
                          },
                          {
                            label: "Max Vessel Class",
                            value:
                              port.maxDraft >= 18
                                ? "Capesize"
                                : port.maxDraft >= 14
                                  ? "Panamax"
                                  : "Handysize",
                          },
                          {
                            label: "Crane Type",
                            value:
                              port.id === "GNGV"
                                ? "Grab + Conveyor"
                                : "Grab Crane",
                          },
                          {
                            label: "Operating Hours",
                            value: "24/7 — 3 Shifts",
                          },
                          { label: "Pilotage", value: "Compulsory" },
                          {
                            label: "Anchorage",
                            value:
                              port.id === "HALD"
                                ? "Limited — 8 vessels"
                                : "15+ vessels",
                          },
                        ].map((r, i) => (
                          <div
                            key={i}
                            style={{
                              background: "var(--bg-card)",
                              borderRadius: 8,
                              padding: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                marginBottom: 2,
                              }}
                            >
                              {r.label}
                            </div>
                            <div
                              style={{
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                              }}
                            >
                              {r.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ORIGIN PORT TRACKER ──────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "1rem",
          }}
        >
          <div className="section-title">
            <MapPin size={15} color="var(--accent-secondary)" />
            Global Origin Port Tracker
          </div>
          <span className="badge badge-red" style={{ marginLeft: 4 }}>
            2 Weather Alerts
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: "1rem",
          }}
        >
          {originPorts.map((port) => (
            <div
              key={port.id}
              className="card"
              style={{
                borderColor: port.weatherAlert
                  ? "rgba(239,68,68,0.3)"
                  : "var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>
                    {port.flag}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        lineHeight: 1,
                      }}
                    >
                      {port.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {port.country}
                    </div>
                  </div>
                </div>
                <WeatherBadge
                  weather={port.weather}
                  alert={port.weatherAlert}
                />
              </div>

              {/* Utilization */}
              <div style={{ marginBottom: "0.875rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Utilization
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color:
                        port.utilization > 85
                          ? "#ef4444"
                          : port.utilization > 70
                            ? "#f59e0b"
                            : "#10b981",
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 6,
                }}
              >
                {[
                  { label: "Loaders", value: port.loaders },
                  { label: "Queue", value: `${port.queue} vsl` },
                  { label: "Avg Delay", value: `${port.avgDelay}d` },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg-primary)",
                      borderRadius: 7,
                      padding: "0.5rem 0.6rem",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        marginBottom: 2,
                      }}
                    >
                      {r.label}
                    </div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {r.value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                >
                  Next slot:{" "}
                  <strong style={{ color: "var(--text-secondary)" }}>
                    {port.nextAvailable}
                  </strong>
                </span>
                {port.weatherAlert && (
                  <span className="badge badge-red">
                    <AlertTriangle size={9} /> Alert
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MACRO FEED ──────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        {/* Bunker prices */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "1.125rem",
            }}
          >
            <Droplets size={15} color="#22d3ee" />
            <div className="section-title">VLSFO Bunker Prices</div>
          </div>

          {bunkerData.map((hub) => (
            <div
              key={hub.hub}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 1fr 1fr 28px",
                alignItems: "center",
                gap: 8,
                padding: "0.75rem",
                borderRadius: 8,
                marginBottom: 6,
                background: "var(--bg-primary)",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {hub.hub}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  VLSFO
                </div>
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "#22d3ee",
                  }}
                >
                  ${hub.vlsfo}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  MGO
                </div>
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "#f59e0b",
                  }}
                >
                  ${hub.mgo}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  IFO 380
                </div>
                <div
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                  }}
                >
                  ${hub.ifo380}
                </div>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.125rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart2 size={15} color="var(--accent-primary)" />
              <div className="section-title">Baltic Dry Index</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#10b981",
                }}
              >
                1,603
              </span>
              <span className="badge badge-green">
                <TrendingUp size={10} />
                +2.1%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={bdiHistory}
              margin={{ top: 4, right: 10, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="bdiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(99,102,241,0.05)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                domain={[1200, 1800]}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                name="BDI"
                dataKey="bdi"
                stroke="#6366f1"
                fill="url(#bdiGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal chart */}
      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: "1.125rem",
          }}
        >
          <Activity size={15} color="#10b981" />
          <div className="section-title">
            Seasonal Demand & Rate Patterns — India EC Coal (Full Year)
          </div>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart
            data={seasonalData}
            margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(99,102,241,0.05)"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={(v) => `$${v}`}
              domain={[10, 22]}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
            <Bar
              yAxisId="left"
              name="Demand Index"
              dataKey="demand"
              fill="rgba(99,102,241,0.45)"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="right"
              name="Avg Rate $/MT"
              type="monotone"
              dataKey="rate"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ fill: "#10b981", r: 3 }}
            />
          </BarChart>
        </ResponsiveContainer>

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginTop: "0.875rem",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              period: "Sep–Nov",
              label: "Peak Season",
              cls: "badge-red",
              note: "Elevated rates +20–25%",
            },
            {
              period: "Apr–Aug",
              label: "Shoulder Season",
              cls: "badge-amber",
              note: "Moderate activity",
            },
            {
              period: "Jan–Mar",
              label: "Off Season",
              cls: "badge-green",
              note: "Best entry window",
            },
          ].map((s) => (
            <div
              key={s.period}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
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
