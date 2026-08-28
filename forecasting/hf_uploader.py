"""
hf_uploader.py
Hugging Face Hub Client Adapter.
Synchronizes trained ML models (LightGBM/XGBoost), RL checkpoints, and training datasets.
Supports a robust fallback to local directories in case of network failures or credential issues.
"""

import os
import logging
from dotenv import load_dotenv
from huggingface_hub import HfApi, create_repo, hf_hub_download

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_TOKEN = os.getenv("HF_TOKEN")
# Defaults to a user-specific namespace repository
HF_REPO_ID = os.getenv("HF_REPO_ID", "abhinavvsingh/okava_charter_iq_models")

class HuggingFaceClient:
    def __init__(self):
        self.enabled = False
        if not HF_TOKEN:
            logger.warning("HF_TOKEN not found in environment variables. Running in local-only mode.")
            return
        
        try:
            self.api = HfApi(token=HF_TOKEN)
            self.enabled = True
            logger.info(f"Hugging Face Client initialized successfully for repo: {HF_REPO_ID}")
        except Exception as e:
            logger.error(f"Failed to initialize Hugging Face Hub client: {e}. Falling back to local mode.")
            self.enabled = False

    def ensure_repository(self):
        """
        Creates the target repository if it does not exist.
        """
        if not self.enabled:
            return False
        try:
            create_repo(
                repo_id=HF_REPO_ID,
                token=HF_TOKEN,
                repo_type="model",
                exist_ok=True
            )
            return True
        except Exception as e:
            logger.warning(f"Could not create/verify Hugging Face repository {HF_REPO_ID}: {e}")
            return False

    def upload_model_artifact(self, local_path: str, remote_filename: str):
        """
        Uploads a serialized model pickle file to the Hugging Face repository.
        """
        if not self.enabled:
            logger.info(f"Skipping HF upload. Saved locally to {local_path}")
            return False
        
        try:
            self.ensure_repository()
            self.api.upload_file(
                path_or_fileobj=local_path,
                path_in_repo=remote_filename,
                repo_id=HF_REPO_ID,
                repo_type="model",
                token=HF_TOKEN
            )
            logger.info(f"Successfully uploaded {local_path} to HF Hub as {remote_filename}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload artifact {local_path} to Hugging Face: {e}")
            return False

    def download_model_artifact(self, remote_filename: str, local_dest: str) -> str:
        """
        Downloads a serialized model weight from Hugging Face Hub.
        """
        if not self.enabled:
            logger.info(f"Skipping HF download. Using local file {local_dest} directly.")
            return local_dest
        
        try:
            downloaded_path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=remote_filename,
                token=HF_TOKEN,
                local_dir=os.path.dirname(local_dest)
            )
            logger.info(f"Downloaded model artifact: {remote_filename} to {downloaded_path}")
            return downloaded_path
        except Exception as e:
            logger.warning(f"Failed to download {remote_filename} from HF Hub: {e}. Trying local fallback.")
            return local_dest
            
    def push_dataset_to_hub(self, pandas_df, dataset_name: str):
        """
        Pushes a historical/synthetic training dataset to Hugging Face Hub.
        """
        if not self.enabled:
            logger.info(f"Local fallback: dataset '{dataset_name}' not uploaded.")
            return False
        try:
            from datasets import Dataset
            dataset = Dataset.from_pandas(pandas_df)
            dataset.push_to_hub(
                repo_id=f"{HF_REPO_ID.replace('_models', '_' + dataset_name)}",
                token=HF_TOKEN
            )
            logger.info(f"Successfully pushed dataset {dataset_name} to HF Hub.")
            return True
        except Exception as e:
            logger.error(f"Failed to push dataset to Hugging Face: {e}")
            return False
