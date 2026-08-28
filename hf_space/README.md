---
title: Okava Charter IQ Freight Forecaster
emoji: 🚢
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 6.26.0
app_file: app.py
short_description: LightGBM dry-bulk freight rate forecaster with SHAP
python_version: "3.12"
startup_duration_timeout: 30m
---

# Okava Charter IQ — Freight Rate Forecaster

A live demo of the forecasting model from the `okava_freight_forecasting`
project: a LightGBM regressor trained per (origin, destination, vessel class)
route on lagged spot-rate, port congestion, weather, geopolitical tension and
bunker-fuel features, with SHAP feature attribution and a rolling-mean naive
baseline for comparison.

Pick a route, vessel class and forecast horizon to see a point forecast, a
90% confidence band, the top SHAP drivers, and a chart of recent history vs.
the forecast.
