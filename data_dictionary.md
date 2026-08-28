# Data Dictionary — Charter-IQ Database

This document lists the schema tables, columns, types, descriptions, sources, and refresh cadences for the databases supporting Charter-IQ.

---

## 1. Table: `feature_store`
Stores historical and ingested operational/environmental variables keyed by date, route, and vessel class.

| Column Name | Data Type | Description | Primary Data Source | Refresh Cadence |
|---|---|---|---|---|
| `date` | DATE | Date of observation (Primary Key Part 1) | System Clock | Continuous |
| `origin` | VARCHAR(10) | Origin port code (e.g., NCWL) (Primary Key Part 2) | Port Specs | Static |
| `destination` | VARCHAR(10) | Discharge port code (e.g., PRDP) (Primary Key Part 3) | Port Specs | Static |
| `vessel_class` | VARCHAR(20) | Capesize / Panamax / Supramax / Handysize (PK Part 4) | System Specs | Static |
| `freight_rate` | NUMERIC | Voyage freight rate in USD/Metric Ton (Estimated/Realized) | Baltic Exchange (Derived) | Daily |
| `congestion` | INTEGER | Congestion index score (0-10) based on active queue count | AISStream.io / AISHub | Hourly |
| `weather_alert` | BOOLEAN | Indicates wind speeds > 30kts or cyclone advisory active | Open-Meteo or NOAA | 6-hourly |
| `geopolitics_index` | NUMERIC | GDELT volume score of regional disruption news | GDELT Project GKG API | 15-min |
| `fuel_cost` | NUMERIC | VLSFO / MGO fuel cost average in USD/MT | Bunker Hubs (SGP/Rotterdam) | Daily |

---

## 2. Table: `port_constraints`
Maintains physical port dimensions that change seasonally due to monsoon silting or berthing construction.

| Column Name | Data Type | Description | Primary Data Source | Refresh Cadence |
|---|---|---|---|---|
| `port_id` | VARCHAR(10) | Port code (e.g., HALD) (Primary Key Part 1) | Port Authorities | Semi-static |
| `max_draft` | NUMERIC | Maximum allowable draft in meters | Port Guidelines / Ingestion | Monthly (Seasonal) |
| `max_loa` | NUMERIC | Maximum vessel Length Overall in meters | Port Guidelines | Versioned/Manual |
| `max_beam` | NUMERIC | Maximum vessel beam width in meters | Port Guidelines | Versioned/Manual |
| `effective_from` | DATE | Starting date range of constraints (Primary Key Part 2) | Operational Schedule | Dynamic |
| `effective_to` | DATE | Ending date range of constraints | Operational Schedule | Dynamic |

---

## 3. Table: `hitl_overrides`
Records log parameters for Human-in-the-Loop decision actions.

| Column Name | Data Type | Description | Primary Data Source | Refresh Cadence |
|---|---|---|---|---|
| `id` | INTEGER | Auto-incrementing identifier (Primary Key) | System DB | Instantaneous |
| `timestamp` | TIMESTAMP | Moment the decision was logged | System Clock | Event-driven |
| `username` | VARCHAR(50) | Logistics manager identification | User Authentication | Event-driven |
| `route` | VARCHAR(30) | Origin-Destination path (e.g., "NCWL -> PRDP") | User Interface | Event-driven |
| `vessel_class` | VARCHAR(20) | Selected vessel class class | User Interface | Event-driven |
| `recommendation`| TEXT | System generated rate forecast or ranking proposal | Main API Engine | Event-driven |
| `decision` | VARCHAR(20) | 'accepted' or 'overridden' | User Selection | Event-driven |
| `override_reason`| TEXT | Free-text commentary justifying override decision | User Comments | Event-driven |

---

## 4. Table: `recalibration_logs`
Logs verification checkpoints executed by the RL optimization layer.

| Column Name | Data Type | Description | Primary Data Source | Refresh Cadence |
|---|---|---|---|---|
| `id` | INTEGER | Auto-incrementing identifier (Primary Key) | System DB | Instantaneous |
| `timestamp` | TIMESTAMP | Run verification timestamp | System Clock | Event-driven |
| `model_version` | VARCHAR(30) | Version tag of active ML forecasters (e.g., v14) | Hugging Face Hub | Dynamic |
| `reward` | NUMERIC | Recalibration reward score computed by the RL policy | RL Verifier | Event-driven |
| `mape` | NUMERIC | Mean Absolute Percentage Error on verification batch | ML Evaluation | Event-driven |
| `ci_calibration` | NUMERIC | Percentage of realized rates captured within confidence bands | ML Evaluation | Event-driven |
