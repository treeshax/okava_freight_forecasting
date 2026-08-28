"""
seed.py
Seeding database tables. Populates seasonal port constraints,
historical rates, fleet status, and mock logs to ensure the dashboard
renders immediately with correct initial states.
"""

import sys
import os
import datetime
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import init_db, SessionLocal, PortConstraint, FeatureStore, HitlOverride, RecalibrationLog
from ingestion.scheduler import seed_historical_features

def seed_port_constraints(db: Session):
    """
    Populates seasonal port draft limitations and lightering anchors.
    """
    db.query(PortConstraint).delete()
    
    today = datetime.date.today()
    current_year = today.year
    
    # Port specifications list
    # Haldia is modeled with seasonal limits: Silting decreases draft limits during monsoon months (June-Oct)
    constraints = [
        # Paradip
        PortConstraint(port_id="PRDP", max_draft=17.0, max_loa=280.0, max_beam=45.0,
                       effective_from=datetime.date(current_year - 1, 1, 1),
                       effective_to=datetime.date(current_year + 1, 12, 31)),
        # Vizag
        PortConstraint(port_id="VIZG", max_draft=16.5, max_loa=285.0, max_beam=45.0,
                       effective_from=datetime.date(current_year - 1, 1, 1),
                       effective_to=datetime.date(current_year + 1, 12, 31)),
        # Gangavaram
        PortConstraint(port_id="GNGV", max_draft=18.0, max_loa=300.0, max_beam=50.0,
                       effective_from=datetime.date(current_year - 1, 1, 1),
                       effective_to=datetime.date(current_year + 1, 12, 31)),
        # Dhamra
        PortConstraint(port_id="DHMR", max_draft=15.0, max_loa=250.0, max_beam=42.0,
                       effective_from=datetime.date(current_year - 1, 1, 1),
                       effective_to=datetime.date(current_year + 1, 12, 31)),
        # Gopalpur
        PortConstraint(port_id="GPPR", max_draft=12.5, max_loa=200.0, max_beam=32.0,
                       effective_from=datetime.date(current_year - 1, 1, 1),
                       effective_to=datetime.date(current_year + 1, 12, 31)),
        # Sagar Sandheads (Lightering Anchorage)
        PortConstraint(port_id="SAGA", max_draft=10.5, max_loa=210.0, max_beam=32.0,
                       effective_from=datetime.date(current_year - 1, 1, 1),
                       effective_to=datetime.date(current_year + 1, 12, 31)),
                       
        # Haldia Dry Window (Nov to May)
        PortConstraint(port_id="HALD", max_draft=8.8, max_loa=180.0, max_beam=32.0,
                       effective_from=datetime.date(current_year, 11, 1),
                       effective_to=datetime.date(current_year + 1, 5, 31)),
        PortConstraint(port_id="HALD", max_draft=8.8, max_loa=180.0, max_beam=32.0,
                       effective_from=datetime.date(current_year - 1, 11, 1),
                       effective_to=datetime.date(current_year, 5, 31)),
        # Haldia Monsoon Silting Window (June to October)
        PortConstraint(port_id="HALD", max_draft=8.0, max_loa=180.0, max_beam=32.0,
                       effective_from=datetime.date(current_year, 6, 1),
                       effective_to=datetime.date(current_year, 10, 31)),
    ]
    
    db.add_all(constraints)
    db.commit()
    print("Port Constraints successfully seeded.")

def seed_sample_logs(db: Session):
    """
    Seeds initial audit tracking states.
    """
    db.query(HitlOverride).delete()
    db.query(RecalibrationLog).delete()
    
    # Seed override cases
    overrides = [
        HitlOverride(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=2),
            username="Akhilesh M. - Head Procurement",
            route="RICH -> VIZG",
            vessel_class="Panamax",
            recommendation="Enter market immediately (softening spot rate forecast)",
            decision="overridden",
            override_reason="Wait 7 days to consolidate with upcoming Rourkela cargo tender."
        ),
        HitlOverride(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=1),
            username="Akhilesh M. - Head Procurement",
            route="NCWL -> PRDP",
            vessel_class="Capesize",
            recommendation="Postpone charter (Port congestion delay expected)",
            decision="accepted",
            override_reason="Proceeded with delayed laycan window according to model instructions."
        )
    ]
    
    # Seed Calibration entries
    cal_logs = [
        RecalibrationLog(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=6),
            model_version="v1.4.1",
            reward=0.824,
            mape=6.24,
            ci_calibration=88.50
        ),
        RecalibrationLog(
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
            model_version="v1.4.2",
            reward=1.045,
            mape=5.82,
            ci_calibration=92.10
        )
    ]
    
    db.add_all(overrides)
    db.add_all(cal_logs)
    db.commit()
    print("Calibration and Override logs seeded.")

if __name__ == "__main__":
    init_db()
    session = SessionLocal()
    try:
        seed_port_constraints(session)
        seed_sample_logs(session)
        # Seeds historical feature records
        seed_historical_features(days_back=35)
    finally:
        session.close()
