"""
env.py
Gymnasium Environment for RL-Based Calibration Verification.
Implements ChartingVerificationEnv.
Cites Guo et al. (2025) for RL calibration model verification frameworks.
"""

import sys
import os
import random
import numpy as np
import gymnasium as gym
from gymnasium import spaces

class ChartingVerificationEnv(gym.Env):
    """
    State Space:
        - Prev forecast error (percentage)
        - CI width multiplier (scalar)
        - Port congestion delta (scalar)
        - Geopolitical news risk score (scalar)
        - Calibration rate over rolling window (percentage)
        
    Action Space (recalibration adjustments only):
        - Action 0: Confidence Interval scaling adjustment (0 = contract 15%, 1 = no change, 2 = expand 15%)
        - Action 1: Ensemble weight balance (0 = increase Prophet weight 10%, 1 = no change, 2 = increase LightGBM weight 10%)
        - Action 2: Immediate retraining trigger flag (0 = no trigger, 1 = request model retrain)
    """
    metadata = {"render_modes": ["human"]}

    def __init__(self, historical_data: list = None):
        super(ChartingVerificationEnv, self).__init__()
        
        # State: 5 float parameters
        self.observation_space = spaces.Box(
            low=np.array([0.0, 0.2, -10.0, 0.0, 0.0]),
            high=np.array([2.0, 3.0, 10.0, 100.0, 1.0]),
            dtype=np.float32
        )
        
        # Actions: Multidiscrete [CI_contract/expand, Weight_shift, Retrain_flag]
        self.action_space = spaces.MultiDiscrete([3, 3, 2])
        
        # Initialize internal variables
        self.data = historical_data if historical_data else self._generate_synthetic_history()
        self.current_idx = 0
        self.ci_multiplier = 1.0
        self.lgb_weight = 0.7
        self.recent_calibration_results = []
        
    def _generate_synthetic_history(self) -> list:
        # Create a realistic time-series array of (forecast, actual, congestion, geopolitics)
        np.random.seed(42)
        steps = 100
        history = []
        rate = 15.0
        for _ in range(steps):
            rate_delta = np.random.normal(0, 0.5)
            rate = max(10.0, rate + rate_delta)
            forecast = rate + np.random.normal(0, 0.3)
            congestion = float(np.random.randint(5, 30))
            geopol = float(np.random.uniform(5, 60))
            history.append({
                "forecast": forecast,
                "actual": rate,
                "congestion": congestion,
                "geopolitics": geopol
            })
        return history

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_idx = 0
        self.ci_multiplier = 1.0
        self.lgb_weight = 0.7
        self.recent_calibration_results = [True] * 10
        
        obs = self._get_observation()
        info = {}
        return obs, info

    def _get_observation(self) -> np.ndarray:
        row = self.data[self.current_idx]
        mape = abs(row["forecast"] - row["actual"]) / row["actual"]
        
        # Calculate rolling calibration rate
        cal_rate = sum(self.recent_calibration_results) / len(self.recent_calibration_results)
        
        cong_delta = 0.0
        if self.current_idx > 0:
            cong_delta = row["congestion"] - self.data[self.current_idx - 1]["congestion"]
            
        return np.array([
            float(mape),
            float(self.ci_multiplier),
            float(cong_delta),
            float(row["geopolitics"]),
            float(cal_rate)
        ], dtype=np.float32)

    def step(self, action):
        # 1. Decode actions
        ci_act, weight_act, retrain_act = action
        
        # CI Multiplier adjustment
        if ci_act == 0:
            self.ci_multiplier = max(0.4, self.ci_multiplier - 0.15)
        elif ci_act == 2:
            self.ci_multiplier = min(2.5, self.ci_multiplier + 0.15)
            
        # Ensemble weights adjustment
        if weight_act == 0:
            self.lgb_weight = max(0.1, self.lgb_weight - 0.1)
        elif weight_act == 2:
            self.lgb_weight = min(0.9, self.lgb_weight + 0.1)
            
        # Calculate step rewards
        row = self.data[self.current_idx]
        
        # Scored forecast value is a weighted ensemble
        prophet_weight = 1.0 - self.lgb_weight
        # Simulate forecast errors based on model balance
        base_err = abs(row["forecast"] - row["actual"])
        weighted_forecast = row["forecast"] * self.lgb_weight + (row["actual"] + 0.6) * prophet_weight
        mape = abs(weighted_forecast - row["actual"]) / row["actual"]
        
        # Check confidence interval coverage
        ci_half_width = 1.645 * 0.85 * self.ci_multiplier
        captured = (row["actual"] >= (weighted_forecast - ci_half_width)) and \
                   (row["actual"] <= (weighted_forecast + ci_half_width))
                   
        self.recent_calibration_results.pop(0)
        self.recent_calibration_results.append(captured)
        
        # Calculate Reward based on Guo et al. (2025) recalibration reward function
        # Reward factors: negative forecast error (MAPE) + penalty for over/under-confidence bands
        reward_mape = -mape * 10.0
        reward_ci = 1.0 if captured else -2.5
        
        # Retraining cost penalty (avoid constant retraining triggers)
        retrain_penalty = -1.5 if retrain_act == 1 else 0.0
        
        reward = reward_mape + reward_ci + retrain_penalty
        
        # Advance index
        self.current_idx += 1
        terminated = self.current_idx >= len(self.data) - 1
        truncated = False
        
        obs = self._get_observation() if not terminated else self.observation_space.sample()
        info = {
            "mape": mape,
            "ci_multiplier": self.ci_multiplier,
            "lgb_weight": self.lgb_weight,
            "retrain_triggered": bool(retrain_act == 1),
            "ci_captured": captured
        }
        
        return obs, reward, terminated, truncated, info

    def render(self):
        pass
