# Charter-IQ — Freight Forecasting & Vessel Matcher

**Charter-IQ** is a decision-support platform designed to assist bulk logistics managers at **SAIL** (Smart India Hackathon, Problem Statement 26006) in selecting freight strategies, matching vessel classes, and predicting voyage rates.

The application separates core predictive workloads from active evaluation, combining **Supervised Machine Learning models** (LightGBM/XGBoost + Prophet baseline) with a isolated **Reinforcement Learning-Based Verification & Optimization Layer** (FastAPI in Docker running Gymnasium + Stable-Baselines3 PPO).

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Data Ingestion
        A[GDELT Project API] -->|15-Min Tension news| Ingest[ingestion/scheduler.py]
        B[Open-Meteo API] -->|6-Hourly Weather| Ingest
        C[Baltic Exchange] -->|Daily BDI/BPI TCA Indices| Ingest
        D[Bunker Prices] -->|Newcastle/API4 Benchmarks| Ingest
    end

    subgraph Data & Storage
        Ingest -->|Route Adjustments| DB[(SQLite/Postgres Database)]
        DB -->|Seeded History| Store[feature_store table]
        DB -->|Dynamic silting limits| Ports[port_constraints table]
    end

    subgraph Core Decision Models
        Store -->|Lagged features| LGB[LightGBM forecasting model]
        Store -->|Regressor feeds| Prophet[Prophet baseline model]
        LGB -->|Forecasts + CIs + SHAP| API[FastAPI Gateway]
        Prophet -->|Baseline comparisons| API
    end

    subgraph RL-Based Verification Layer
        API -->|Scored Forecasts| RL[FastAPI inside Docker]
        RL -->|Gymnasium Env Step| Policy[Stable-Baselines3 PPO]
        Policy -->|Recalibration Actions| API
        Policy -->|Sync Checkpoints| HF[Hugging Face Hub]
    end

    subgraph Frontend Integration
        API -->|Informatics router| UI[Vite React Dashboard]
        UI -->|Approve/Override logs| API
        API -->|HITL database commits| DB
    end
```

---

## 2. Operational Functioning & HITL Decision Flow

Charter-IQ does **not** make autonomous chartering decisions or place freight orders. A human logistics manager remains the ultimate decision-maker via a mandatory **Human-in-the-Loop (HITL) Checkpoint**:

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Logistics Manager
    participant Dashboard as React UI Dashboard
    participant API as FastAPI Main Gateway
    participant Rules as Constraints Engine
    participant RL as RL Verification Layer

    Manager->>Dashboard: Input cargo parameters & laycan window
    Dashboard->>API: POST /api/vessel-port-rankings
    API->>Rules: Query port_constraints (Check seasonal draft)
    Rules-->>API: Pruned compatible vessel classes
    API->>API: Calculate itemized effective voyage costs
    API-->>Dashboard: Return ranked matching vessel classes
    Dashboard-->>Manager: Display recommendations + SHAP explanations
    
    alt Approved Decision
        Manager->>Dashboard: Click 'Approve Rate'
        Dashboard->>API: POST /api/hitl-overrides (accepted)
    else Overridden Decision
        Manager->>Dashboard: Input override justification reason
        Dashboard->>API: POST /api/hitl-overrides (overridden)
        API->>RL: Trigger forecast recalibration loop (/verify)
        RL->>RL: env.step() & compute Guo et al. reward
        RL-->>API: Recalibrate CI bands & model weights
    end
```

---

## 3. Directory Layout

```
├── /ingestion/            # Ingestion adapters + APScheduler cron
│   ├── fetch_external.py  # Connectors for GDELT, weather, BDI index
│   ├── route_adjustment.py# Daily Time Charter to voyage rate translator
│   └── scheduler.py       # Loop fetching parameters & seeding DB
├── /rules/                # Constraint vetting engine
│   └── engine.py          # Hard filters on draft/LOA/beam constraints
├── /forecasting/          # XGBoost/LightGBM forecaster & Prophet baseline
│   ├── train.py           # Model training pipeline
│   ├── predictor.py       # Inference, CI bootstrap & TreeSHAP explainers
│   └── hf_uploader.py     # Hugging Face Hub sync integrations
├── /matching/             # Vessel cost rankings
│   └── matcher.py         # Total effective cost calculation
├── /risk/                 # Port delay warnings
│   └── alerts.py          # Volatility z-scores & RED/AMBER/GREEN flags
├── /portfolio/            # Contract strategy
│   └── laddering.py       # Spot vs CoA quarterly schedules
├── /rl_verifier/          # Isolated verification layer microservice
│   ├── env.py             # Gymnasium calibration environment
│   ├── reward.py          # Guo et al. (2025) recalibration reward
│   ├── train_policy.py    # SB3 PPO policy model trainer
│   └── service.py         # FastAPI verification endpoints (Port 8001)
├── /api/                  # Unified database & REST API router
│   ├── db.py              # SQLAlchemy SQLite/PostgreSQL models
│   ├── seed.py            # Seeding seasonal constraints & fleet specs
│   └── main.py            # Main FastAPI server router (Port 8000)
├── /docker/               # Service container configurations
│   ├── api/Dockerfile     # Core API docker configurations
│   └── rl-verifier/       # RL-verifier microservice docker files
├── docker-compose.yml     # Orchestrates DB shared volume mapping
├── REQUIREMENTS.md        # Python dependency packages list
└── REFERENCES.md          # Scientific papers driving our algorithms
```

---

## 4. Setup and Run Instructions

### 4.1 Running with Docker Compose (Recommended)
This runs both the Core API Gateway (`8000`) and the RL Verification microservice (`8001`) with shared database storage volumes.

1. Ensure you have a `.env` in the root containing your Hugging Face Hub Token:
   ```env
   HF_TOKEN=your_hf_token_here
   ```
2. Build and boot the microservices:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:8000/docs` in your browser to view the interactive FastAPI Swagger UI.

### 4.2 Running Locally
1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Seed the database with seasonal port draft restrictions:
   ```bash
   python api/seed.py
   ```
3. Start the Core API Gateway:
   ```bash
   python api/main.py
   ```
4. In a separate terminal shell, boot the RL Verification microservice:
   ```bash
   python rl_verifier/service.py
   ```

### 4.3 Running React Frontend Dashboard
1. Install node dependencies:
   ```bash
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
3. Open the portal at the URL printed in the terminal (typically `http://localhost:5173`).
