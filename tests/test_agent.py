"""
test_agent.py
Unit tests for the Charter-IQ Autonomous AI Agent.
Tests tool execution, domain constraint logic, and multi-tool decision reasoning.
"""

import os
import sys
import unittest
import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent.tools import (
    tool_get_freight_forecast,
    tool_rank_vessels_by_cost,
    tool_check_port_constraints,
    tool_get_route_risk_alerts,
    tool_get_portfolio_laddering,
    TOOL_MAP,
    TOOL_DEFINITIONS,
)
from agent.charter_agent import CharterIQAgent, extract_route_and_vessel


class TestAgentTools(unittest.TestCase):
    def test_tool_definitions_schema(self):
        """Validates that all tools registered in TOOL_DEFINITIONS exist in TOOL_MAP."""
        self.assertGreaterEqual(len(TOOL_DEFINITIONS), 5)
        for tool_def in TOOL_DEFINITIONS:
            name = tool_def["function"]["name"]
            self.assertIn(name, TOOL_MAP, f"Tool {name} defined in schema but missing in TOOL_MAP")

    def test_tool_get_freight_forecast(self):
        """Verifies multi-horizon forecast tool returns calibrated CIs and SHAP drivers."""
        res = tool_get_freight_forecast("NCWL", "PRDP", "panamax", horizon_days=14)
        self.assertIn("point_forecast", res)
        self.assertIn("ci_lower", res)
        self.assertIn("ci_upper", res)
        self.assertIn("curve", res)
        self.assertIn("top_shap_features", res)
        self.assertLessEqual(res["ci_lower"], res["point_forecast"])
        self.assertGreaterEqual(res["ci_upper"], res["point_forecast"])
        self.assertEqual(len(res["curve"]), 14)

    def test_tool_rank_vessels_by_cost(self):
        """Verifies vessel ranking calculates landed costs for eligible vessel classes."""
        res = tool_rank_vessels_by_cost("NCWL", "PRDP", volume=75000.0, laycan_start="2026-09-15")
        self.assertIn("eligible_vessels_ranked", res)
        rankings = res["eligible_vessels_ranked"]
        self.assertTrue(len(rankings) > 0, "Should return at least one eligible vessel class")
        first = rankings[0]
        self.assertIn("vessel_class", first)
        self.assertIn("effective_cost", first)
        self.assertIn("effective_cost_per_tonne", first)

    def test_tool_check_port_constraints_haldia_capesize(self):
        """Verifies Haldia physical draft constraint rejects Capesize."""
        # Monsoon date (e.g. July)
        res = tool_check_port_constraints("NCWL", "HALD", "capesize", laycan_start="2026-07-15")
        self.assertFalse(res["is_permitted"], "Capesize must be rejected at riverine Haldia")
        audit = " ".join(res["audit_reasons"]).lower()
        self.assertTrue("draft" in audit or "monsoon" in audit or "lightering" in audit)

    def test_tool_check_port_constraints_supramax(self):
        """Verifies Supramax passes standard port rules."""
        res = tool_check_port_constraints("NCWL", "PRDP", "supramax", laycan_start="2026-09-15")
        self.assertTrue(res["is_permitted"])

    def test_tool_get_route_risk_alerts(self):
        """Verifies risk evaluation returns risk status and congestion metrics."""
        res = tool_get_route_risk_alerts("RICH", "VIZG", "panamax")
        self.assertIn("status", res)
        self.assertIn(res["status"], ["GREEN", "AMBER", "RED"])
        self.assertIn("congestion_score", res)

    def test_tool_get_portfolio_laddering(self):
        """Verifies procurement hedging laddering returns spot vs coa breakdown."""
        res = tool_get_portfolio_laddering("NCWL", "PRDP", annual_volume=300000.0)
        self.assertIn("recommended_split", res)
        self.assertIn("tranche_schedule", res)
        split = res["recommended_split"]
        self.assertAlmostEqual(split["spot_percentage"] + split["coa_percentage"], 100.0, places=1)


class TestCharterIQAgent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.agent = CharterIQAgent()

    def test_extract_route_and_vessel(self):
        """Verifies regex parser correctly identifies ports and vessel classes."""
        origin, dest, vessel, volume, horizon = extract_route_and_vessel(
            "Rank eligible vessel classes for 75,000 MT coal from Newcastle to Paradip."
        )
        self.assertEqual(origin, "NCWL")
        self.assertEqual(dest, "PRDP")
        self.assertEqual(volume, 75000.0)

    def test_agent_vessel_ranking_query(self):
        """Checks agent responses for vessel ranking queries."""
        query = "Rank eligible vessel classes for 75,000 MT coal from Newcastle to Paradip."
        res = self.agent.chat(query)
        self.assertIn("reply", res)
        self.assertIn("tools_called", res)
        self.assertIn("tool_rank_vessels_by_cost", res["tools_called"])
        self.assertTrue(len(res["reply"]) > 50)
        self.assertIn("panamax", res["reply"].lower())

    def test_agent_haldia_draft_query(self):
        """Checks agent detects Haldia monsoon draft limits."""
        query = "Can a Capesize or Panamax enter Haldia port during monsoon?"
        res = self.agent.chat(query)
        self.assertIn("reply", res)
        self.assertIn("tool_check_port_constraints", res["tools_called"])
        reply_lower = res["reply"].lower()
        self.assertTrue("haldia" in reply_lower)
        self.assertTrue("draft" in reply_lower or "shallow" in reply_lower or "sagar" in reply_lower)

    def test_agent_forecast_query(self):
        """Checks agent handles multi-horizon rate inquiries."""
        query = "What is the 14-day freight rate forecast for Richards Bay to Vizag?"
        res = self.agent.chat(query)
        self.assertIn("reply", res)
        self.assertIn("tool_get_freight_forecast", res["tools_called"])
        self.assertTrue("$" in res["reply"])

    def test_agent_hedging_query(self):
        """Checks agent provides spot vs CoA recommendations."""
        query = "Recommend a Spot vs CoA hedging split for Newcastle to Paradip."
        res = self.agent.chat(query)
        self.assertIn("reply", res)
        reply_lower = res["reply"].lower()
        self.assertTrue("coa" in reply_lower or "spot" in reply_lower or "hedg" in reply_lower)


if __name__ == "__main__":
    unittest.main()
