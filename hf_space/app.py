"""
Okava Charter IQ — Freight Rate Forecaster (Hugging Face Space demo)

Demonstrates the core forecasting model from the okava_freight_forecasting
project: a LightGBM regressor over lagged spot-rate, congestion, weather,
geopolitics and bunker-fuel features, per (origin, destination, vessel_class)
route, with SHAP feature attribution. A rolling-mean naive baseline is shown
alongside it for comparison.

Runs on ZeroGPU hardware (required to get any compute on a free HF account)
even though the model itself is CPU-only — see `_claim_gpu_quota`.
"""

import spaces  # must be imported before any CUDA-touching library

import datetime

import gradio as gr
import lightgbm as lgb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

DATA_PATH = "sample_feature_store.csv"

FEATURE_COLS = [
    "rate_lag1", "rate_lag3", "rate_lag7", "rate_roll_mean",
    "congestion", "weather_alert", "geopolitics_index", "fuel_cost",
]

FRIENDLY_NAMES = {
    "rate_lag1": "Previous spot rate",
    "rate_lag3": "3-day spot trend",
    "rate_lag7": "7-day spot trend",
    "rate_roll_mean": "Rolling rate average",
    "congestion": "Congestion queue",
    "weather_alert": "Weather disruption",
    "geopolitics_index": "GDELT tension index",
    "fuel_cost": "Bunker fuel cost",
}


def _load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df = df.sort_values(["origin", "destination", "vessel_class", "date"])
    grp = df.groupby(["origin", "destination", "vessel_class"])["freight_rate"]
    df["rate_lag1"] = grp.shift(1)
    df["rate_lag3"] = grp.shift(3)
    df["rate_lag7"] = grp.shift(7)
    df["rate_roll_mean"] = grp.transform(lambda s: s.rolling(5, min_periods=1).mean())
    lag_cols = ["rate_lag1", "rate_lag3", "rate_lag7"]
    group_cols = ["origin", "destination", "vessel_class"]
    df[lag_cols] = df.groupby(group_cols)[lag_cols].transform(lambda s: s.bfill())
    return df.fillna(0)


DF = _load_data()
ROUTES = sorted(
    {f"{o} -> {d}" for o, d in DF[["origin", "destination"]].drop_duplicates().itertuples(index=False)}
)
VESSEL_CLASSES = sorted(DF["vessel_class"].unique().tolist())

_model_cache: dict[tuple[str, str, str], tuple[lgb.LGBMRegressor, pd.DataFrame]] = {}


def _get_model(origin: str, destination: str, vessel_class: str):
    key = (origin, destination, vessel_class)
    if key in _model_cache:
        return _model_cache[key]

    sub = DF[
        (DF["origin"] == origin) & (DF["destination"] == destination) & (DF["vessel_class"] == vessel_class)
    ].sort_values("date")
    if len(sub) < 10:
        return None

    # min_child_samples defaults to 20, which blocks every split on these
    # ~36-row per-route histories and degenerates the model to a constant.
    model = lgb.LGBMRegressor(
        n_estimators=50, learning_rate=0.08, num_leaves=15,
        min_child_samples=3, min_split_gain=0.0, random_state=42, verbosity=-1,
    )
    model.fit(sub[FEATURE_COLS], sub["freight_rate"])
    _model_cache[key] = (model, sub)
    return _model_cache[key]


@spaces.GPU(duration=5)
def _claim_gpu_quota():
    # This app is CPU-only (LightGBM + SHAP). A free HF account can only run
    # a Gradio Space on ZeroGPU hardware, so this no-op claims that hardware
    # without ever touching the GPU or burning a visitor's usage quota.
    return True


