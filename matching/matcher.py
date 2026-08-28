"""
matcher.py
Vessel-Port matching engine.
Ranks viable vessel classes on total effective shipping cost for bulk cargo procurement.
Outputs detailed cost breakdowns rather than opaque singular scores.
"""

import sys
import os
from typing import List, Dict, Any
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import FeatureStore
from rules.engine import evaluate_route_rules, VESSEL_DIMENSIONS
from forecasting.predictor import FreightPredictor

# Economies of scale adjustment ($/MT)
SCALE_ADJUSTMENTS = {
    "capesize": -2.20,
    "panamax": -0.80,
    "supramax": 0.00,
    "handysize": 1.40
}

# Standard Port Tariffs ($ flat rate)
PORT_DISCHARGE_TARIFFS = {
    "PRDP": 85000,
    "VIZG": 75000,
    "GNGV": 68000,
    "HALD": 95000, # Higher draft pilotage/towing charges
    "DHMR": 72000,
    "GPPR": 55000,
    "SAGA": 110000 # Lightering/STS double-handling surcharge
}

# Daily vessel charter hire equivalents (USD/day proxy for idle delay calculations)
VESSEL_DAILY_HIRE = {
    "capesize": 25000,
    "panamax": 16500,
    "supramax": 13500,
    "handysize": 9500
}

def rank_eligible_vessels(
    db: Session,
    origin: str,
    destination: str,
    volume: float,
    laycan_start: Any
) -> List[Dict[str, Any]]:
    """
    Filters vessels via the Rule Engine and ranks them by total effective cost.
    Returns:
        rankings (List[dict]): List of ranked vessel matches with cost breakdowns.
    """
    predictor = FreightPredictor()
    results = []
    
    # 1. Fetch latest feature row to check current bunkers / weather / GDELT tension
    latest_feature = db.query(FeatureStore).filter(
        FeatureStore.origin == origin,
        FeatureStore.destination == destination
    ).order_by(FeatureStore.date.desc()).first()
    
    bunker_fuel_price = latest_feature.fuel_cost if latest_feature else 600.0
    geopolitics_index = latest_feature.geopolitics_index if latest_feature else 10.0
    congestion_score = latest_feature.congestion if latest_feature else 5.0
    
    for vessel_class in ["capesize", "panamax", "supramax", "handysize"]:
        # A. Evaluate rules (LOA/draft limits, weather locks)
        is_allowed, rule_reasons = evaluate_route_rules(db, origin, destination, vessel_class, laycan_start)
        
        # Hard constraint filter check
        if not is_allowed:
            continue
            
        # B. Get route-adjusted forecast rate ($/MT)
        fc_res = predictor.predict_freight(origin, destination, vessel_class, horizon_days=14)
        base_rate = fc_res.get("point_forecast", 16.50)
        
        # C. Cost breakdowns
        # 1. Base Freight cost
        freight_cost = base_rate * volume
        
        # 2. Port Discharge & Pilotage Tariffs
        discharge_cost = PORT_DISCHARGE_TARIFFS.get(destination, 60000)
        
        # 3. Idle Delay Cost
        # Base expected port stay (5 days) + extra days based on AIS congestion queue (congestion / 2)
        congestion_days = congestion_score / 2.0
        weather_delay = 3.0 if any("WEATHER_WARNING" in r for r in rule_reasons) else 0.0
        total_delay_days = congestion_days + weather_delay
        daily_rate = VESSEL_DAILY_HIRE.get(vessel_class, 15000)
        idle_delay_cost = total_delay_days * daily_rate
        
        # 4. Geopolitical Risk Premium
        # If GDELT news index indicates high tension (>40), apply a war-risk/insurance surcharge
        geopol_premium = 0.0
        if geopolitics_index > 40.0:
            # 1.50 USD/MT risk premium on high tension routes
            geopol_premium = 1.50 * volume
        elif origin == "VOST": # Russia sanction risk premium
            geopol_premium = 5.00 * volume
            
        # 5. Economies of Scale adjustment
        scale_adj = SCALE_ADJUSTMENTS.get(vessel_class, 0.0) * volume
        
        # D. Calculate Total Effective Cost
        effective_cost = freight_cost + discharge_cost + idle_delay_cost + geopol_premium + scale_adj
        effective_cost_per_tonne = effective_cost / volume
        
        results.append({
            "vessel_class": vessel_class.capitalize(),
            "effective_cost": round(effective_cost, 2),
            "effective_cost_per_tonne": round(effective_cost_per_tonne, 2),
            "cost_breakdown": {
                "base_freight": round(freight_cost, 2),
                "port_turnaround": round(discharge_cost, 2),
                "idle_delay": round(idle_delay_cost, 2),
                "geopolitical_premium": round(geopol_premium, 2),
                "scale_adjustment": round(scale_adj, 2)
            },
            "warnings": [r for r in rule_reasons if not r.startswith("REJECT_")]
        })
        
    # Sort rankings: lowest effective cost first
    rankings = sorted(results, key=lambda x: x["effective_cost"])
    return rankings
