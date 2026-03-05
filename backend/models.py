from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String, unique=True, index=True, nullable=False)
    password   = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RouteHistory(Base):
    __tablename__ = "route_history"
    id                 = Column(Integer, primary_key=True, index=True)
    username           = Column(String, nullable=False)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    time_of_day        = Column(String)
    day_type           = Column(String)
    num_vehicles       = Column(Integer)
    num_stops          = Column(Integer)
    total_time_minutes = Column(Float)
    total_distance_km  = Column(Float)
    result_json        = Column(Text)
