FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose main API gateway port
EXPOSE 8000

# Seeding script runs first, then API boots
CMD ["sh", "-c", "python api/seed.py && python api/main.py"]
