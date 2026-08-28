"""
alerts.py
Risk & Alerting Engine.
Computes rolling rate volatility z-scores and aggregates congestion + weather variables
to flag route-level status indicators (Red/Amber/Green).
"""

import sys
import os
import numpy as np
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import FeatureStore

def evaluate_route_risk(
    db: Session,
    origin: str,
    destination: str,
    vessel_class: str = "panamax"
) -> dict:
    """
    Evaluates rolling volatility, weather alerts, and AIS congestion levels.
    Returns:
        risk_metrics (dict): Status level, reasons, and active numerical scores.
    """
    vessel_class = vessel_class.lower()
    
    # 1. Fetch recent rate history for volatility (z-score) evaluation
    recent_records = db.query(FeatureStore).filter(
        FeatureStore.origin == origin,
        FeatureStore.destination == destination,
        FeatureStore.vessel_class == vessel_class
    ).order_by(FeatureStore.date.desc()).limit(20).all()
    
    if not recent_records:
        return {
            "status": "GREEN",
            "volatility_z": 0.0,
            "congestion_score": 3,
            "reasons": ["No historical record found. Defaulting to standard status."],
            "last_updated": None
        }
        
    rates = [r.freight_rate for r in recent_records]
    latest_record = recent_records[0]
    
    # Calculate rolling z-score of the latest rate compared to recent history
    volatility_z = 0.0
    if len(rates) >= 5:
        mean_rate = np.mean(rates[1:])
        std_rate = np.std(rates[1:])
        if std_rate > 0.05:
            volatility_z = (rates[0] - mean_rate) / std_rate

    # Assemble reasons and warnings
    reasons = []
    status = "GREEN"
    
    # Check sanctions / Russia flags
    if origin == "VOST":
        status = "RED"
        reasons.append("Geopolitical sanctions lock on Russian vessels/routes. High compliance friction.")
    
    # Weather check
    if latest_record.weather_alert:
        status = "RED" if status != "RED" else "RED"
        reasons.append("Severe weather/cyclone warning active on route.")
        
    # Congestion check
    congestion = latest_record.congestion
    if congestion >= 25:  # High congestion threshold
        if status != "RED":
            status = "AMBER"
        reasons.append(f"High port congestion: {congestion} vessels waiting at anchorage.")
    elif congestion >= 35: # Critical congestion
        status = "RED"
        reasons.append(f"Critical port congestion: {congestion} vessels waiting at anchorage.")
        
    # Volatility alert checks
    if abs(volatility_z) > 2.0:
        status = "RED"
        reasons.append(f"Extreme rate volatility detected (Z-score: {volatility_z:.2f}).")
    elif abs(volatility_z) > 1.2:
        if status == "GREEN":
            status = "AMBER"
        reasons.append(f"Unstable rate volatility movement (Z-score: {volatility_z:.2f}).")
        
    # GDELT tension check
    if latest_record.geopolitics_index > 40.0:
        if status == "GREEN":
            status = "AMBER"
        reasons.append(f"Spike in regional news tension (GDELT Index: {latest_record.geopolitics_index:.1f}).")

    if not reasons:
        reasons.append("Route conditions are within normal bounds. Operations stable.")

    return {
        "status": status,
        "volatility_z": round(float(volatility_z), 2),
        "congestion_score": congestion,
        "weather_alert": latest_record.weather_alert,
        "geopolitics_index": round(latest_record.geopolitics_index, 2),
        "reasons": reasons,
        "last_updated": latest_record.date.isoformat()
    }
