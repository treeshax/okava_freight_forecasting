"""
train_policy.py
RL Training Engine.
Trains a Stable-Baselines3 PPO policy over historical and synthetic fixtures data.
"""

import sys
import os
import logging
from stable_baselines3 import PPO

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rl_verifier.env import ChartingVerificationEnv
from api.db import init_db, SessionLocal, FeatureStore
from forecasting.hf_uploader import HuggingFaceClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

POLICY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
os.makedirs(POLICY_DIR, exist_ok=True)

def train_verifier_policy():
    logger.info("Initializing Gymnasium environment for training...")
    
    # Load historical fixtures from feature store if available
    db = SessionLocal()
    records = []
    try:
        features = db.query(FeatureStore).order_by(FeatureStore.date.asc()).all()
        for f in features:
            records.append({
                "forecast": f.freight_rate + 0.1,  # simulated point
                "actual": f.freight_rate,
                "congestion": float(f.congestion),
                "geopolitics": float(f.geopolitics_index)
            })
    except Exception as e:
        logger.warning(f"Feature store not fully populated: {e}. Using synthetic environment datasets.")
    finally:
        db.close()
        
    env = ChartingVerificationEnv(historical_data=records if records else None)
    
    logger.info("Instantiating PPO policy model...")
    # Clean PPO model setup
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        n_steps=64,
        batch_size=16,
        n_epochs=10,
        verbose=1,
        seed=42
    )
    
    logger.info("Training PPO model for 500 steps...")
    model.learn(total_timesteps=500)
    
    policy_path = os.path.join(POLICY_DIR, "ppo_verifier.zip")
    model.save(policy_path)
    logger.info(f"PPO Policy checkpoint saved locally at {policy_path}")
    
    # Upload policy weights to Hugging Face Hub
    hf_client = HuggingFaceClient()
    hf_client.upload_model_artifact(policy_path, "rl_verifier/ppo_verifier.zip")

if __name__ == "__main__":
    init_db()
    train_verifier_policy()
