"""
test_rules.py
Unit tests verifying the physical, environmental, and geopolitical rule constraints.
"""

import sys
import os
import unittest
import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.db import init_db, SessionLocal, PortConstraint
from rules.engine import evaluate_route_rules

class TestRuleEngine(unittest.TestCase):
    def setUp(self):
        init_db()
        self.db = SessionLocal()
        # Seed test port constraints
        self.db.query(PortConstraint).delete()
        self.db.add(PortConstraint(port_id="HALD", max_draft=8.0, max_loa=180.0, max_beam=32.0,
                                   effective_from=datetime.date(2026, 1, 1),
                                   effective_to=datetime.date(2026, 12, 31)))
        self.db.add(PortConstraint(port_id="PRDP", max_draft=17.0, max_loa=280.0, max_beam=45.0,
                                   effective_from=datetime.date(2026, 1, 1),
                                   effective_to=datetime.date(2026, 12, 31)))
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_capesize_rejected_in_haldia(self):
        """Capesize draft (18.2m) exceeds Haldia limit (8.0m) and should be rejected."""
        is_pass, reasons = evaluate_route_rules(
            self.db,
            origin="NCWL",
            destination="HALD",
            vessel_class="capesize",
            laycan_start=datetime.date(2026, 8, 29)
        )
        self.assertFalse(is_pass)
        self.assertTrue(any("REJECT_DRAFT" in r for r in reasons))

    def test_panamax_allowed_in_paradip(self):
        """Panamax specifications fits Paradip constraints and should pass."""
        is_pass, reasons = evaluate_route_rules(
            self.db,
            origin="NCWL",
            destination="PRDP",
            vessel_class="panamax",
            laycan_start=datetime.date(2026, 8, 29)
        )
        self.assertTrue(is_pass)

    def test_russian_route_flagged(self):
        """Vostochny (Russia) origin must trigger a warning flag."""
        is_pass, reasons = evaluate_route_rules(
            self.db,
            origin="VOST",
            destination="PRDP",
            vessel_class="panamax",
            laycan_start=datetime.date(2026, 8, 29)
        )
        self.assertTrue(is_pass) # Passes physical checks but includes compliance warnings
        self.assertTrue(any("SANCTIONS_FLAG" in r for r in reasons))

if __name__ == "__main__":
    unittest.main()
