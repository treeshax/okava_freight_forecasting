"""
deploy_space.py
Deploys the RL Verification microservice as a Gradio Space on Hugging Face.
Using the Gradio SDK is free (avoiding 402 payment requirements) while still allowing
us to mount our FastAPI routes directly on port 7860.
"""

import os
import shutil
import logging
from dotenv import load_dotenv
from huggingface_hub import HfApi, create_repo

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_TOKEN = os.getenv("HF_TOKEN")

def deploy():
    if not HF_TOKEN:
        logger.error("HF_TOKEN not found in environment variables. Cannot deploy Space.")
        return False
        
    api = HfApi(token=HF_TOKEN)
    
    try:
        user_info = api.whoami(token=HF_TOKEN)
        username = user_info["name"]
        logger.info(f"Authenticated user: {username}")
    except Exception as e:
        logger.error(f"Failed to resolve user info: {e}")
        return False
        
    space_id = f"{username}/okava-rl-verifier"
    logger.info(f"Creating Hugging Face Space repository (Gradio SDK): {space_id}")
    try:
        create_repo(
            repo_id=space_id,
            token=HF_TOKEN,
            repo_type="space",
            space_sdk="gradio",  # 100% free tier SDK
            exist_ok=True
        )
    except Exception as e:
        logger.error(f"Failed to create Space repository: {e}")
        return False

    # Create temporary build folder
    build_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../space_build"))
    os.makedirs(build_dir, exist_ok=True)
    
    # 1. Copy folders
    shutil.copytree(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../rl_verifier")),
        os.path.join(build_dir, "rl_verifier"),
        dirs_exist_ok=True
    )
    shutil.copytree(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../api")),
        os.path.join(build_dir, "api"),
        dirs_exist_ok=True
    )
    
    # 2. Copy requirements.txt
    shutil.copy2(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../requirements.txt")),
        os.path.join(build_dir, "requirements.txt")
    )
    
    # 3. Create __init__.py files
    open(os.path.join(build_dir, "api/__init__.py"), "w").close()
    open(os.path.join(build_dir, "rl_verifier/__init__.py"), "w").close()

    # 4. Create app.py at the root of the Space build directory
    # Mounts our FastAPI app onto the Gradio interface so that the API endpoints
    # remain accessible at the root of the Space URL (e.g. /verify).
    app_py_content = """import os
import uvicorn
import gradio as gr
from rl_verifier.service import app as fastapi_app

# Create a clean Gradio interface for status monitoring
with gr.Blocks(title="Charter-IQ RL Verifier Gateway") as demo:
    gr.Markdown("# 🛳️ Charter-IQ RL Verifier & Calibration Gateway")
    gr.Markdown(
        "This space hosts the FastAPI verification and recalibration endpoints in the background. "
        "The REST APIs are exposed directly at `/verify` and `/recalibrate`."
    )
    
    with gr.Row():
        gr.Markdown("### Status: **Active & Online**")

# Mount Gradio onto the FastAPI app (Gradio routes to /status, FastAPI remains at root)
app = gr.mount_gradio_app(fastapi_app, demo, path="/status")

if __name__ == "__main__":
    # Hugging Face sets the PORT environment variable to 7860
    port = int(os.getenv("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
"""
    
    with open(os.path.join(build_dir, "app.py"), "w") as f:
        f.write(app_py_content)
        
    logger.info(f"Uploading build folder to HF Space: {space_id}")
    try:
        api.upload_folder(
            folder_path=build_dir,
            repo_id=space_id,
            repo_type="space",
            token=HF_TOKEN
        )
        logger.info(f"Deployment complete! View your space at: https://huggingface.co/spaces/{space_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to upload space directory folder: {e}")
        return False
    finally:
        if os.path.exists(build_dir):
            shutil.rmtree(build_dir)

if __name__ == "__main__":
    deploy()
