import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from optimizer import solve_vrp
from database import engine, SessionLocal, get_db
from models import Base, User, RouteHistory

# ============================================================
# FASTAPI APPLICATION SETUP
# ============================================================

app = FastAPI(
    title="LogiOptic API",
    description="AI-powered route optimization and ETA prediction for Sri Lankan logistics SMEs",
    version="1.0.0"
)

# allow the React frontend (running on port 3000) to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# DATABASE STARTUP
# ============================================================

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            db.add(User(username="admin", password="logioptic2026"))
            db.commit()
    finally:
        db.close()

# ============================================================
# REQUEST AND RESPONSE MODELS
# Defines the structure of data sent to and from the API
# ============================================================

class Location(BaseModel):
    id:   Optional[int] = None
    name: str
    lat:  float
    lng:  float

class OptimizeRequest(BaseModel):
    locations:    List[Location]
    time_of_day:  str   # morning_peak | midday | evening_peak | night
    day_type:     str   # weekday | weekend
    num_vehicles: int   = 1
    depot_index:  int   = 0

# ============================================================
# API ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {"message": "LogiOptic API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/optimize")
def optimize_routes(request: OptimizeRequest):
    """
    Main optimization endpoint.
    Accepts a list of delivery locations and traffic conditions.
    Returns optimized routes with predicted ETAs using XGBoost + OR-Tools.
    """

    # validate number of locations
    if len(request.locations) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 locations are required"
        )

    # validate time_of_day
    valid_time_slots = ["morning_peak", "midday", "evening_peak", "night"]
    if request.time_of_day not in valid_time_slots:
        raise HTTPException(
            status_code=400,
            detail=f"time_of_day must be one of {valid_time_slots}"
        )

    # validate day_type
    valid_day_types = ["weekday", "weekend"]
    if request.day_type not in valid_day_types:
        raise HTTPException(
            status_code=400,
            detail=f"day_type must be one of {valid_day_types}"
        )

    try:
        locations_list = [loc.dict() for loc in request.locations]

        result = solve_vrp(
            locations    = locations_list,
            time_of_day  = request.time_of_day,
            day_type     = request.day_type,
            num_vehicles = request.num_vehicles,
            depot_index  = request.depot_index
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# COMPARE ENDPOINT
# Runs the same stops across all 4 time periods and returns
# ETAs + stop orders for each — demonstrates traffic-aware
# rerouting for demo/viva purposes.
# ============================================================

class CompareRequest(BaseModel):
    locations: list
    day_type: str
    num_vehicles: int = 1
    depot_index: int = 0

@app.post("/api/compare")
async def compare_times(req: CompareRequest):
    """
    Run route optimization for all 4 time periods with the same stops.
    Returns total time, distance, and stop order for each period.
    """
    time_periods = ["morning_peak", "midday", "evening_peak", "night"]
    results = {}
    for period in time_periods:
        try:
            result = solve_vrp(
                locations=req.locations,
                time_of_day=period,
                day_type=req.day_type,
                num_vehicles=req.num_vehicles,
                depot_index=req.depot_index
            )
            results[period] = {
                "total_time_minutes": result["total_time_minutes"],
                "total_distance_km":  result["total_distance_km"],
                "stop_order": [
                    s["name"]
                    for s in result["routes"][0]["stops"]
                ]
            }
        except Exception as e:
            results[period] = {"error": str(e)}
    return results


# ============================================================
# AUTH AND ROUTE HISTORY MODELS
# ============================================================

class LoginRequest(BaseModel):
    username: str
    password: str

class SaveRouteRequest(BaseModel):
    username: str
    time_of_day: str
    day_type: str
    num_vehicles: int
    result: dict


# ============================================================
# AUTH AND ROUTE HISTORY ENDPOINTS
# ============================================================

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == req.username,
        User.password == req.password
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"username": user.username}


@app.post("/api/routes/save")
def save_route(req: SaveRouteRequest, db: Session = Depends(get_db)):
    route = RouteHistory(
        username=req.username,
        time_of_day=req.time_of_day,
        day_type=req.day_type,
        num_vehicles=req.num_vehicles,
        num_stops=req.result.get("num_stops", 0),
        total_time_minutes=req.result.get("total_time_minutes", 0),
        total_distance_km=req.result.get("total_distance_km", 0),
        result_json=json.dumps(req.result),
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return {"id": route.id, "message": "Route saved"}


@app.get("/api/routes/history")
def get_history(username: str, db: Session = Depends(get_db)):
    routes = db.query(RouteHistory).filter(
        RouteHistory.username == username
    ).order_by(RouteHistory.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "time_of_day": r.time_of_day,
            "day_type": r.day_type,
            "num_vehicles": r.num_vehicles,
            "num_stops": r.num_stops,
            "total_time_minutes": r.total_time_minutes,
            "total_distance_km": r.total_distance_km,
            "result_json": r.result_json,
        }
        for r in routes
    ]
