import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Brain,
  CircleHelp,
  DollarSign,
  Gauge,
  TrendingDown,
} from "lucide-react";
import { freightRateData } from "../data/mockData";

const forecastData = freightRateData.map((point) => ({
  day: point.day.replace("Day ", ""),
  p10: point.forecast_panamax ? point.forecast_panamax - 1.2 : null,
  p50: point.forecast_panamax,
  p90: point.forecast_panamax ? point.forecast_panamax + 1.5 : null,
  band: point.forecast_panamax ? 2.7 : null,
  historical: point.panamax,
}));

const InfoLabel = ({ children, tip }) => (
  <span className="info-label">
    {children}
    <span className="tooltip">
      <CircleHelp size={12} />
      {tip}
    </span>
  </span>
);

const ForecastTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload
        .filter((item) => item.value != null)
        .map((item) => (
          <div key={item.dataKey}>
            <span style={{ color: item.color }}>{item.name}</span>
            <b>${item.value.toFixed(2)}/MT</b>
          </div>
        ))}
    </div>
  );
};

export default function AnalyticsPortal() {
  return (
    <div className="page-shell analytics-shell">
      <div className="page-heading">
        <div className="eyebrow">
          <Brain size={16} /> EXPLAINABLE ANALYTICS
        </div>
        <h1>Rate Forecasting & Model Explainability</h1>
        <p className="section-sub">
          A probabilistic view of Panamax coal freight, with the drivers behind
          every recommendation.
        </p>
      </div>

      <div className="analytics-grid">
        <section className="card chart-card analytics-main">
          <div className="card-heading">
            <div>
              <div className="section-title">
                <Activity size={15} color="var(--accent-cyan)" />
                90-Day Probabilistic Forecast
              </div>
              <p className="section-sub">Panamax coal route benchmark · $/MT</p>
            </div>
            <span className="badge badge-cyan">10–90% confidence</span>
          </div>
          <ResponsiveContainer width="100%" height={330}>
            <AreaChart
              data={forecastData}
              margin={{ top: 16, right: 16, left: 0, bottom: 6 }}
            >
              <defs>
                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis
                domain={[8, 18]}
                tickFormatter={(value) => `$${value}`}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<ForecastTooltip />} />
              <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              <ReferenceLine
                y={14.1}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "Target budget",
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
              <ReferenceLine
                y={13.6}
                stroke="#94a3b8"
                strokeDasharray="2 4"
                label={{
                  value: "Historical average",
                  fill: "#94a3b8",
                  fontSize: 10,
                }}
              />
              <Area
                name="10th percentile"
                dataKey="p10"
                stackId="confidence"
                stroke="none"
                fill="transparent"
                connectNulls={false}
              />
              <Area
                name="10–90% band"
                dataKey="band"
                stackId="confidence"
                stroke="none"
                fill="url(#confidenceBand)"
                connectNulls={false}
              />
              <Line
                name="50th percentile"
                dataKey="p50"
                stroke="#22d3ee"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
              />
              <Line
                name="Historical spot"
                dataKey="historical"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <div className="section-title">
            <Gauge size={15} color="var(--accent-primary)" />
            Model confidence
          </div>
          <div className="big-number">
            87.3<span>%</span>
          </div>
          <p className="section-sub">Backtested directional accuracy</p>
          <div className="confidence-meter">
            <span style={{ width: "87.3%" }} />
          </div>
          <div className="metric-list">
            <div>
              <span>Forecast horizon</span>
              <b>90 days</b>
            </div>
            <div>
              <span>Route coverage</span>
              <b>18 lanes</b>
            </div>
            <div>
              <span>Last refresh</span>
              <b>08:42 IST</b>
            </div>
          </div>
        </section>
      </div>

      <div className="analytics-grid lower-grid">
        <section className="card">
          <div className="card-heading">
            <div className="section-title">
              <TrendingDown size={15} color="#10b981" />
              SHAP feature attribution
            </div>
            <span className="badge badge-purple">Explainable AI</span>
          </div>
          <p className="section-sub">
            What moved the next 14-day rate forecast.
          </p>
          <div className="shap-list">
            {[
              ["Bunker Fuel Delta", 82, "+$0.74/MT", "#f59e0b"],
              ["BDI Index", 68, "-$0.52/MT", "#10b981"],
              ["Congestion Queue", 49, "+$0.31/MT", "#ef4444"],
              ["Seasonality", 31, "+$0.18/MT", "#22d3ee"],
            ].map(([name, value, impact, color]) => (
              <div className="shap-row" key={name}>
                <div>
                  <InfoLabel tip="Explaining how much each market factor influenced this forecast.">
                    {name === "Seasonality" ? "Seasonality" : name}
                  </InfoLabel>
                  <span>{impact}</span>
                </div>
                <div className="shap-track">
                  <i style={{ width: `${value}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="card roi-card">
          <div className="section-title">
            <DollarSign size={15} color="#10b981" />
            Backtest ROI · 12 months
          </div>
          <p className="section-sub">
            Historical spot spend compared with AI-timed procurement.
          </p>
          <div className="roi-number">
            $2.84M <span>saved</span>
          </div>
          <div className="roi-bars">
            <div>
              <span>Historical spot spend</span>
              <b>$38.60M</b>
            </div>
            <div>
              <span>AI-optimized timing</span>
              <b>$35.76M</b>
            </div>
          </div>
          <div className="roi-foot">
            <strong>7.4% total savings</strong>
            <span>Equivalent to 192,000 MT of avoided cost</span>
          </div>
        </section>
      </div>
    </div>
  );
}
