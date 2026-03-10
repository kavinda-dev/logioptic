# LogiOptic

AI-powered route optimization and ETA prediction system for logistics SMEs in Sri Lanka. Built as a dissertation project for BSc (Hons) Software Engineering at Cardiff Metropolitan University.

LogiOptic combines XGBoost machine learning with Google OR-Tools vehicle routing to optimize multi-stop delivery routes while accounting for real-world traffic patterns in Colombo and the Western Province.

![Python](https://img.shields.io/badge/Python-3.x-blue)
![React](https://img.shields.io/badge/React-19.x-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.x-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791)

## Features

- **AI-Powered ETA Prediction** — XGBoost model trained on 2,000 delivery records with traffic-aware time multipliers (R² = 0.97, MAE = 4.6 min)
- **Multi-Vehicle Route Optimization** — Google OR-Tools VRP solver distributes stops across 1–5 vehicles with balanced load distribution
- **Real Road Routing** — OSRM integration for actual road distances, geometry, and turn-by-turn directions
- **Interactive Map** — Leaflet-based visualization with color-coded routes per vehicle
- **Traffic Period Comparison** — Compare optimized routes across morning peak, midday, evening peak, and night periods
- **CSV Batch Upload** — Import delivery locations from CSV files
- **Route History** — Save and view past optimizations per user
- **Print-Ready Route Sheets** — Export professional route sheets for drivers
- **Analytics Dashboard** — Charts for ETA progression, per-vehicle comparison, and summary metrics

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Python |
| Frontend | React, Leaflet, Recharts |
| ML Model | XGBoost, Scikit-learn |
| Optimization | Google OR-Tools |
| Routing Data | OSRM (Open Source Routing Machine) |
| Database | PostgreSQL, SQLAlchemy |
| Geocoding | Nominatim (OpenStreetMap) |

## Project Structure

```
LogiOptic/
├── backend/
│   ├── main.py              # FastAPI app with API endpoints
│   ├── optimizer.py          # OSRM + OR-Tools VRP solver
│   ├── predictor.py          # XGBoost model inference
│   ├── models.py             # SQLAlchemy ORM models
│   └── database.py           # PostgreSQL connection
│
├── frontend/logioptic-ui/
│   └── src/
│       ├── App.js            # Main React component
│       └── components/
│           ├── MapView.js        # Interactive map
│           ├── AnalyticsPanel.js # Charts and metrics
│           ├── CSVUpload.js      # Batch location import
│           └── LoginPage.js      # Authentication
│
├── ml_model/
│   ├── eta_model.pkl         # Trained XGBoost model
│   ├── le_time.pkl           # Time-of-day label encoder
│   ├── le_day.pkl            # Day-type label encoder
│   ├── generate_dataset.py   # Dataset generation script
│   └── train_model.ipynb     # Model training notebook
│
└── data/
    └── logioptic_dataset.csv # Training dataset
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 15+

### Database Setup

Create a PostgreSQL database named `logioptic`:

```sql
CREATE DATABASE logioptic;
```

Tables are auto-created on server startup via SQLAlchemy.

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows CMD
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install fastapi uvicorn psycopg2-binary sqlalchemy xgboost scikit-learn ortools pandas numpy requests joblib

# Start the server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend/logioptic-ui

# Install dependencies
npm install

# Start the dev server
npm start
```

The app opens at `http://localhost:3000`.

### Default Login

- **Username:** `admin`
- **Password:** `logioptic2026`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/optimize` | Optimize routes for given locations |
| POST | `/api/compare` | Compare routes across all time periods |
| POST | `/api/auth/login` | User authentication |
| POST | `/api/routes/save` | Save a route to history |
| GET | `/api/routes/history` | Fetch saved routes for a user |
| GET | `/health` | Health check |

## How It Works

1. **Input** — Users add delivery locations via search or CSV upload, then select time of day, day type, and number of vehicles.
2. **Distance Matrix** — OSRM computes real road distances and base travel times between all location pairs.
3. **ETA Prediction** — The XGBoost model predicts traffic-adjusted travel times using distance, coordinates, time period, and day type as features.
4. **Route Optimization** — OR-Tools solves the Vehicle Routing Problem using predicted travel times as edge weights, distributing stops across vehicles.
5. **Visualization** — Optimized routes are displayed on an interactive map with turn-by-turn directions, ETA breakdowns, and analytics charts.

## Traffic Multipliers

| Period | Multiplier |
|--------|-----------|
| Morning Peak | 1.8x |
| Midday | 1.2x |
| Evening Peak | 2.0x |
| Night | 0.85x |

## License

This project was developed as an academic dissertation. All rights reserved.

## Author

**H P Sanchuka Kavinda**
BSc (Hons) Software Engineering — Cardiff Metropolitan University
