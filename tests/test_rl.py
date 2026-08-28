"""
test_rl.py
Unit tests verifying Gymnasium environment steps and reward calculations.
"""

import sys
import os
import unittest
import numpy as np

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rl_verifier.env import ChartingVerificationEnv
from rl_verifier.reward import compute_recalibration_reward

class TestRLVerification(unittest.TestCase):
    def test_recalibration_reward_function(self):
        """Tests reward behavior under Guo et al. (2025) specs."""
        # 1. Close forecast within CI -> should be positive/stable
        reward_good = compute_recalibration_reward(
            realized_rate=15.0,
            forecasted_rate=15.2,
            ci_lower=14.0,
            ci_upper=16.0,
            ci_multiplier=1.0
        )
        # 2. Forecast way off and outside CI -> severe negative penalty
        reward_bad = compute_recalibration_reward(
            realized_rate=15.0,
            forecasted_rate=19.5,
            ci_lower=14.0,
            ci_upper=16.0,
            ci_multiplier=1.0
        )
        self.assertTrue(reward_good > reward_bad)

    def test_gym_environment_interface(self):
        """Tests that ChartingVerificationEnv reset and step match Gymnasium APIs."""
        env = ChartingVerificationEnv()
        obs, info = env.reset()
        
        # Verify observation shape (5 features)
        self.assertEqual(obs.shape, (5,))
        self.assertIsInstance(info, dict)
        
        # Take a step: action is [CI multiplier shift, Weight shift, Retrain trigger]
        action = np.array([1, 1, 0])
        obs, reward, term, trunc, info = env.step(action)
        
        self.assertEqual(obs.shape, (5,))
        self.assertIsInstance(reward, float)
        self.assertIsInstance(term, bool)
        self.assertIn("mape", info)

if __name__ == "__main__":
    unittest.main()
