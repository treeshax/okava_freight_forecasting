"""
train.py
ML Model training engine. Fits LightGBM and Prophet baselines per (route, vessel_class).
Complies with paper recommendations (MDPI Gradient Boosting, 2025) and registers version states.
"""

import sys
import os
import pickle
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.metrics import mean_absolute_percentage_error
import lightgbm as lgb
from prophet import Prophet

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import SessionLocal, FeatureStore
from forecasting.hf_uploader import HuggingFaceClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

def load_data_from_db() -> pd.DataFrame:
    """
    Loads features from feature store into pandas DataFrame.
    """
    db = SessionLocal()
    try:
        query = db.query(FeatureStore)
        df = pd.read_sql(query.statement, db.bind)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        return df
    finally:
        db.close()

def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Creates lagged rate features and rolling window averages.
    """
    df["rate_lag1"] = df.groupby(["origin", "destination", "vessel_class"])["freight_rate"].shift(1)
    df["rate_lag3"] = df.groupby(["origin", "destination", "vessel_class"])["freight_rate"].shift(3)
    df["rate_lag7"] = df.groupby(["origin", "destination", "vessel_class"])["freight_rate"].shift(7)
    df["rate_roll_mean"] = df.groupby(["origin", "destination", "vessel_class"])["freight_rate"].transform(
        lambda s: s.rolling(5, min_periods=1).mean()
    )
    # Fill NAs
    df = df.fillna(method="bfill").fillna(0)
    return df

def train_route_models():
    """
    Trains forecasters for every unique route and vessel class combination.
    """
    df = load_data_from_db()
    if df.empty:
        logger.warning("No data in feature store to train models. Please run seed script first.")
        return
    
    df = create_features(df)
    routes = df.groupby(["origin", "destination"]).size().index.tolist()
    vessel_classes = df["vessel_class"].unique().tolist()
    
    hf_client = HuggingFaceClient()
    
    # Save training dataset to hub for audit trails
    hf_client.push_dataset_to_hub(df, "training_set")
    
    for origin, dest in routes:
        for vessel in vessel_classes:
            sub = df[(df["origin"] == origin) & (df["destination"] == dest) & (df["vessel_class"] == vessel)]
            if len(sub) < 14:
                # Need at least 2 weeks of observations to train
                continue
            
            logger.info(f"Training models for {origin} -> {dest} ({vessel}), records={len(sub)}")
            
            # 1. Train LightGBM model
            feature_cols = [
                "rate_lag1", "rate_lag3", "rate_lag7", "rate_roll_mean", 
                "congestion", "weather_alert", "geopolitics_index", "fuel_cost"
            ]
            X = sub[feature_cols]
            y = sub["freight_rate"]
            
            # Simple train/test split (last 7 days as holdout)
            train_idx = len(sub) - 7
            X_train, y_train = X.iloc[:train_idx], y.iloc[:train_idx]
            X_test, y_test = X.iloc[train_idx:], y.iloc[train_idx:]
            
            lgb_model = lgb.LGBMRegressor(
                n_estimators=50, 
                learning_rate=0.08,
                num_leaves=15, 
                random_state=42,
                verbosity=-1
            )
            lgb_model.fit(X_train, y_train)
            
            # Evaluate LightGBM
            preds = lgb_model.predict(X_test)
            mape = mean_absolute_percentage_error(y_test, preds)
            
            # Retrain on full series for production
            lgb_model.fit(X, y)
            
            # 2. Train Prophet baseline model
            prophet_df = sub[["date", "freight_rate"]].rename(columns={"date": "ds", "freight_rate": "y"})
            prophet_model = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=False)
            # Add GDELT and AIS indicators as regressors
            prophet_df["congestion"] = sub["congestion"]
            prophet_df["geopolitics"] = sub["geopolitics_index"]
            prophet_model.add_regressor("congestion")
            prophet_model.add_regressor("geopolitics")
            
            prophet_model.fit(prophet_df)
            
            # Save artifacts
            model_key = f"{origin.lower()}_{dest.lower()}_{vessel.lower()}"
            lgb_path = os.path.join(MODELS_DIR, f"{model_key}_lgb.pkl")
            prophet_path = os.path.join(MODELS_DIR, f"{model_key}_prophet.pkl")
            
            with open(lgb_path, "wb") as f:
                pickle.dump(lgb_model, f)
            with open(prophet_path, "wb") as f:
                pickle.dump(prophet_model, f)
                
            logger.info(f"Model {model_key} trained. Test MAPE: {mape:.4f}")
            
            # Push to Hugging Face
            hf_client.upload_model_artifact(lgb_path, f"models/{model_key}_lgb.pkl")
            hf_client.upload_model_artifact(prophet_path, f"models/{model_key}_prophet.pkl")

if __name__ == "__main__":
    train_route_models()