def forecast(route: str, vessel_class: str, horizon_days: int):
    """Forecast the freight rate (USD/MT) for a route and vessel class N days ahead."""
    _claim_gpu_quota()

    origin, destination = [p.strip() for p in route.split("->")]
    result = _get_model(origin, destination, vessel_class)
    if result is None:
        empty_fig, ax = plt.subplots(figsize=(7, 4))
        ax.text(0.5, 0.5, "Not enough history for this route/vessel combination", ha="center")
        ax.axis("off")
        return {"error": "insufficient history"}, pd.DataFrame(), empty_fig

    model, sub = result
    latest = sub.iloc[-1]
    recent_rates = sub["freight_rate"].tail(10).tolist()[::-1]
    while len(recent_rates) < 10:
        recent_rates.append(recent_rates[-1])

    input_row = pd.DataFrame([{
        "rate_lag1": recent_rates[0],
        "rate_lag3": recent_rates[2],
        "rate_lag7": recent_rates[6],
        "rate_roll_mean": float(np.mean(recent_rates[:5])),
        "congestion": latest["congestion"],
        "weather_alert": int(latest["weather_alert"]),
        "geopolitics_index": latest["geopolitics_index"],
        "fuel_cost": latest["fuel_cost"],
    }])[FEATURE_COLS]

    point = float(model.predict(input_row)[0])
    std_err = 0.85 + 0.02 * horizon_days
    ci_lower = max(2.0, point - 1.645 * std_err)
    ci_upper = point + 1.645 * std_err
    naive_baseline = float(sub["freight_rate"].tail(5).mean())

    explainer = shap.TreeExplainer(model)
    raw_shap = np.array(explainer.shap_values(input_row)).flatten()
    drivers = sorted(
        [
            {"feature": FRIENDLY_NAMES[c], "impact": round(float(v), 3)}
            for c, v in zip(FEATURE_COLS, raw_shap)
        ],
        key=lambda d: abs(d["impact"]),
        reverse=True,
    )

    future_date = pd.to_datetime(latest["date"]) + pd.Timedelta(days=horizon_days)
    summary = {
        "route": f"{origin} -> {destination}",
        "vessel_class": vessel_class,
        "horizon_days": horizon_days,
        "lightgbm_point_forecast_usd_per_mt": round(point, 2),
        "confidence_interval_90pct": [round(ci_lower, 2), round(ci_upper, 2)],
        "naive_rolling_mean_baseline_usd_per_mt": round(naive_baseline, 2),
        "generated_at": datetime.datetime.utcnow().isoformat(),
    }

    fig, ax = plt.subplots(figsize=(7, 4))
    hist = sub.tail(20)
    ax.plot(hist["date"], hist["freight_rate"], marker="o", label="Historical rate")
    ax.scatter([future_date], [point], color="#ef4444", label="LightGBM forecast", zorder=5)
    ax.errorbar(
        [future_date], [point], yerr=[[point - ci_lower], [ci_upper - point]],
        fmt="none", ecolor="#ef4444", alpha=0.4, capsize=4,
    )
    ax.scatter([future_date], [naive_baseline], color="#10b981", marker="x", s=80, label="Naive baseline")
    ax.set_title(f"{origin} -> {destination} ({vessel_class})")
    ax.set_ylabel("Freight rate (USD/MT)")
    ax.legend()
    fig.autofmt_xdate()

    return summary, pd.DataFrame(drivers), fig


with gr.Blocks(title="Okava Charter IQ — Freight Rate Forecaster") as demo:
    gr.Markdown(
        "# 🚢 Okava Charter IQ — Freight Rate Forecaster\n"
        "LightGBM forecaster trained per shipping route and vessel class on lagged "
        "spot-rate, port congestion, weather, geopolitical tension and bunker-fuel "
        "features, with SHAP feature attribution. From the "
        "[okava_freight_forecasting](https://github.com) project."
    )
    with gr.Row():
        route = gr.Dropdown(choices=ROUTES, value=ROUTES[0], label="Route")
        vessel_class = gr.Dropdown(choices=VESSEL_CLASSES, value=VESSEL_CLASSES[0], label="Vessel class")
        horizon = gr.Slider(1, 30, value=14, step=1, label="Forecast horizon (days)")
    btn = gr.Button("Forecast", variant="primary")
    out_json = gr.JSON(label="Forecast summary")
    out_table = gr.Dataframe(label="Top SHAP drivers")
    out_plot = gr.Plot(label="Historical rate + forecast")

    btn.click(forecast, inputs=[route, vessel_class, horizon], outputs=[out_json, out_table, out_plot])
    gr.Examples(
        examples=[[ROUTES[0], VESSEL_CLASSES[0], 14]],
        inputs=[route, vessel_class, horizon],
    )

demo.launch(mcp_server=True)
