"""
service.py
FastAPI microservice for the RL-Based Verification & Optimization Layer.
Exposes endpoints /verify and /recalibrate.
Exposed on port 8001 inside the rl-verifier Docker container.
"""

import sys
import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rl_verifier.env import ChartingVerificationEnv
from rl_verifier.reward import compute_recalibration_reward
from api.db import SessionLocal, RecalibrationLog, FeatureStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RL-Based Verification & Optimization Layer",
    description="Microservice evaluating forecasting errors and executing calibration updates.",
    version="1.4.2"
)

class ForecastItem(BaseModel):
    route: str
    vessel_class: str
    point_forecast: float
    realized_rate: float
    ci_lower: float
    ci_upper: float

class VerificationBatch(BaseModel):
    model_version: str
    items: List[ForecastItem]

class RecalibrateRequest(BaseModel):
    origin: str
    destination: str
    vessel_class: str
    horizon_days: int

@app.post("/verify")
def verify_forecasts(batch: VerificationBatch):
    """
    Evaluates forecasting errors and logs performance benchmarks.
    """
    if not batch.items:
        raise HTTPException(status_code=400, detail="Empty batch items.")
        
    logger.info(f"Received verification batch for model version: {batch.model_version}")
    
    total_mape = 0.0
    captured_count = 0
    total_reward = 0.0
    
    db = SessionLocal()
    try:
        for item in batch.items:
            # Calculate MAPE
            mape = abs(item.point_forecast - item.realized_rate) / item.realized_rate
            total_mape += mape
            
            # Check calibration capture
            captured = (item.realized_rate >= item.ci_lower) and (item.realized_rate <= item.ci_upper)
            if captured:
                captured_count += 1
                
            # Compute reward signal (Guo et al. 2025 formula)
            reward = compute_recalibration_reward(
                realized_rate=item.realized_rate,
                forecasted_rate=item.point_forecast,
                ci_lower=item.ci_lower,
                ci_upper=item.ci_upper,
                ci_multiplier=1.0
            )
            total_reward += reward
            
        avg_mape = total_mape / len(batch.items)
        calibration_rate = captured_count / len(batch.items)
        avg_reward = total_reward / len(batch.items)
        
        # Log calibration run to database
        log_entry = RecalibrationLog(
            model_version=batch.model_version,
            reward=round(avg_reward, 4),
            mape=round(avg_mape * 100, 2),  # percentage
            ci_calibration=round(calibration_rate * 100, 2)  # percentage
        )
        db.add(log_entry)
        db.commit()
        
        return {
            "status": "success",
            "evaluated_items": len(batch.items),
            "mape_percentage": round(avg_mape * 100, 2),
            "ci_calibration_percentage": round(calibration_rate * 100, 2),
            "recalibration_reward": round(avg_reward, 4),
            "action_required": bool(avg_mape > 0.12 or calibration_rate < 0.80)
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Verification logging failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.post("/recalibrate")
def trigger_recalibration(request: RecalibrateRequest):
    """
    Runs a Gymnasium policy step to return adjusted weights and confidence bounds.
    """
    logger.info(f"Triggering RL optimization pass for: {request.origin}->{request.destination} ({request.vessel_class})")
    
    db = SessionLocal()
    try:
        # Load recent data to formulate Gymnasium state observation vector
        features = db.query(FeatureStore).filter(
            FeatureStore.origin == request.origin,
            FeatureStore.destination == request.destination,
            FeatureStore.vessel_class == request.vessel_class.lower()
        ).order_by(FeatureStore.date.desc()).limit(15).all()
        
        if len(features) < 2:
            # Fallback scaling values if database lacks historical depth
            return {
                "status": "recalibrated",
                "ci_multiplier": 1.15,
                "lgb_weight": 0.75,
                "prophet_weight": 0.25,
                "retrain_triggered": False,
                "reason": "Default calibration fallback applied (insufficient dataset depth)."
            }
            
        # Formulate environment step inputs
        records = []
        for f in reversed(features):
            records.append({
                "forecast": f.freight_rate * 1.02, # simulated prediction
                "actual": f.freight_rate,
                "congestion": float(f.congestion),
                "geopolitics": float(f.geopolitics_index)
            })
            
        env = ChartingVerificationEnv(historical_data=records)
        env.reset()
        
        # Simulate Gym PPO step action selection based on observation
        # In full production we load model weights (PPO), here we run env step directly
        # Action discrete choice is deterministic for state spikes
        mape_recent = abs(features[0].freight_rate - features[1].freight_rate) / features[1].freight_rate
        
        # Decide actions based on threshold logic mimicking PPO policy outputs:
        ci_act = 2 if mape_recent > 0.08 else (0 if mape_recent < 0.02 else 1)
        weight_act = 0 if mape_recent > 0.06 else 1  # Shift weight towards Prophet baseline on high volatility
        retrain_act = 1 if mape_recent > 0.15 else 0
        
        obs, reward, term, trunc, info = env.step([ci_act, weight_act, retrain_act])
        
        return {
            "status": "recalibrated",
            "ci_multiplier": round(float(info["ci_multiplier"]), 3),
            "lgb_weight": round(float(info["lgb_weight"]), 3),
            "prophet_weight": round(float(1.0 - info["lgb_weight"]), 3),
            "retrain_triggered": bool(info["retrain_triggered"]),
            "step_reward": round(float(reward), 4)
        }
    except Exception as e:
        logger.error(f"RL Recalibration query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    logger.info(f"Booting RL Verification microservice on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
