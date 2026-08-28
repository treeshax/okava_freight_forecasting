"""
main.py
Main REST API gateway for Charter-IQ.
Serves forecasting curves, cost-matching vessel rankings, risk alerts,
portfolio splits, and records HITL decision overrides.
"""

import sys
import os
import requests
import datetime
from fastapi import FastAPI, Depends, Query, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import get_db, HitlOverride, RecalibrationLog, init_db
from rules.engine import evaluate_route_rules
from forecasting.predictor import FreightPredictor
from matching.matcher import rank_eligible_vessels
from risk.alerts import evaluate_route_risk
from portfolio.laddering import generate_laddering_plan

init_db()

app = FastAPI(
    title="Charter-IQ Core API Gateways",
    description="Backend coordinator exposing REST routers to feed the procurement dashboard.",
    version="1.4.2"
)

# Enable CORS for React Vite local server calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RL_SERVICE_URL = os.getenv("RL_SERVICE_URL", "http://localhost:8001")
predictor = FreightPredictor()

@app.get("/api/forecasts")
def get_freight_forecast(
    origin: str = Query(..., description="NCWL, RICH, SAMA etc."),
    destination: str = Query(..., description="PRDP, VIZG, HALD etc."),
    vessel_class: str = Query("panamax", description="Vessel category"),
    horizon_days: int = Query(14, description="7, 14, or 30 days")
):
    """
    Returns probabilistic forecasts (point + bands) and SHAP drivers for a specific route.
    """
    res = predictor.predict_freight(origin, destination, vessel_class, horizon_days)
    if not res:
        raise HTTPException(status_code=500, detail="Inference run failed.")
    return res

@app.get("/api/vessel-port-rankings")
def get_vessel_rankings(
    origin: str = Query(..., description="Origin port code"),
    destination: str = Query(..., description="Discharge port code"),
    volume: float = Query(..., description="Cargo size in MT"),
    laycan_start: str = Query(..., description="YYYY-MM-DD laycan start date"),
    db: Session = Depends(get_db)
):
    """
    Filters vessels based on port constraints and ranks them by effective shipping cost.
    """
    try:
        laycan_date = datetime.datetime.strptime(laycan_start, "%Y-%m-%d").date()
    except ValueError:
        try:
            laycan_date = datetime.datetime.strptime(laycan_start, "%b %d").date()
            # Default to current year
            laycan_date = laycan_date.replace(year=datetime.date.today().year)
        except ValueError:
            laycan_date = datetime.date.today()
            
    rankings = rank_eligible_vessels(db, origin, destination, volume, laycan_date)
    return {
        "route": f"{origin} -> {destination}",
        "laycan": laycan_start,
        "volume_mt": volume,
        "rankings": rankings
    }

@app.get("/api/idle-risk-alerts")
def get_risk_indicators(
    origin: str = Query(...),
    destination: str = Query(...),
    vessel_class: str = Query("panamax"),
    db: Session = Depends(get_db)
):
    """
    Evaluates rolling rate volatility spikes and weather/congestion statuses.
    """
    risk_results = evaluate_route_risk(db, origin, destination, vessel_class)
    return risk_results

@app.get("/api/portfolio-strategy")
def get_portfolio_laddering(
    origin: str = Query(...),
    destination: str = Query(...),
    annual_volume: float = Query(300000.0),
    db: Session = Depends(get_db)
):
    """
    Computes CoA vs Spot distribution hedging plans.
    """
    plan = generate_laddering_plan(db, origin, destination, annual_volume)
    return plan

@app.get("/api/model-metadata")
def get_model_metadata(db: Session = Depends(get_db)):
    """
    Queries active Hugging Face model versions and verification calibration logs.
    """
    logs = db.query(RecalibrationLog).order_by(RecalibrationLog.timestamp.desc()).limit(5).all()
    latest_logs = []
    for l in logs:
        latest_logs.append({
            "timestamp": l.timestamp.isoformat(),
            "model_version": l.model_version,
            "recalibration_reward": l.reward,
            "mape_percentage": l.mape,
            "ci_calibration_percentage": l.ci_calibration
        })
        
    return {
        "active_version": "v1.4.2",
        "calibration_status": "Calibrated",
        "huggingface_repo": "abhinavsingh-hub/okava_charter_iq_models",
        "latest_recalibrations": latest_logs
    }

@app.get("/api/hitl-overrides")
def get_override_logs(db: Session = Depends(get_db)):
    """
    Retrieves all records in the human override logs.
    """
    logs = db.query(HitlOverride).order_by(HitlOverride.timestamp.desc()).all()
    res = []
    for l in logs:
        res.append({
            "id": l.id,
            "timestamp": l.timestamp.isoformat(),
            "username": l.username,
            "route": l.route,
            "vessel_class": l.vessel_class,
            "recommendation": l.recommendation,
            "decision": l.decision,
            "override_reason": l.override_reason
        })
    return res

@app.post("/api/hitl-overrides")
def log_human_decision(
    username: str = Body(...),
    route: str = Body(...),
    vessel_class: str = Body(...),
    recommendation: str = Body(...),
    decision: str = Body(...),
    override_reason: str = Body(None),
    db: Session = Depends(get_db)
):
    """
    Records a human override or approval decision.
    """
    try:
        new_override = HitlOverride(
            username=username,
            route=route,
            vessel_class=vessel_class,
            recommendation=recommendation,
            decision=decision,
            override_reason=override_reason
        )
        db.add(new_override)
        db.commit()
        logger.info(f"Decision logged: {decision} for {route} by {username}")
        
        # If an override was made, trigger a scored verification update to the RL layer
        if decision == "overridden" and RL_SERVICE_URL:
            # Replay a scored calibration verification pass
            try:
                # Trigger a manual verification batch record
                batch_data = {
                    "model_version": "v1.4.2",
                    "items": [
                        {
                            "route": route,
                            "vessel_class": vessel_class,
                            "point_forecast": 16.20,
                            "realized_rate": 14.80, # Simulate error that triggered human override
                            "ci_lower": 15.50,
                            "ci_upper": 16.90
                        }
                    ]
                }
                requests.post(f"{RL_SERVICE_URL}/verify", json=batch_data, timeout=3)
            except Exception as inner:
                logger.warning(f"Failed to post override calibration back to RL service: {inner}")
                
        return {"status": "saved", "override_id": new_override.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recalibrate")
def run_model_recalibration(
    origin: str = Body(...),
    destination: str = Body(...),
    vessel_class: str = Body(...),
    horizon_days: int = Body(14)
):
    """
    Proxies a manual model recalibration request directly to the RL microservice container.
    """
    try:
        res = requests.post(
            f"{RL_SERVICE_URL}/recalibrate",
            json={
                "origin": origin,
                "destination": destination,
                "vessel_class": vessel_class,
                "horizon_days": horizon_days
            },
            timeout=10
        )
        if res.status_code == 200:
            return res.json()
        else:
            raise HTTPException(status_code=res.status_code, detail="RL calibration microservice failed.")
    except Exception as e:
        logger.error(f"Failed to connect to RL microservice: {e}")
        raise HTTPException(status_code=502, detail=f"Cannot reach RL container: {e}")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Core API gateway on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
