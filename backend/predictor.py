import joblib
import numpy as np
import os

# ============================================================
# LOAD TRAINED MODEL AND ENCODERS
# These were saved during the training phase in train_model.ipynb
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(BASE_DIR, '..', 'ml_model', 'eta_model.pkl')
LE_TIME_PATH = os.path.join(BASE_DIR, '..', 'ml_model', 'le_time.pkl')
LE_DAY_PATH  = os.path.join(BASE_DIR, '..', 'ml_model', 'le_day.pkl')

model   = joblib.load(MODEL_PATH)
le_time = joblib.load(LE_TIME_PATH)
le_day  = joblib.load(LE_DAY_PATH)

print("XGBoost model and encoders loaded successfully")

# ============================================================
# PREDICTION FUNCTION
# Takes route features and returns predicted travel time
# ============================================================

def predict_travel_time(
    distance_km: float,
    osrm_base_duration_min: float,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    time_of_day: str,
    day_type: str
) -> float:
    """
    Predicts travel time in minutes using the trained XGBoost model.
    All features must match exactly what the model was trained on.
    """

    # encode categorical features using the saved encoders
    time_enc = le_time.transform([time_of_day])[0]
    day_enc  = le_day.transform([day_type])[0]

    # build feature array in the same order used during training
    features = np.array([[
        distance_km,
        osrm_base_duration_min,
        origin_lat,
        origin_lng,
        dest_lat,
        dest_lng,
        time_enc,
        day_enc
    ]])

    prediction = model.predict(features)[0]
    return float(round(prediction, 2))
