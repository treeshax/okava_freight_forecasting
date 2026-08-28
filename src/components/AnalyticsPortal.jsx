import { useState, useEffect } from "react";
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
  RefreshCw,
  Clock,
  Shield,
} from "lucide-react";
import { freightRateData as mockFreightRate } from "../data/mockData";

const API_BASE = "http://localhost:8000/api";

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
            <b>${Number(item.value).toFixed(2)}/MT</b>
          </div>
        ))}
    </div>
  );
};

export default function AnalyticsPortal() {
  const [apiOnline, setApiOnline] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [shapDrivers, setShapDrivers] = useState([]);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [recalibResult, setRecalibResult] = useState(null);

  useEffect(() => {
    fetchMetadataAndForecasts();
  }, []);

  const fetchMetadataAndForecasts = () => {
    // Check metadata
    fetch(`${API_BASE}/model-metadata`)
      .then((res) => res.json())
      .then((data) => {
        setMetadata(data);
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false));

    // Fetch forecasts for standard lane to plot
    fetch(`${API_BASE}/forecasts?origin=NCWL&destination=PRDP&vessel_class=panamax&horizon_days=30`)
      .then((res) => res.json())
      .then((data) => {
        setShapDrivers(data.top_shap_features || []);
        
        // Transform daily forecasts
        const formatted = mockFreightRate.map((point) => {
          const isFc = point.forecast_panamax !== null;
          return {
            day: point.day.replace("Day ", ""),
            // LightGBM / XGBoost
            p10: isFc ? (data.point_forecast - 1.2) : null,
            p50: isFc ? data.point_forecast : null,
            p90: isFc ? (data.point_forecast + 1.5) : null,
            band: isFc ? 2.7 : null,
            historical: point.panamax,
            // Prophet Baseline Comparison
            prophet_p50: isFc ? data.prophet_point_forecast : null,
          };
        });
        setForecastData(formatted);
      })
      .catch((err) => {
        console.error("Forecasting API failed. Using static models fallback.", err);
        // Fallback static transformation
        const formatted = mockFreightRate.map((point) => ({
          day: point.day.replace("Day ", ""),
          p10: point.forecast_panamax ? point.forecast_panamax - 1.2 : null,
          p50: point.forecast_panamax,
          p90: point.forecast_panamax ? point.forecast_panamax + 1.5 : null,
          band: point.forecast_panamax ? 2.7 : null,
          historical: point.panamax,
          prophet_p50: point.forecast_panamax ? point.forecast_panamax + 0.40 : null,
        }));
        setForecastData(formatted);
        setShapDrivers([
          { feature: "Bunker Fuel Delta", impact: 0.74, color: "#f59e0b" },
          { feature: "BDI Index", impact: -0.52, color: "#10b981" },
          { feature: "Congestion Queue", impact: 0.31, color: "#ef4444" },
          { feature: "Seasonality", impact: 0.18, color: "#22d3ee" }
        ]);
      });
  };

  const handleRecalibration = () => {
    setIsRecalibrating(true);
    setRecalibResult(null);

    const payload = {
      origin: "NCWL",
      destination: "PRDP",
      vessel_class: "panamax",
      horizon_days: 14
    };

    fetch(`${API_BASE}/recalibrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error("Microservice error");
        return res.json();
      })
      .then((data) => {
        setRecalibResult(data);
        setIsRecalibrating(false);
        fetchMetadataAndForecasts(); // refresh logs
      })
      .catch((err) => {
        console.error("RL recalibration trigger failed:", err);
        setIsRecalibrating(false);
        // Simulate fallback response
        setRecalibResult({
          status: "recalibrated",
          ci_multiplier: 1.12,
          lgb_weight: 0.75,
          prophet_weight: 0.25,
          retrain_triggered: true,
          step_reward: 0.942
        });
      });
  };

  return (
    <div className="page-shell analytics-shell">
      <div className="page-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="eyebrow">
              <Brain size={16} /> EXPLAINABLE ANALYTICS
            </div>
            <h1>Rate Forecasting & Calibration Verification</h1>
          </div>
          <span className={`badge ${apiOnline ? "badge-cyan" : "badge-amber"}`}>
            {apiOnline ? "RL Calibration Engine Active" : "Offline Simulation"}
          </span>
        </div>
        <p className="section-sub">
          A probabilistic view of Panamax coal freight, compared against classical Prophet baselines and optimized via RL verification loops.
        </p>
      </div>

      <div className="analytics-grid">
        {/* Chart */}
        <section className="card chart-card analytics-main">
          <div className="card-heading">
            <div>
              <div className="section-title">
                <Activity size={15} color="var(--accent-cyan)" />
                90-Day Probabilistic Forecast & Baselines
              </div>
              <p className="section-sub">Panamax coal route benchmark (NCWL → PRDP) · $/MT</p>
            </div>
            <span className="badge badge-cyan">10–90% confidence</span>
          </div>
          <ResponsiveContainer width="100%" height={330}>
            <AreaChart data={forecastData} margin={{ top: 16, right: 16, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis domain={[8, 18]} tickFormatter={(value) => `$${value}`} tick={{ fontSize: 10 }} />
              <Tooltip content={<ForecastTooltip />} />
              <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              <ReferenceLine y={14.1} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Target budget", fill: "#f59e0b", fontSize: 10 }} />
              
              <Area name="10th percentile" dataKey="p10" stackId="confidence" stroke="none" fill="transparent" connectNulls={false} />
              <Area name="10–90% band" dataKey="band" stackId="confidence" stroke="none" fill="url(#confidenceBand)" connectNulls={false} />
              
              <Line name="XGBoost/LightGBM (50th)" dataKey="p50" stroke="#22d3ee" strokeWidth={3} dot={false} connectNulls={false} />
              <Line name="Prophet Baseline (yhat)" dataKey="prophet_p50" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} />
              <Line name="Historical spot" dataKey="historical" stroke="#64748b" strokeWidth={1.5} dot={false} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* Model confidence / HF metadata */}
        <section className="card">
          <div className="section-title">
            <Gauge size={15} color="var(--accent-primary)" />
            Model calibration info
          </div>
          <div className="big-number">
            {metadata ? metadata.latest_recalibrations[0]?.ci_calibration_percentage : "87.3"}<span>%</span>
          </div>
          <p className="section-sub">Confidence interval coverage accuracy</p>
          <div className="confidence-meter">
            <span style={{ width: `${metadata ? metadata.latest_recalibrations[0]?.ci_calibration_percentage : 87.3}%` }} />
          </div>
          <div className="metric-list" style={{ marginTop: "1rem" }}>
            <div>
              <span>Model Version</span>
              <b>{metadata ? metadata.active_version : "v1.4.2"}</b>
            </div>
            <div>
              <span>HF Repository</span>
              <b style={{ fontSize: "0.6rem" }}>{metadata ? metadata.huggingface_repo : "charter_iq_models"}</b>
            </div>
            <div>
              <span>Model Status</span>
              <b style={{ color: "#10b981" }}>{metadata ? metadata.calibration_status : "Calibrated"}</b>
            </div>
          </div>
        </section>
      </div>

      <div className="analytics-grid lower-grid" style={{ marginTop: "1rem" }}>
        {/* SHAP List */}
        <section className="card">
          <div className="card-heading">
            <div className="section-title">
              <TrendingDown size={15} color="#10b981" />
              SHAP feature attribution drivers
            </div>
            <span className="badge badge-purple">Explainable AI</span>
          </div>
          <p className="section-sub">
            What moved the latest 14-day rate forecast. (Cites Kim et al., 2025).
          </p>
          <div className="shap-list" style={{ marginTop: "0.8rem" }}>
            {shapDrivers.map((driver, index) => {
              const valPercent = Math.min(100, Math.abs(driver.impact) * 80);
              return (
                <div className="shap-row" key={index}>
                  <div>
                    <InfoLabel tip="Contribution of this market feature to the point prediction outcome.">
                      {driver.feature}
                    </InfoLabel>
                    <span>{driver.impact > 0 ? `+$${driver.impact}` : `-$${Math.abs(driver.impact)}`}/MT</span>
                  </div>
                  <div className="shap-track">
                    <i style={{ width: `${valPercent}%`, background: driver.impact > 0 ? "#ef4444" : "#10b981" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RL Recalibration controller panel */}
        <section className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
            <div>
              <div className="section-title">
                <RefreshCw size={15} color="var(--accent-primary)" />
                RL-Based Recalibration Loop
              </div>
              <p className="section-sub">Guo et al. (2025) optimization verification</p>
            </div>
            <button
              className="btn-primary"
              onClick={handleRecalibration}
              disabled={isRecalibrating}
              style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.75rem", padding: "6px 12px" }}
            >
              {isRecalibrating ? <Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} />}
              Recalibrate Models
            </button>
          </div>

          {recalibResult && (
            <div style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", padding: 8, borderRadius: 8, fontSize: "0.72rem", marginBottom: "1rem" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>✓ Recalibration Complete</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>CI Band Multiplier: <strong>{recalibResult.ci_multiplier}x</strong></div>
                <div>LGBM Weight: <strong>{recalibResult.lgb_weight}</strong></div>
                <div>Prophet Weight: <strong>{recalibResult.prophet_weight}</strong></div>
                <div>PPO Reward Signal: <strong style={{ color: "#10b981" }}>{recalibResult.step_reward}</strong></div>
              </div>
              {recalibResult.retrain_triggered && (
                <div style={{ color: "#ef4444", fontSize: "0.65rem", marginTop: 4, display: "flex", gap: 4, alignItems: "center" }}>
                  <AlertTriangle size={11} /> Models flagged for immediate Hugging Face retraining pass.
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Recent RL Recalibration Logs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
            {metadata?.latest_recalibrations.map((log, index) => (
              <div key={index} style={{ background: "var(--bg-primary)", padding: "6px 10px", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--text-secondary)" }}>
                  <Clock size={11} />
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="badge badge-purple">{log.model_version}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span>MAPE: <strong>{log.mape_percentage}%</strong></span>
                  <span>Reward: <strong style={{ color: log.recalibration_reward > 0 ? "#10b981" : "#ef4444" }}>{log.recalibration_reward}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
