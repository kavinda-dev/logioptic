import requests
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from predictor import predict_travel_time
from typing import List, Dict


def get_osrm_matrix(locations: List[Dict]) -> tuple:
    """
    Calls the OSRM Table API to get real road distances
    and base travel durations for all location pairs.
    Returns two NxN matrices: durations (seconds) and distances (metres).
    """

    coords_str = ";".join([f"{loc['lng']},{loc['lat']}" for loc in locations])
    url = (
        f"http://router.project-osrm.org/table/v1/driving/{coords_str}"
        f"?annotations=duration,distance"
    )

    response = requests.get(url, timeout=60)
    data = response.json()

    if data.get("code") != "Ok":
        raise Exception(f"OSRM API error: {data.get('code')}")

    return data["durations"], data["distances"]


def get_osrm_route(ordered_locations):
    """
    Calls the OSRM Route API for the ordered stop sequence.
    Returns real road geometry (lat/lng pairs), total distance in km,
    and step-by-step driving directions.
    """
    coords_str = ";".join([f"{loc['lng']},{loc['lat']}" for loc in ordered_locations])
    url = (
        f"http://router.project-osrm.org/route/v1/driving/{coords_str}"
        f"?geometries=geojson&steps=true&overview=full"
    )
    response = requests.get(url, timeout=60)
    data = response.json()

    if data.get("code") != "Ok":
        return None  # graceful fallback — don't crash the whole response

    route = data["routes"][0]

    # OSRM returns [lng, lat] — Leaflet needs [lat, lng]
    geometry = [
        [pt[1], pt[0]]
        for pt in route["geometry"]["coordinates"]
    ]

    steps = []
    for leg in route["legs"]:
        for step in leg["steps"]:
            maneuver = step.get("maneuver", {})
            mtype    = maneuver.get("type", "")
            modifier = maneuver.get("modifier", "")
            name     = step.get("name", "")
            dist_m   = round(step.get("distance", 0))

            if mtype == "depart":
                instruction = f"Head {modifier} on {name}" if name else "Depart"
            elif mtype == "arrive":
                instruction = "Arrive at destination"
            elif mtype == "turn":
                direction   = modifier.replace("-", " ") if modifier else ""
                instruction = f"Turn {direction} onto {name}" if name else f"Turn {direction}"
            elif mtype in ["roundabout", "rotary"]:
                instruction = "Enter roundabout"
            elif mtype in ["exit roundabout", "exit rotary"]:
                instruction = f"Exit roundabout onto {name}" if name else "Exit roundabout"
            elif mtype == "fork":
                instruction = f"Keep {modifier} at fork" if modifier else "Keep straight at fork"
            else:
                instruction = f"Continue on {name}" if name else "Continue"

            if dist_m > 0:  # skip zero-distance steps
                steps.append({
                    "instruction": instruction,
                    "distance_m":  dist_m,
                })

    return {
        "distance_km": round(route["distance"] / 1000, 2),
        "geometry":    geometry,
        "steps":       steps,
    }


def build_time_matrix(locations: List[Dict], time_of_day: str, day_type: str):
    """
    Builds an NxN travel time matrix (in seconds) using:
    - OSRM for real road distances and base durations
    - XGBoost for traffic-adjusted travel time prediction
    """

    n = len(locations)
    durations_matrix, distances_matrix = get_osrm_matrix(locations)

    time_matrix = []

    for i in range(n):
        row = []
        for j in range(n):
            if i == j:
                row.append(0)
                continue

            base_sec = durations_matrix[i][j]
            dist_m   = distances_matrix[i][j]

            if base_sec is None or dist_m is None:
                row.append(999999)
                continue

            predicted_minutes = predict_travel_time(
                distance_km            = dist_m / 1000,
                osrm_base_duration_min = base_sec / 60,
                origin_lat             = locations[i]['lat'],
                origin_lng             = locations[i]['lng'],
                dest_lat               = locations[j]['lat'],
                dest_lng               = locations[j]['lng'],
                time_of_day            = time_of_day,
                day_type               = day_type
            )

            # OR-Tools requires integer weights; convert predicted minutes to seconds
            row.append(int(predicted_minutes * 60))

        time_matrix.append(row)

    return time_matrix, distances_matrix


def solve_vrp(
    locations: List[Dict],
    time_of_day: str,
    day_type: str,
    num_vehicles: int = 1,
    depot_index: int = 0
) -> Dict:
    """
    Solves the Vehicle Routing Problem using Google OR-Tools.
    Uses XGBoost-predicted travel times as edge weights.
    Returns optimized routes with stop sequences and ETAs.
    """

    n = len(locations)
    effective_vehicles = min(num_vehicles, n - 1)  # can't have more vehicles than stops
    time_matrix, distances_matrix = build_time_matrix(locations, time_of_day, day_type)

    manager = pywrapcp.RoutingIndexManager(n, effective_vehicles, depot_index)
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node   = manager.IndexToNode(to_index)
        return time_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Force stops to be distributed across vehicles
    max_stops = -(-(n - 1) // effective_vehicles)  # ceiling division

    def visit_callback(from_index):
        node = manager.IndexToNode(from_index)
        return 0 if node == depot_index else 1

    visit_cb_idx = routing.RegisterUnaryTransitCallback(visit_callback)
    routing.AddDimensionWithVehicleCapacity(
        visit_cb_idx,
        0,
        [max_stops] * effective_vehicles,
        True,
        'Visits'
    )

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = 10

    solution = routing.SolveWithParameters(search_params)

    if not solution:
        raise Exception("OR-Tools could not find a solution")

    routes = []
    total_time_seconds = 0

    for vehicle_id in range(effective_vehicles):
        index = routing.Start(vehicle_id)
        route_stops = []
        cumulative_seconds = 0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            loc  = locations[node]

            route_stops.append({
                "id":           loc.get('id', node),
                "name":         loc.get('name', f'Stop {node}'),
                "lat":          loc['lat'],
                "lng":          loc['lng'],
                "eta_minutes":  round(cumulative_seconds / 60, 1)
            })

            next_index = solution.Value(routing.NextVar(index))
            cumulative_seconds += routing.GetArcCostForVehicle(index, next_index, vehicle_id)
            index = next_index

        # add the return-to-depot stop
        node = manager.IndexToNode(index)
        loc  = locations[node]
        route_stops.append({
            "id":           loc.get('id', node),
            "name":         loc.get('name', 'Depot'),
            "lat":          loc['lat'],
            "lng":          loc['lng'],
            "eta_minutes":  round(cumulative_seconds / 60, 1)
        })

        total_time_seconds += cumulative_seconds

        ordered_locs = [{"lat": s["lat"], "lng": s["lng"]} for s in route_stops]
        road_data = get_osrm_route(ordered_locs)

        routes.append({
            "vehicle_id":         vehicle_id + 1,
            "stops":              route_stops,
            "total_time_minutes": round(cumulative_seconds / 60, 1),
            "distance_km":        road_data["distance_km"] if road_data else None,
            "geometry":           road_data["geometry"]    if road_data else [],
            "steps":              road_data["steps"]       if road_data else [],
        })

    total_distance_km = sum(r["distance_km"] for r in routes if r["distance_km"])
    return {
        "routes":               routes,
        "total_time_minutes":   round(total_time_seconds / 60, 1),
        "total_distance_km":    round(total_distance_km, 2),
        "num_stops":            n - 1
    }
