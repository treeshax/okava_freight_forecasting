"""
tools.py
Structured callable tools for the Charter-IQ AI Agent.
Wraps forecasting, vessel-port matching, port constraints, risk alerts, and hedging engines.
"""

import os
import sys
import datetime
from typing import Dict, Any, List

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import SessionLocal
from forecasting.predictor import FreightPredictor
from rules.engine import evaluate_route_rules
from matching.matcher import rank_eligible_vessels
from risk.alerts import evaluate_route_risk
from portfolio.laddering import generate_laddering_plan

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        _predictor = FreightPredictor()
    return _predictor


def tool_get_freight_forecast(
    origin: str,
    destination: str,
    vessel_class: str = "panamax",
    horizon_days: int = 14
) -> Dict[str, Any]:
    """
    Returns probabilistic freight rate forecasts ($/MT), calibrated confidence intervals,
    TreeSHAP feature drivers, and projected daily trajectory curves for a route.
    """
    predictor = get_predictor()
    res = predictor.predict_freight(origin.upper(), destination.upper(), vessel_class.lower(), int(horizon_days))
    return res


def tool_rank_vessels_by_cost(
    origin: str,
    destination: str,
    volume: float = 75000.0,
    laycan_start: str = None
) -> Dict[str, Any]:
    """
    Filters vessels against port draft/LOA/beam constraints and ranks all eligible vessel classes
    (Capesize, Panamax, Supramax, Handysize) by total landed shipping cost with itemized cost breakdowns.
    """
    db = SessionLocal()
    try:
        if laycan_start:
            try:
                laycan_date = datetime.datetime.strptime(laycan_start, "%Y-%m-%d").date()
            except ValueError:
                laycan_date = datetime.date.today()
        else:
            laycan_date = datetime.date.today()

        rankings = rank_eligible_vessels(db, origin.upper(), destination.upper(), float(volume), laycan_date)
        return {
            "route": f"{origin.upper()} -> {destination.upper()}",
            "volume_mt": volume,
            "laycan_start": laycan_date.isoformat(),
            "eligible_vessels_ranked": rankings
        }
    finally:
        db.close()


def tool_check_port_constraints(
    origin: str,
    destination: str,
    vessel_class: str = "panamax",
    laycan_start: str = None
) -> Dict[str, Any]:
    """
    Checks physical port constraints (draft, LOA, beam), seasonal monsoon silting (e.g. Haldia limits),
    lightering notices (Sagar Sandheads), and geopolitical sanctions flags (e.g. Vostochny, Russia).
    """
    db = SessionLocal()
    try:
        if laycan_start:
            try:
                laycan_date = datetime.datetime.strptime(laycan_start, "%Y-%m-%d").date()
            except ValueError:
                laycan_date = datetime.date.today()
        else:
            laycan_date = datetime.date.today()

        is_pass, reasons = evaluate_route_rules(db, origin.upper(), destination.upper(), vessel_class.lower(), laycan_date)
        return {
            "origin": origin.upper(),
            "destination": destination.upper(),
            "vessel_class": vessel_class.capitalize(),
            "laycan_date": laycan_date.isoformat(),
            "is_permitted": is_pass,
            "audit_reasons": reasons
        }
    finally:
        db.close()


def tool_get_route_risk_alerts(
    origin: str,
    destination: str,
    vessel_class: str = "panamax"
) -> Dict[str, Any]:
    """
    Evaluates rolling rate volatility z-scores, anchorage congestion queues,
    severe weather/cyclone warnings, and geopolitical disruption indices (RED / AMBER / GREEN).
    """
    db = SessionLocal()
    try:
        risk_res = evaluate_route_risk(db, origin.upper(), destination.upper(), vessel_class.lower())
        return risk_res
    finally:
        db.close()


def tool_get_portfolio_laddering(
    origin: str,
    destination: str,
    annual_volume: float = 300000.0
) -> Dict[str, Any]:
    """
    Calculates recommended Spot vs. Contract of Affreightment (CoA) volume hedging split
    and quarterly tranche schedules to protect against freight rate volatility.
    """
    db = SessionLocal()
    try:
        plan = generate_laddering_plan(db, origin.upper(), destination.upper(), float(annual_volume))
        return plan
    finally:
        db.close()


# Tool metadata schemas for LLM function calling
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "tool_get_freight_forecast",
            "description": "Predicts future freight rate ($/MT), confidence intervals, and TreeSHAP market drivers for a shipping route.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin port code (e.g. NCWL for Newcastle, RICH for Richards Bay, SAMA for Samarinda, VOST for Vostochny)"},
                    "destination": {"type": "string", "description": "Discharge port code (e.g. PRDP for Paradip, VIZG for Vizag, HALD for Haldia, DHMR for Dhamra, GNGV for Gangavaram)"},
                    "vessel_class": {"type": "string", "enum": ["capesize", "panamax", "supramax", "handysize"], "description": "Vessel class (default: panamax)"},
                    "horizon_days": {"type": "integer", "enum": [7, 14, 30], "description": "Forecast horizon in days (default: 14)"}
                },
                "required": ["origin", "destination"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_rank_vessels_by_cost",
            "description": "Ranks eligible vessel classes by total landed voyage cost including bunker fuel, port turnaround tariffs, idle congestion delay, and scale adjustments.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin port code (e.g. NCWL, RICH, SAMA)"},
                    "destination": {"type": "string", "description": "Destination port code (e.g. PRDP, VIZG, HALD)"},
                    "volume": {"type": "number", "description": "Cargo volume in metric tons (e.g. 75000)"},
                    "laycan_start": {"type": "string", "description": "Laycan start date in YYYY-MM-DD format"}
                },
                "required": ["origin", "destination", "volume"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_check_port_constraints",
            "description": "Checks if a vessel class can physically enter a discharge port given draft, LOA, beam restrictions, seasonal monsoon silting, and geopolitical sanctions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin port code"},
                    "destination": {"type": "string", "description": "Destination port code (e.g. HALD, PRDP)"},
                    "vessel_class": {"type": "string", "enum": ["capesize", "panamax", "supramax", "handysize"], "description": "Vessel class to validate"},
                    "laycan_start": {"type": "string", "description": "Laycan date in YYYY-MM-DD format to check seasonal monsoon draft windows"}
                },
                "required": ["origin", "destination", "vessel_class"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_get_route_risk_alerts",
            "description": "Checks route volatility z-scores, cyclone weather advisories, anchorage congestion queue, and traffic-light status (RED/AMBER/GREEN).",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin port code"},
                    "destination": {"type": "string", "description": "Destination port code"},
                    "vessel_class": {"type": "string", "description": "Vessel class (default: panamax)"}
                },
                "required": ["origin", "destination"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "tool_get_portfolio_laddering",
            "description": "Recommends long-term volume allocation between Spot market charters and fixed-rate Contracts of Affreightment (CoA) to hedge rate spikes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string", "description": "Origin port code"},
                    "destination": {"type": "string", "description": "Destination port code"},
                    "annual_volume": {"type": "number", "description": "Annual cargo volume in MT (default: 300000)"}
                },
                "required": ["origin", "destination"]
            }
        }
    }
]

TOOL_MAP = {
    "tool_get_freight_forecast": tool_get_freight_forecast,
    "tool_rank_vessels_by_cost": tool_rank_vessels_by_cost,
    "tool_check_port_constraints": tool_check_port_constraints,
    "tool_get_route_risk_alerts": tool_get_route_risk_alerts,
    "tool_get_portfolio_laddering": tool_get_portfolio_laddering
}
