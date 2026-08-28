"""
reward.py
Implements the recalibration reward function from Guo et al. (2025).
Combines forecasting error reduction, confidence interval accuracy,
and retraining cost optimization parameters.
"""

def compute_recalibration_reward(
    realized_rate: float,
    forecasted_rate: float,
    ci_lower: float,
    ci_upper: float,
    ci_multiplier: float,
    retrain_triggered: bool = False
) -> float:
    """
    Guo et al. (2025) Recalibration Reward Equation:
    Reward = -w1 * MAPE - w2 * PinballLoss(CI) - w3 * Penalty(Retrain)
    """
    # 1. MAPE point penalty
    mape = abs(forecasted_rate - realized_rate) / realized_rate
    w1 = 15.0
    mape_penalty = -w1 * mape
    
    # 2. Pinball loss / Calibration captured boundary check
    in_interval = (realized_rate >= ci_lower) and (realized_rate <= ci_upper)
    w2 = 3.0
    
    # Penalty for excessively wide CIs (wasteful uncertainty) vs narrow failures
    ci_width = ci_upper - ci_lower
    width_penalty = -0.05 * ci_width
    
    if in_interval:
        # Captured, reward the accuracy but adjust for width efficiency
        calibration_term = 2.0 + width_penalty
    else:
        # Failed, severe calibration penalty
        calibration_term = -w2 * 4.0
        
    # 3. Retraining trigger frequency dampener
    w3 = 2.0
    retrain_penalty = -w3 * 1.5 if retrain_triggered else 0.0
    
    # Total calibration reward
    total_reward = mape_penalty + calibration_term + retrain_penalty
    return round(total_reward, 4)
