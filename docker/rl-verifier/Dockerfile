# Use official PyTorch CPU base image (SB3 requires torch)
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies (CPU build of PyTorch is lighter and sufficient for CPU verifier)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy source directory into container
COPY . .

# Expose microservice port
EXPOSE 8001

# Command to boot the FastAPI microservice
CMD ["python", "rl_verifier/service.py"]
