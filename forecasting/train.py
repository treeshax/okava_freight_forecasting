"""
train.py
ML Model training engine for Charter-IQ.
Fits direct multi-horizon LightGBM regressors (7d, 14d, 30d) and seasonal trend baselines
per (route, vessel_class) pair using 365-day feature store observations.
"""

import sys
import os
import pickle
import logging
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_percentage_error
import lightgbm as lgb

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import SessionLocal, FeatureStore
from forecasting.hf_uploader import HuggingFaceClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

# Standardized feature columns
FEATURE_COLS = [
    "rate_lag1", "rate_lag3", "rate_lag7", "rate_lag14",
    "rate_roll_mean", "rate_roll_std", "rate_momentum_7",
    "month_sin", "month_cos", "monsoon_flag",
    "congestion", "congestion_delta",
    "weather_alert", "geopolitics_index",
    "fuel_cost", "fuel_ratio"
]

HORIZONS = [7, 14, 30]

# Conditional import of Prophet with robust seasonal trend fallback
from forecasting.baseline import SeasonalTrendBaseline

try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False
    logger.info("Prophet package not installed. Using SeasonalTrendBaseline.")


def load_data_from_db() -> pd.DataFrame:
    """Loads feature store records into a sorted pandas DataFrame."""
    db = SessionLocal()
    try:
        query = db.query(FeatureStore)
        df = pd.read_sql(query.statement, db.bind)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(["origin", "destination", "vessel_class", "date"]).reset_index(drop=True)
        return df
    finally:
        db.close()


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineers multi-horizon forward targets, lagged rates, rolling volatility,
    cyclical calendar indicators, congestion momentum, and fuel sensitivity ratios.
    """
    grp = df.groupby(["origin", "destination", "vessel_class"])

    # 1. Forward targets for direct multi-horizon forecasting
    df["target_7d"] = grp["freight_rate"].shift(-7)
    df["target_14d"] = grp["freight_rate"].shift(-14)
    df["target_30d"] = grp["freight_rate"].shift(-30)

    # 2. Lagged rates
    df["rate_lag1"] = grp["freight_rate"].shift(1)
    df["rate_lag3"] = grp["freight_rate"].shift(3)
    df["rate_lag7"] = grp["freight_rate"].shift(7)
    df["rate_lag14"] = grp["freight_rate"].shift(14)

    # 3. Rolling statistics
    df["rate_roll_mean"] = grp["freight_rate"].transform(lambda s: s.rolling(7, min_periods=1).mean())
    df["rate_roll_std"] = grp["freight_rate"].transform(lambda s: s.rolling(14, min_periods=2).std()).fillna(0.3)
    df["rate_momentum_7"] = df["rate_lag1"] - df["rate_lag7"]

    # 4. Cyclical date features & Indian monsoon flag
    months = df["date"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * months / 12.0)
    df["month_cos"] = np.cos(2 * np.pi * months / 12.0)
    df["monsoon_flag"] = months.isin([6, 7, 8, 9]).astype(int)

    # 5. Congestion acceleration
    cong_mean = grp["congestion"].transform(lambda s: s.rolling(7, min_periods=1).mean())
    df["congestion_delta"] = df["congestion"] - cong_mean

    # 6. Exogenous market features
    df["weather_alert"] = df["weather_alert"].astype(int)
    df["fuel_ratio"] = df["fuel_cost"] / (df["freight_rate"] * 30.0 + 1e-5)

    # Backfill initial lags cleanly
    lag_cols = ["rate_lag1", "rate_lag3", "rate_lag7", "rate_lag14", "rate_momentum_7"]
    df[lag_cols] = grp[lag_cols].transform(lambda s: s.bfill().fillna(0))

    return df


def train_route_models():
    """
    Trains horizon-specific forecasters (7d, 14d, 30d) and seasonal baselines
    for each unique route and vessel class.
    """
    df = load_data_from_db()
    if df.empty:
        logger.warning("No data in feature store to train models. Please run api/seed.py first.")
        return

    logger.info(f"Loaded {len(df)} feature store rows. Engineering features...")
    df = create_features(df)

    routes = df.groupby(["origin", "destination"]).size().index.tolist()
    vessel_classes = df["vessel_class"].unique().tolist()
    hf_client = HuggingFaceClient()

    logger.info(f"Training models for {len(routes)} routes across {len(vessel_classes)} vessel classes...")

    for origin, dest in routes:
        for vessel in vessel_classes:
            sub = df[(df["origin"] == origin) & (df["destination"] == dest) & (df["vessel_class"] == vessel)].copy()
            if len(sub) < 45:
                continue

            model_key = f"{origin.lower()}_{dest.lower()}_{vessel.lower()}"
            sub = sub.sort_values("date").reset_index(drop=True)

            # ── 1. Train Multi-Horizon LightGBM Models ─────────────────
            for h in HORIZONS:
                target_col = f"target_{h}d"
                valid_mask = sub[target_col].notna()
                sub_h = sub[valid_mask].copy()

                if len(sub_h) < 30:
                    continue

                X = sub_h[FEATURE_COLS]
                y = sub_h[target_col]

                # Holdout validation (last 20 valid observations)
                holdout = min(20, len(sub_h) // 5)
                train_len = len(sub_h) - holdout
                X_train, y_train = X.iloc[:train_len], y.iloc[:train_len]
                X_val, y_val = X.iloc[train_len:], y.iloc[train_len:]

                lgb_model = lgb.LGBMRegressor(
                    n_estimators=75,
                    learning_rate=0.06,
                    num_leaves=15,
                    min_child_samples=5,
                    random_state=42,
                    verbosity=-1
                )
                lgb_model.fit(X_train, y_train)

                val_preds = lgb_model.predict(X_val)
                mape = mean_absolute_percentage_error(y_val, val_preds)
                residuals = y_val.values - val_preds
                residual_std = float(np.std(residuals)) if len(residuals) > 1 else 0.85

                # Retrain on full series for production inference
                lgb_model.fit(X, y)

                # Persist model bundle containing residual_std for calibrated CIs
                artifact = {
                    "model": lgb_model,
                    "horizon_days": h,
                    "residual_std": round(residual_std, 3),
                    "val_mape": round(float(mape), 4),
                    "feature_cols": FEATURE_COLS,
                    "trained_at": datetime.utcnow().isoformat()
                }

                horizon_path = os.path.join(MODELS_DIR, f"{model_key}_lgb_{h}d.pkl")
                with open(horizon_path, "wb") as f:
                    pickle.dump(artifact, f)

                # Also save legacy file path pointing to the 14-day model
                if h == 14:
                    legacy_path = os.path.join(MODELS_DIR, f"{model_key}_lgb.pkl")
                    with open(legacy_path, "wb") as f:
                        pickle.dump(lgb_model, f)

            # ── 2. Train Seasonal Trend Baseline (Prophet / Ridge) ────
            prophet_df = sub[["date", "freight_rate"]].rename(columns={"date": "ds", "freight_rate": "y"})
            prophet_df["congestion"] = sub["congestion"]
            prophet_df["geopolitics"] = sub["geopolitics_index"]
            prophet_df["fuel_cost"] = sub["fuel_cost"]

            if HAS_PROPHET:
                prophet_model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
                prophet_model.add_regressor("congestion")
                prophet_model.add_regressor("geopolitics")
                prophet_model.add_regressor("fuel_cost")
                prophet_model.fit(prophet_df)
            else:
                prophet_model = SeasonalTrendBaseline()
                prophet_model.add_regressor("congestion")
                prophet_model.add_regressor("geopolitics")
                prophet_model.add_regressor("fuel_cost")
                prophet_model.fit(prophet_df)

            prophet_path = os.path.join(MODELS_DIR, f"{model_key}_prophet.pkl")
            with open(prophet_path, "wb") as f:
                pickle.dump(prophet_model, f)

    logger.info("Multi-horizon training complete. All horizon models saved to models/ directory.")


if __name__ == "__main__":
    train_route_models()
