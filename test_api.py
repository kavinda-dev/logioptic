import requests

# test data - 4 delivery locations in Colombo
payload = {
    "locations": [
        {"id": 1, "name": "Colombo Fort",  "lat": 6.9344, "lng": 79.8428},
        {"id": 2, "name": "Nugegoda",      "lat": 6.8689, "lng": 79.8889},
        {"id": 3, "name": "Maharagama",    "lat": 6.8467, "lng": 79.9283},
        {"id": 4, "name": "Rajagiriya",    "lat": 6.9111, "lng": 79.8989}
    ],
    "time_of_day":  "morning_peak",
    "day_type":     "weekday",
    "num_vehicles": 1,
    "depot_index":  0
}

response = requests.post("http://127.0.0.1:8000/api/optimize", json=payload)

print(f"Status: {response.status_code}")
print(response.json())
