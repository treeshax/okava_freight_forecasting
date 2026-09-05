"""
engine.py
Rule Engine Service. Hard constraints filters only. Runs BEFORE matching/forecasting.
Checks vessel class specs against versioned port constraints, active weather alerts,
and GDELT geopolitical news events.
"""

from datetime import date
from typing import Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from api.db import PortConstraint, FeatureStore

# Standardized vessel dimensions for physical constraints evaluation
VESSEL_DIMENSIONS = {
    "capesize": {"draft": 18.2, "loa": 292.0, "beam": 45.0, "min_dwt": 100000, "max_dwt": 180000},
    "panamax": {"draft": 14.5, "loa": 229.0, "beam": 32.2, "min_dwt": 55000, "max_dwt": 85000},
    "supramax": {"draft": 12.8, "loa": 199.0, "beam": 32.2, "min_dwt": 40000, "max_dwt": 65000},
    "handysize": {"draft": 8.0, "loa": 175.0, "beam": 27.5, "min_dwt": 20000, "max_dwt": 38000}
}

def evaluate_route_rules(
    db: Session,
    origin: str,
    destination: str,
    vessel_class: str,
    laycan_start: date
) -> Tuple[bool, List[str]]:
    """
    Evaluates physical, environmental, and geopolitical rules for a route-vessel pair.
    Returns:
        is_pass (bool): True if all checks pass.
        reasons (List[str]): List of warning or rejection messages.
    """
    reasons = []
    vessel_class = vessel_class.lower()
    vessel = VESSEL_DIMENSIONS.get(vessel_class)
    
    if not vessel:
        return False, [f"Invalid vessel class: {vessel_class}"]

    # 1. Geopolitical Sanctions Checks (GDELT / Origin checks)
    if origin == "VOST":  # Vostochny, Russia
        reasons.append("SANCTIONS_FLAG: Route originates from Russia. Requires legal compliance audit and high-level approval.")
    
    # 2. Port Physical Constraints Checks (Destination Port)
    # Query versioned port constraints table for active constraints on laycan date
    constraint = db.query(PortConstraint).filter(
        PortConstraint.port_id == destination,
        PortConstraint.effective_from <= laycan_start,
        PortConstraint.effective_to >= laycan_start
    ).order_by(PortConstraint.effective_from.desc()).first()

    # Fallback to static defaults if database constraints are unseeded
    if not constraint:
        # Static default fallback (GNGV & DHMR can handle Capesize; PRDP/VIZG handle Panamax; HALD requires Handysize/STS)
        defaults = {
            "PRDP": {"max_draft": 17.0, "max_loa": 280.0, "max_beam": 45.0},
            "VIZG": {"max_draft": 16.5, "max_loa": 285.0, "max_beam": 45.0},
            "GNGV": {"max_draft": 20.0, "max_loa": 320.0, "max_beam": 50.0}, # Deepwater Capesize berth
            "HALD": {"max_draft": 8.5,  "max_loa": 180.0, "max_beam": 32.0}, # Riverine Hooghly draft
            "DHMR": {"max_draft": 18.5, "max_loa": 300.0, "max_beam": 45.0}, # Capesize berths 1 & 2
            "GPPR": {"max_draft": 12.5, "max_loa": 200.0, "max_beam": 32.0},
            "SAGA": {"max_draft": 10.5, "max_loa": 210.0, "max_beam": 32.0} # Lightering STS anchorage
        }
        port_default = defaults.get(destination, {"max_draft": 12.0, "max_loa": 220.0, "max_beam": 32.0})
        constraint = PortConstraint(
            port_id=destination,
            max_draft=port_default["max_draft"],
            max_loa=port_default["max_loa"],
            max_beam=port_default["max_beam"]
        )

    # Lightering warning for STS anchorage Sagar Sandheads
    if destination == "SAGA":
        reasons.append("LIGHTERING_NOTICE: Sagar Sandheads is a lightering/ship-to-ship (STS) anchorage. Double-handling discharge rates apply.")

    # Evaluate physical draft limits
    if vessel["draft"] > constraint.max_draft:
        reasons.append(
            f"REJECT_DRAFT: Vessel draft ({vessel['draft']}m) exceeds port '{destination}' max limit ({constraint.max_draft}m)."
        )
    
    # Evaluate LOA limits
    if vessel["loa"] > constraint.max_loa:
        reasons.append(
            f"REJECT_LOA: Vessel Length Overall ({vessel['loa']}m) exceeds port '{destination}' max limit ({constraint.max_loa}m)."
        )
        
    # Evaluate Beam limits
    if vessel["beam"] > constraint.max_beam:
        reasons.append(
            f"REJECT_BEAM: Vessel beam ({vessel['beam']}m) exceeds port '{destination}' max limit ({constraint.max_beam}m)."
        )

    # 3. Weather Ingestion Alerts (Recent observations from Feature Store)
    latest_feature = db.query(FeatureStore).filter(
        FeatureStore.origin == origin,
        FeatureStore.destination == destination,
        FeatureStore.vessel_class == vessel_class
    ).order_by(FeatureStore.date.desc()).first()
    
    if latest_feature and latest_feature.weather_alert:
        reasons.append("WEATHER_WARNING: Extreme weather or cyclone watch active on this route. Expect delays.")

    # Determine passing status: passes only if no REJECT tags are in reasons
    is_pass = not any(reason.startswith("REJECT_") for reason in reasons)
    
    return is_pass, reasons
