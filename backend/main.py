from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from optimizer import solve_vrp

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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
