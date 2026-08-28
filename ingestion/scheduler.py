"""
scheduler.py
Ingestion cron orchestrator. Pulls weather, AIS, GDELT, and bunker benchmark feeds,
executes the route adjustments, and commits the records to the Postgres/SQLite database.
"""

import sys
import os
from datetime import datetime, timedelta
import logging
from apscheduler.schedulers.blocking import BlockingScheduler

# Add project root to path to load local api modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import init_db, SessionLocal, FeatureStore
from ingestion.fetch_external import (
    fetch_weather_alert,
    fetch_gdelt_geopolitical_index,
    fetch_baltic_indices,
    fetch_coal_prices,
    fetch_ais_congestion
)
from ingestion.route_adjustment import estimate_voyage_rate

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Primary routes we support
ROUTES = [
    ("NCWL", "PRDP"), ("NCWL", "VIZG"), ("NCWL", "GNGV"), ("NCWL", "HALD"), ("NCWL", "DHMR"), ("NCWL", "GPPR"), ("NCWL", "SAGA"),
    ("HYPT", "PRDP"), ("HYPT", "VIZG"), ("HYPT", "HALD"),
    ("SAMA", "PRDP"), ("SAMA", "HALD"), ("SAMA", "VIZG"),
    ("RICH", "PRDP"), ("RICH", "VIZG"), ("RICH", "DHMR"),
    ("MBOZ", "PRDP"), ("MBOZ", "VIZG"), ("MBOZ", "GPPR"),
    ("PORT", "PRDP"), ("PORT", "GNGV"),
    ("HAMP", "PRDP"), ("HAMP", "VIZG"),
    ("VOST", "PRDP"), ("VOST", "VIZG")  # Russian routes
]

VESSEL_CLASSES = ["capesize", "panamax", "supramax", "handysize"]

def ingest_data_for_date(target_date: datetime.date):
    """
    Ingests all indicators and computes derived freight rates for a specific calendar date.
    """
    logger.info(f"Starting ingestion process for date: {target_date}")
    db = SessionLocal()
    try:
        # 1. Fetch market commodity price indices and bunkers
        coal_prices = fetch_coal_prices(target_date)
        bunkers = fetch_baltic_indices(target_date)
        vlsfo_price = coal_prices["API4"] * 5.5  # Approximate bunker fuel cost link from coal

        # Ingest features per active route-vessel combo
        for origin, dest in ROUTES:
            # Weather & Congestion are destination / origin specific
            origin_weather = fetch_weather_alert(origin, target_date)
            dest_weather = fetch_weather_alert(dest, target_date)
            weather_alert = origin_weather or dest_weather

            dest_congestion = fetch_ais_congestion(dest, target_date)
            geopolitics = fetch_gdelt_geopolitical_index(origin, target_date)
            
            for vessel in VESSEL_CLASSES:
                # Estimate voyage rate ($/MT)
                derived_rate = estimate_voyage_rate(
                    origin=origin,
                    destination=dest,
                    vessel_class=vessel,
                    baltic_indices=bunkers,
                    vlsfo_price=vlsfo_price
                )
                
                # Check if record already exists to avoid duplication
                existing = db.query(FeatureStore).filter(
                    FeatureStore.date == target_date,
                    FeatureStore.origin == origin,
                    FeatureStore.destination == dest,
                    FeatureStore.vessel_class == vessel
                ).first()
                
                if existing:
                    existing.freight_rate = derived_rate
                    existing.congestion = dest_congestion
                    existing.weather_alert = weather_alert
                    existing.geopolitics_index = geopolitics
                    existing.fuel_cost = vlsfo_price
                else:
                    new_record = FeatureStore(
                        date=target_date,
                        origin=origin,
                        destination=dest,
                        vessel_class=vessel,
                        freight_rate=derived_rate,
                        congestion=dest_congestion,
                        weather_alert=weather_alert,
                        geopolitics_index=geopolitics,
                        fuel_cost=vlsfo_price
                    )
                    db.add(new_record)
        
        db.commit()
        logger.info(f"Successful ingestion of {len(ROUTES) * len(VESSEL_CLASSES)} records for {target_date}.")
    except Exception as e:
        db.rollback()
        logger.error(f"Ingestion process failed for {target_date}: {e}")
    finally:
        db.close()

def seed_historical_features(days_back: int = 40):
    """
    Backfills historical database records for modeling engines.
    """
    logger.info(f"Backfilling {days_back} days of historical operational features...")
    init_db()
    today = datetime.utcnow().date()
    for i in range(days_back, -1, -1):
        target = today - timedelta(days=i)
        ingest_data_for_date(target)

if __name__ == "__main__":
    # If run standalone, seed history first and then boot scheduler
    logger.info("Initializing Database and Ingestion Engine...")
    seed_historical_features(days_back=35)
    
    scheduler = BlockingScheduler()
    # Ingest daily at midnight
    scheduler.add_job(
        lambda: ingest_data_for_date(datetime.utcnow().date()),
        "cron",
        hour=0,
        minute=5,
        id="daily_ingestion"
    )
    
    logger.info("Starting APscheduler daemon...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Ingestion daemon stopped.")
