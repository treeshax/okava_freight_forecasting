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

import math

# Cargo capacity thresholds for parcel sizing & deadfreight modeling
VESSEL_CAPACITY_LIMITS = {
    "capesize": {"min_cargo": 100000, "max_cargo": 180000, "optimal": 150000},
    "panamax": {"min_cargo": 55000, "max_cargo": 85000, "optimal": 75000},
    "supramax": {"min_cargo": 40000, "max_cargo": 65000, "optimal": 55000},
    "handysize": {"min_cargo": 20000, "max_cargo": 42000, "optimal": 35000}
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
    Filters vessels via the Rule Engine and ranks them by total effective cost,
    factoring in parcel sizes, multi-voyage splitting, and deadfreight penalties.
    Returns:
        rankings (List[dict]): List of ranked vessel matches with cost breakdowns and AI agent rationales.
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
        
        # C. Parcel sizing & multi-voyage modeling
        cap = VESSEL_CAPACITY_LIMITS.get(vessel_class, {"min_cargo": 30000, "max_cargo": 75000})
        num_voyages = max(1, math.ceil(volume / cap["max_cargo"]))
        
        # Deadfreight penalty if cargo is far below vessel minimum payload
        deadfreight_penalty = 0.0
        if volume < cap["min_cargo"]:
            deadfreight_penalty = (cap["min_cargo"] - volume) * base_rate * 0.40
        
        # 1. Base Freight cost
        freight_cost = base_rate * volume
        
        # 2. Port Discharge & Pilotage Tariffs (scales with number of port calls)
        discharge_cost = PORT_DISCHARGE_TARIFFS.get(destination, 60000) * num_voyages
        
        # 3. Idle Delay Cost
        congestion_days = congestion_score / 2.0
        weather_delay = 3.0 if any("WEATHER_WARNING" in r for r in rule_reasons) else 0.0
        total_delay_days = congestion_days + weather_delay
        daily_rate = VESSEL_DAILY_HIRE.get(vessel_class, 15000)
        idle_delay_cost = total_delay_days * daily_rate * num_voyages
        
        # 4. Geopolitical Risk Premium
        geopol_premium = 0.0
        if geopolitics_index > 40.0:
            geopol_premium = 1.50 * volume
        elif origin == "VOST":
            geopol_premium = 5.00 * volume
            
        # 5. Economies of Scale adjustment
        scale_adj = SCALE_ADJUSTMENTS.get(vessel_class, 0.0) * volume
        
        # D. Calculate Total Effective Cost
        effective_cost = freight_cost + discharge_cost + idle_delay_cost + geopol_premium + scale_adj + deadfreight_penalty
        effective_cost_per_tonne = effective_cost / volume

        # AI Agent Reasoning per class
        if num_voyages > 1:
            rationale = f"Requires {num_voyages} voyages for {volume:,.0f} MT cargo; splits port turnaround & idle delays."
        elif deadfreight_penalty > 0:
            rationale = f"Vessel capacity under-utilized; incurs ${deadfreight_penalty:,.0f} deadfreight on {volume:,.0f} MT parcel."
        elif vessel_class == "capesize":
            rationale = f"Max economies of scale in a single voyage. Deepwater draft at {destination} verified."
        elif vessel_class == "panamax":
            rationale = f"Optimal parcel fit ({volume:,.0f} MT) with full coastal Indian draft flexibility."
        elif vessel_class == "supramax":
            rationale = f"Geared flexibility; ideal for mid-tier bulk parcels with fast port turnaround."
        else:
            rationale = f"Direct entry permitted for draft-restricted port; zero deadfreight on small parcel."
        
        results.append({
            "vessel_class": vessel_class.capitalize(),
            "effective_cost": round(effective_cost, 2),
            "effective_cost_per_tonne": round(effective_cost_per_tonne, 2),
            "num_voyages": num_voyages,
            "cost_breakdown": {
                "base_freight": round(freight_cost, 2),
                "port_turnaround": round(discharge_cost, 2),
                "idle_delay": round(idle_delay_cost, 2),
                "geopolitical_premium": round(geopol_premium, 2),
                "scale_adjustment": round(scale_adj, 2),
                "deadfreight": round(deadfreight_penalty, 2)
            },
            "warnings": [r for r in rule_reasons if not r.startswith("REJECT_")],
            "rationale": rationale
        })
        
    # Sort rankings: lowest effective cost first
    rankings = sorted(results, key=lambda x: x["effective_cost"])
    
    # Attach top AI agent decision
    if rankings:
        best = rankings[0]
        runner_up = rankings[1] if len(rankings) > 1 else None
        diff_str = f"Saves ${runner_up['effective_cost_per_tonne'] - best['effective_cost_per_tonne']:.2f}/MT vs #{2} {runner_up['vessel_class']}." if runner_up else ""
        best["ai_agent_decision"] = f"AI Chartering Agent selects {best['vessel_class']}: {best['rationale']} {diff_str}"
        
    return rankings
