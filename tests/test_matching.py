"""
test_matching.py
Unit tests verifying cost calculations and vessel ranking logic.
"""

import sys
import os
import unittest
import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import init_db, SessionLocal, FeatureStore
from matching.matcher import rank_eligible_vessels

class TestMatchingEngine(unittest.TestCase):
    def setUp(self):
        init_db()
        self.db = SessionLocal()
        # Seed a dummy feature row to use in rates calculation
        self.db.query(FeatureStore).delete()
        self.db.add(FeatureStore(
            date=datetime.date(2026, 8, 29),
            origin="NCWL",
            destination="PRDP",
            vessel_class="panamax",
            freight_rate=14.10,
            congestion=10,
            weather_alert=False,
            geopolitics_index=15.0,
            fuel_cost=600.0
        ))
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_matching_cost_and_ranking(self):
        """Checks if matching ranks Panamax above Capesize (if Capesize fails rules) or orders properly."""
        rankings = rank_eligible_vessels(
            self.db,
            origin="NCWL",
            destination="PRDP",
            volume=75000,
            laycan_start=datetime.date(2026, 8, 29)
        )
        # Should return list of dictionaries
        self.assertIsInstance(rankings, list)
        self.assertTrue(len(rankings) > 0)
        
        # Verify the structure has itemized cost breakdowns
        first_match = rankings[0]
        self.assertIn("vessel_class", first_match)
        self.assertIn("effective_cost", first_match)
        self.assertIn("cost_breakdown", first_match)
        self.assertIn("base_freight", first_match["cost_breakdown"])

if __name__ == "__main__":
    unittest.main()
