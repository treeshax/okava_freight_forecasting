"""
laddering.py
Portfolio Strategy Engine.
Evaluates route-vessel compatibility across all origins and discharge ports
to produce a Contract of Affreightment (CoA) laddering plan, shifting volumes
from single-spot fixtures toward multi-voyage hedged ladders.
"""

from typing import Dict, Any, List
from sqlalchemy.orm import Session
from api.db import FeatureStore
from risk.alerts import evaluate_route_risk

def generate_laddering_plan(
    db: Session,
    origin: str,
    destination: str,
    annual_volume: float
) -> Dict[str, Any]:
    """
    Formulates a Spot vs CoA hedging distribution based on route volatility and risk.
    """
    # 1. Fetch risk metrics for the primary vessel class (Panamax default)
    risk_res = evaluate_route_risk(db, origin, destination, "panamax")
    status = risk_res.get("status", "GREEN")
    volatility = abs(risk_res.get("volatility_z", 0.0))
    
    # 2. Formulate allocation split
    # If route is RED (high volatility, sanctions, storm flags), we shift volume to fixed CoA
    # If route is GREEN (stable, low rate), we leverage Spot market to capture lower rates
    if status == "RED":
        coa_share = 0.75
        spot_share = 0.25
        hedge_reason = "High route volatility and congestion alerts. Lock in 75% volume via multi-voyage CoA to hedge rate spikes."
    elif status == "AMBER":
        coa_share = 0.60
        spot_share = 0.40
        hedge_reason = "Moderate risk triggers. Distribute 60% CoA and 40% Spot to maintain operational flexibility."
    else:
        coa_share = 0.40
        spot_share = 0.60
        hedge_reason = "Stable freight rates and low congestion. Position 60% on Spot market to take advantage of soft spot curves."

    # 3. Calculate ladder volumes (Quarterly tranches)
    coa_vol = annual_volume * coa_share
    spot_vol = annual_volume * spot_share
    
    tranches = [
        {"period": "Q1 (Next 90 days)", "allocation": "Spot", "volume_mt": round(spot_vol * 0.25, 0), "action": "Secure fixtures inside wait windows"},
        {"period": "Q1-Q2 (180 days)",  "allocation": "CoA Tranche A", "volume_mt": round(coa_vol * 0.50, 0), "action": "Lock in 2-voyage contract ladder"},
        {"period": "Q3-Q4 (360 days)",  "allocation": "CoA Tranche B", "volume_mt": round(coa_vol * 0.50, 0), "action": "Initiate long-term joint service ladder"},
        {"period": "Q2-Q4 (Remainder)", "allocation": "Spot", "volume_mt": round(spot_vol * 0.75, 0), "action": "Opportunistic spot chartering"}
    ]
    
    # Estimate projected savings compared to buying spot rates during peak periods
    # Peak spot rates typically carry a 6-12% premium; CoA avoids this.
    projected_savings_pct = 7.4 if status == "GREEN" else 11.2
    est_saving_usd = (coa_vol * 15.5) * (projected_savings_pct / 100.0)
    
    return {
        "route": f"{origin} -> {destination}",
        "annual_volume_mt": annual_volume,
        "recommended_split": {
            "coa_percentage": round(coa_share * 100.0, 1),
            "spot_percentage": round(spot_share * 100.0, 1),
            "coa_volume_mt": round(coa_vol, 0),
            "spot_volume_mt": round(spot_vol, 0)
        },
        "strategy_rationale": hedge_reason,
        "tranche_schedule": tranches,
        "hedging_metrics": {
            "estimated_savings_usd": round(est_saving_usd, 2),
            "savings_percentage": projected_savings_pct,
            "risk_hedged_percentage": round(coa_share * 100.0, 1)
        }
    }
