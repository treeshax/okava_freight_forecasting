"""
db.py
Database connection configuration and ORM schemas for SQLite/PostgreSQL.
Includes FeatureStore, PortConstraints, HITLOverrides, and RecalibrationLogs.
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, DateTime, Date, Text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./charter_iq.db")

# If using sqlite, add connect_args to avoid thread sharing limits
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FeatureStore(Base):
    __tablename__ = "feature_store"
    
    date = Column(Date, primary_key=True)
    origin = Column(String(10), primary_key=True)
    destination = Column(String(10), primary_key=True)
    vessel_class = Column(String(20), primary_key=True)
    
    freight_rate = Column(Float, nullable=False)
    congestion = Column(Integer, default=0)
    weather_alert = Column(Boolean, default=False)
    geopolitics_index = Column(Float, default=0.0)
    fuel_cost = Column(Float, default=600.0)

class PortConstraint(Base):
    __tablename__ = "port_constraints"
    
    port_id = Column(String(10), primary_key=True)
    max_draft = Column(Float, nullable=False)
    max_loa = Column(Float, nullable=False)
    max_beam = Column(Float, nullable=False)
    effective_from = Column(Date, primary_key=True)
    effective_to = Column(Date, nullable=False)

class HitlOverride(Base):
    __tablename__ = "hitl_overrides"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    username = Column(String(50), nullable=False)
    route = Column(String(30), nullable=False)
    vessel_class = Column(String(20), nullable=False)
    recommendation = Column(Text, nullable=False)
    decision = Column(String(20), nullable=False)  # 'accepted' or 'overridden'
    override_reason = Column(Text, nullable=True)

class RecalibrationLog(Base):
    __tablename__ = "recalibration_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    model_version = Column(String(30), nullable=False)
    reward = Column(Float, nullable=False)
    mape = Column(Float, nullable=False)
    ci_calibration = Column(Float, nullable=False)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
