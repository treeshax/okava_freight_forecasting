"""
route_adjustment.py
Translates Baltic daily Time Charter rates (daily hires) and market bunker indicators 
into voyage freight rates ($/Metric Ton) to East Coast India ports.
Provides auditable, detailed step-by-step logs for regulatory review.
"""

import logging

logger = logging.getLogger(__name__)

# Distance matrix in nautical miles
# Origins: Newcastle (NCWL), Hay Point (HYPT), Richards Bay (RICH), Samarinda (SAMA), Beira (MBOZ), Port Hedland (PORT), Hampton Roads (HAMP), Vostochny (VOST)
# Destinations: Paradip (PRDP), Visakhapatnam (VIZG), Gangavaram (GNGV), Haldia (HALD), Dhamra (DHMR), Gopalpur (GPPR), Sagar Sandheads (SAGA)
DISTANCES = {
    ("NCWL", "PRDP"): 5200, ("NCWL", "VIZG"): 5150, ("NCWL", "GNGV"): 5140, ("NCWL", "HALD"): 5300, ("NCWL", "DHMR"): 5220, ("NCWL", "GPPR"): 5180, ("NCWL", "SAGA"): 5280,
    ("HYPT", "PRDP"): 4500, ("HYPT", "VIZG"): 4450, ("HYPT", "GNGV"): 4440, ("HYPT", "HALD"): 4600, ("HYPT", "DHMR"): 4520, ("HYPT", "GPPR"): 4480, ("HYPT", "SAGA"): 4580,
    ("RICH", "PRDP"): 4800, ("RICH", "VIZG"): 4750, ("RICH", "GNGV"): 4740, ("RICH", "HALD"): 4950, ("RICH", "DHMR"): 4850, ("RICH", "GPPR"): 4780, ("RICH", "SAGA"): 4900,
    ("SAMA", "PRDP"): 2400, ("SAMA", "VIZG"): 2350, ("SAMA", "GNGV"): 2340, ("SAMA", "HALD"): 2500, ("SAMA", "DHMR"): 2420, ("SAMA", "GPPR"): 2380, ("SAMA", "SAGA"): 2480,
    ("MBOZ", "PRDP"): 4550, ("MBOZ", "VIZG"): 4500, ("MBOZ", "GNGV"): 4490, ("MBOZ", "HALD"): 4700, ("MBOZ", "DHMR"): 4580, ("MBOZ", "GPPR"): 4530, ("MBOZ", "SAGA"): 4650,
    ("PORT", "PRDP"): 3400, ("PORT", "VIZG"): 3350, ("PORT", "GNGV"): 3340, ("PORT", "HALD"): 3550, ("PORT", "DHMR"): 3420, ("PORT", "GPPR"): 3380, ("PORT", "SAGA"): 3500,
    ("HAMP", "PRDP"): 11400, ("HAMP", "VIZG"): 11350, ("HAMP", "GNGV"): 11340, ("HAMP", "HALD"): 11550, ("HAMP", "DHMR"): 11450, ("HAMP", "GPPR"): 11380, ("HAMP", "SAGA"): 11500,
    ("VOST", "PRDP"): 4700, ("VOST", "VIZG"): 4650, ("VOST", "GNGV"): 4640, ("VOST", "HALD"): 4800, ("VOST", "DHMR"): 4720, ("VOST", "GPPR"): 4680, ("VOST", "SAGA"): 4780,
}

# Standard operational parameters by vessel class
VESSEL_SPECS = {
    "capesize": {
        "capacity_mt": 160000,
        "speed_knots": 12.5,
        "sea_burn_tpd": 42.0,  # VLSFO tons per day
        "port_burn_tpd": 3.0,
        "fixed_port_cost": 85000,  # USD flat port tariff estimate
    },
    "panamax": {
        "capacity_mt": 75000,
        "speed_knots": 13.0,
        "sea_burn_tpd": 28.0,
        "port_burn_tpd": 2.0,
        "fixed_port_cost": 55000,
    },
    "supramax": {
        "capacity_mt": 55000,
        "speed_knots": 12.5,
        "sea_burn_tpd": 22.0,
        "port_burn_tpd": 1.5,
        "fixed_port_cost": 42000,
    },
    "handysize": {
        "capacity_mt": 30000,
        "speed_knots": 12.0,
        "sea_burn_tpd": 16.0,
        "port_burn_tpd": 1.2,
        "fixed_port_cost": 30000,
    }
}

# Time Charter mapping to Baltic Exchange Indices
INDEX_TCA_MULTIPLIERS = {
    "capesize": ("BCI", 14.5),  # index value -> estimated time charter daily rate multiplier
    "panamax": ("BPI", 12.2),
    "supramax": ("BSI", 11.8),
    "handysize": ("BHSI", 10.5)
}

def estimate_voyage_rate(
    origin: str,
    destination: str,
    vessel_class: str,
    baltic_indices: dict,
    vlsfo_price: float = 600.0,
    port_days: float = 6.0
) -> float:
    """
    Computes Voyage Charter rate per Metric Ton.
    Formula: Rate = (Daily_TCA * Total_Days + Bunker_Cost + Port_Cost) / Cargo_Volume
    """
    vessel_class = vessel_class.lower()
    specs = VESSEL_SPECS.get(vessel_class)
    dist = DISTANCES.get((origin, destination))
    
    if not specs or not dist:
        # Default fallback distance of 4000 nm if missing
        dist = dist or 4000
        specs = specs or VESSEL_SPECS["panamax"]
        logger.warning(f"Missing distance or specs for {origin}->{destination} ({vessel_class}). Using panamax/4000nm defaults.")

    # Retrieve daily hire estimation
    idx_name, mult = INDEX_TCA_MULTIPLIERS.get(vessel_class, ("BDI", 12.0))
    idx_val = baltic_indices.get(idx_name, baltic_indices.get("BDI", 1500))
    daily_hire = idx_val * mult
    
    # Speed and Sea Days calculation
    sea_days = dist / (specs["speed_knots"] * 24.0)
    total_days = sea_days + port_days
    
    # Fuel calculation
    bunker_burned = (sea_days * specs["sea_burn_tpd"]) + (port_days * specs["port_burn_tpd"])
    bunker_cost = bunker_burned * vlsfo_price
    
    # Time Charter component cost
    tc_cost = daily_hire * total_days
    
    # Sum total voyage expenses
    port_cost = specs["fixed_port_cost"]
    total_voyage_cost = tc_cost + bunker_cost + port_cost
    
    # Derive rate per ton
    voyage_rate_per_ton = total_voyage_cost / specs["capacity_mt"]
    
    logger.debug(
        f"AUDIT LOG | Route: {origin}->{destination} | Vessel: {vessel_class} | "
        f"Dist: {dist}nm | Sea Days: {sea_days:.2f} | Port Days: {port_days} | "
        f"Daily Hire: ${daily_hire:.2f} (Index {idx_name}={idx_val}) | "
        f"Bunkers: {bunker_burned:.1f} MT VLSFO at ${vlsfo_price}/MT | "
        f"Effective Voyage Expense: ${total_voyage_cost:,.2f} | "
        f"Derived Rate: ${voyage_rate_per_ton:.2f}/MT"
    )
    
    return round(voyage_rate_per_ton, 2)
