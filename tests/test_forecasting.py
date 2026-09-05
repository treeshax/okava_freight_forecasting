"""
test_forecasting.py
Unit tests verifying multi-horizon predictions, confidence interval bounds,
and SHAP attribution explainability.
"""

import sys
import os
import unittest
import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from forecasting.predictor import FreightPredictor
from forecasting.train import create_features, load_data_from_db, FEATURE_COLS


class TestForecastingPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = FreightPredictor()

    def test_feature_engineering_integrity(self):
        """Verifies that create_features generates all required feature and target columns without NaNs."""
        df = load_data_from_db()
        self.assertFalse(df.empty, "Feature store should not be empty")
        
        featured_df = create_features(df)
        
        # Verify target columns exist
        for h in [7, 14, 30]:
            self.assertIn(f"target_{h}d", featured_df.columns)
            
        # Verify all feature columns exist
        for col in FEATURE_COLS:
            self.assertIn(col, featured_df.columns)
            # Ensure no NaNs in feature matrix
            self.assertEqual(featured_df[col].isna().sum(), 0, f"Column {col} has unexpected NaNs")

    def test_multi_horizon_inference_bounds(self):
        """Checks that 7d, 14d, and 30d forecasts return valid points, curves, and calibrated CIs."""
        for horizon in [7, 14, 30]:
            res = self.predictor.predict_freight("NCWL", "PRDP", "panamax", horizon_days=horizon)
            
            self.assertIn("point_forecast", res)
            self.assertIn("ci_lower", res)
            self.assertIn("ci_upper", res)
            self.assertIn("curve", res)
            self.assertIn("top_shap_features", res)
            
            # Calibrated CI ordering
            self.assertLessEqual(res["ci_lower"], res["point_forecast"], "Lower CI bound must be <= point forecast")
            self.assertGreaterEqual(res["ci_upper"], res["point_forecast"], "Upper CI bound must be >= point forecast")
            
            # Curve trajectory length matches horizon
            self.assertEqual(len(res["curve"]), horizon, f"Curve length should match horizon {horizon}")
            
            # SHAP attribution keys
            self.assertTrue(len(res["top_shap_features"]) > 0, "Should have top SHAP drivers")
            first_driver = res["top_shap_features"][0]
            self.assertIn("feature", first_driver)
            self.assertIn("impact", first_driver)
            self.assertIn("color", first_driver)


if __name__ == "__main__":
    unittest.main()
