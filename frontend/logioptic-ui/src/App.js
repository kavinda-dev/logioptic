import React, { useState } from 'react';
import axios from 'axios';
import MapView from './components/MapView';
import LoginPage from './components/LoginPage';
import CSVUpload from './components/CSVUpload';
import AnalyticsPanel from './components/AnalyticsPanel';
import './App.css';

// ============================================================
// MAIN APP COMPONENT
// ============================================================

function formatTime(minutes) {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

const TIME_OPTIONS = ['morning_peak', 'midday', 'evening_peak', 'night'];
const DAY_OPTIONS  = ['weekday', 'weekend'];

// geocode a place name using Nominatim (OpenStreetMap) - restricted to Sri Lanka
async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=lk`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' }
  });
  const data = await res.json();
  if (data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

// 100 known locations from the training dataset (Colombo / Western Province)
const LOCATIONS = [
  { name: "Aluthgama", lat: 6.4333, lng: 79.9992 },
  { name: "Athurugiriya", lat: 6.8783, lng: 79.9917 },
  { name: "Attanagalla", lat: 7.175, lng: 80.0706 },
  { name: "Avissawella", lat: 6.9472, lng: 80.2108 },
  { name: "Bambalapitiya", lat: 6.8867, lng: 79.8567 },
  { name: "Bandaragama", lat: 6.7167, lng: 79.9833 },
  { name: "Baseline Road", lat: 6.9067, lng: 79.8869 },
  { name: "Battaramulla", lat: 6.8994, lng: 79.9164 },
  { name: "Beruwala", lat: 6.4781, lng: 79.9833 },
  { name: "Biyagama", lat: 6.9753, lng: 80.0008 },
  { name: "Bloemendhal", lat: 6.96, lng: 79.8647 },
  { name: "Boralesgamuwa", lat: 6.8372, lng: 79.9111 },
  { name: "Borella", lat: 6.9113, lng: 79.8778 },
  { name: "Bulathsinhala", lat: 6.665, lng: 80.1825 },
  { name: "Cinnamon Gardens", lat: 6.9011, lng: 79.8601 },
  { name: "Colombo 02", lat: 6.9178, lng: 79.8464 },
  { name: "Colombo Fort", lat: 6.9344, lng: 79.8428 },
  { name: "Colombo Port", lat: 6.95, lng: 79.8378 },
  { name: "Dehiwala", lat: 6.8517, lng: 79.865 },
  { name: "Dematagoda", lat: 6.9261, lng: 79.88 },
  { name: "Divulapitiya", lat: 7.2278, lng: 80.06 },
  { name: "Dompe", lat: 7.065, lng: 80.0969 },
  { name: "Ekala", lat: 7.0761, lng: 79.9283 },
  { name: "Gampaha", lat: 7.0878, lng: 79.9992 },
  { name: "Ganemulla", lat: 7.0922, lng: 80.0225 },
  { name: "Gangodawila", lat: 6.8567, lng: 79.8994 },
  { name: "Gonawala", lat: 7.1539, lng: 79.9819 },
  { name: "Gothatuwa", lat: 6.9217, lng: 79.9856 },
  { name: "Grandpass", lat: 6.9425, lng: 79.8706 },
  { name: "Hanwella", lat: 6.9042, lng: 80.0842 },
  { name: "Havelock Town", lat: 6.8856, lng: 79.8642 },
  { name: "Heiyanthuduwa", lat: 6.9444, lng: 80.0431 },
  { name: "Hendala", lat: 6.9894, lng: 79.9019 },
  { name: "Hokandara", lat: 6.8494, lng: 79.9575 },
  { name: "Homagama", lat: 6.8444, lng: 80.0044 },
  { name: "Ingiriya", lat: 6.7344, lng: 80.1058 },
  { name: "Ja-Ela", lat: 7.0733, lng: 79.8917 },
  { name: "Kadawatha", lat: 7.0072, lng: 79.9508 },
  { name: "Kadawatha Junction", lat: 7.0028, lng: 79.9556 },
  { name: "Kaduwela", lat: 6.9358, lng: 79.9778 },
  { name: "Kahathuduwa", lat: 6.7981, lng: 80.0133 },
  { name: "Kalutara", lat: 6.5854, lng: 79.9608 },
  { name: "Kandana", lat: 7.0508, lng: 79.9058 },
  { name: "Katunayake", lat: 7.1697, lng: 79.8847 },
  { name: "Kelaniya", lat: 7.0017, lng: 79.9219 },
  { name: "Kerawalapitiya", lat: 6.9883, lng: 79.8658 },
  { name: "Kiribathgoda", lat: 6.9822, lng: 79.9486 },
  { name: "Kirindiwela", lat: 6.9928, lng: 80.0944 },
  { name: "Kirulapone", lat: 6.8742, lng: 79.8825 },
  { name: "Kollupitiya", lat: 6.8978, lng: 79.85 },
  { name: "Kosgama", lat: 6.8856, lng: 80.1681 },
  { name: "Koswatta", lat: 6.9194, lng: 79.9211 },
  { name: "Kotahena", lat: 6.9531, lng: 79.8597 },
  { name: "Kottawa", lat: 6.8244, lng: 79.9628 },
  { name: "Liyanagemulla", lat: 7.1378, lng: 79.8853 },
  { name: "Mahara", lat: 7.0547, lng: 80.0153 },
  { name: "Maharagama", lat: 6.8467, lng: 79.9283 },
  { name: "Malabe", lat: 6.9061, lng: 79.9519 },
  { name: "Maradana", lat: 6.92, lng: 79.8617 },
  { name: "Maththegoda", lat: 6.8103, lng: 80.0478 },
  { name: "Mattakkuliya", lat: 6.9703, lng: 79.8778 },
  { name: "Minuwangoda", lat: 7.1667, lng: 79.9506 },
  { name: "Mirigama", lat: 7.2453, lng: 80.1217 },
  { name: "Modara", lat: 6.9714, lng: 79.8681 },
  { name: "Moratuwa", lat: 6.7731, lng: 79.8817 },
  { name: "Mount Lavinia", lat: 6.8311, lng: 79.865 },
  { name: "Mulleriyawa", lat: 6.9317, lng: 79.9514 },
  { name: "Mutwal", lat: 6.9617, lng: 79.8522 },
  { name: "Narahenpita", lat: 6.8981, lng: 79.8742 },
  { name: "Negombo", lat: 7.2089, lng: 79.8353 },
  { name: "Nittambuwa", lat: 7.1497, lng: 80.18 },
  { name: "Nugegoda", lat: 6.8689, lng: 79.8889 },
  { name: "Orugodawatta", lat: 6.9486, lng: 79.8886 },
  { name: "Padukka", lat: 6.8361, lng: 80.0872 },
  { name: "Panadura", lat: 6.7136, lng: 79.9042 },
  { name: "Panadura South", lat: 6.695, lng: 79.905 },
  { name: "Pannala", lat: 7.2956, lng: 80.0394 },
  { name: "Pannipitiya", lat: 6.8308, lng: 79.9661 },
  { name: "Pasyala", lat: 7.0911, lng: 80.1394 },
  { name: "Pelawatte", lat: 6.8908, lng: 79.9311 },
  { name: "Peliyagoda", lat: 6.9711, lng: 79.8906 },
  { name: "Pepiliyana", lat: 6.8528, lng: 79.9183 },
  { name: "Pettah", lat: 6.9354, lng: 79.8517 },
  { name: "Piliyandala", lat: 6.8017, lng: 79.9247 },
  { name: "Pittugala", lat: 6.9133, lng: 79.9694 },
  { name: "Ragama", lat: 7.0261, lng: 79.9181 },
  { name: "Rajagiriya", lat: 6.9111, lng: 79.8989 },
  { name: "Ratmalana", lat: 6.82, lng: 79.8817 },
  { name: "Seeduwa", lat: 7.1175, lng: 79.8928 },
  { name: "Sri Jayawardenepura", lat: 6.8886, lng: 79.9203 },
  { name: "Thalawathugoda", lat: 6.8869, lng: 79.9331 },
  { name: "Thimbirigasyaya", lat: 6.8839, lng: 79.8778 },
  { name: "Udugampola", lat: 7.0717, lng: 80.0239 },
  { name: "Veyangoda", lat: 7.1522, lng: 80.1128 },
  { name: "Wattala", lat: 6.9939, lng: 79.8781 },
  { name: "Weboda", lat: 7.0364, lng: 79.9869 },
  { name: "Welisara", lat: 7.0097, lng: 79.8939 },
  { name: "Welisara North", lat: 7.02, lng: 79.89 },
  { name: "Wellawatte", lat: 6.875, lng: 79.8617 },
  { name: "Yakkala", lat: 7.1019, lng: 80.0767 },
];

// initial empty location
const emptyLocation = () => ({ name: '', lat: null, lng: null, resolved: false, searching: false, error: '', suggestions: [] });

function App() {
  // ---- Auth ----
  const [loggedInUser, setLoggedInUser] = useState(
    () => localStorage.getItem('logioptic_user') || null
  );

  const handleLogin = (username) => {
    localStorage.setItem('logioptic_user', username);
    setLoggedInUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('logioptic_user');
    setLoggedInUser(null);
  };

  // ---- Form state ----
  const [timeOfDay, setTimeOfDay]     = useState('morning_peak');
  const [dayType, setDayType]         = useState('weekday');
  const [numVehicles, setNumVehicles] = useState(1);

  const [locations, setLocations] = useState([emptyLocation(), emptyLocation()]);

  const [result, setResult]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [openDirections, setOpenDirections] = useState({});
  const toggleDirections = (vehicleId) => {
    setOpenDirections(prev => ({ ...prev, [vehicleId]: !prev[vehicleId] }));
  };

  // ---- Login gate ----
  if (!loggedInUser) return <LoginPage onLogin={handleLogin} />;

  // ---- update location name + filter local suggestions ----
  const updateName = (index, value) => {
    const query = value.trim().toLowerCase();
    const matches = query.length >= 2
      ? LOCATIONS.filter(loc => loc.name.toLowerCase().includes(query)).slice(0, 6)
      : [];

    const updated = [...locations];
    updated[index] = { ...updated[index], name: value, resolved: false, lat: null, lng: null, error: '', suggestions: matches };
    setLocations(updated);
  };

  // ---- select a suggestion ----
  const selectSuggestion = (index, suggestion) => {
    const updated = [...locations];
    updated[index] = {
      ...updated[index],
      name: suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
      resolved: true,
      searching: false,
      error: '',
      suggestions: [],
    };
    setLocations(updated);
  };

  // ---- dismiss suggestions for a location ----
  const dismissSuggestions = (index) => {
    setTimeout(() => {
      setLocations(prev => {
        const next = [...prev];
        next[index] = { ...next[index], suggestions: [] };
        return next;
      });
    }, 150);
  };

  // ---- geocode a single location ----
  const searchLocation = async (index) => {
    const name = locations[index].name.trim();
    if (!name) return;

    const updated = [...locations];
    updated[index] = { ...updated[index], searching: true, error: '', resolved: false };
    setLocations(updated);

    const coords = await geocodeLocation(name);

    const after = [...locations];
    if (coords) {
      after[index] = {
        ...after[index],
        lat: coords.lat,
        lng: coords.lng,
        resolved: true,
        searching: false,
        error: '',
      };
    } else {
      after[index] = {
        ...after[index],
        resolved: false,
        searching: false,
        error: 'Location not found. Try a more specific name.',
      };
    }
    setLocations(after);
  };

  const addLocation = () => setLocations([...locations, emptyLocation()]);

  const removeLocation = (index) => {
    if (locations.length <= 2) return;
    setLocations(locations.filter((_, i) => i !== index));
  };

  // ---- optimize ----
  const handleOptimize = async () => {
    setError('');
    setResult(null);

    for (let i = 0; i < locations.length; i++) {
      if (!locations[i].resolved) {
        setError(`Please search and confirm location ${i + 1} before optimizing.`);
        return;
      }
    }

    const payload = {
      locations: locations.map((loc, idx) => ({
        id:   idx,
        name: loc.name,
        lat:  loc.lat,
        lng:  loc.lng,
      })),
      time_of_day:  timeOfDay,
      day_type:     dayType,
      num_vehicles: parseInt(numVehicles),
      depot_index:  0,
    };

    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/optimize', payload);
      setResult(response.data);

      // auto-save to database
      try {
        await axios.post('http://127.0.0.1:8000/api/routes/save', {
          username:    loggedInUser,
          time_of_day: timeOfDay,
          day_type:    dayType,
          num_vehicles: parseInt(numVehicles),
          result:      response.data
        });
      } catch (_) {
        // save failure is non-fatal
      }
    } catch (err) {
      if (err.response) {
        setError(`API error: ${err.response.data.detail || err.response.statusText}`);
      } else {
        setError('Could not connect to backend. Make sure the FastAPI server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">

      {/* ---- HEADER ---- */}
      <header className="app-header">
        <div className="header-brand">
          <h1>LogiOptic</h1>
          <p>AI-Powered Route Optimization</p>
        </div>
        <div className="header-user">
          <span>Logged in as <strong>{loggedInUser}</strong></span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="main-layout">

        {/* ---- LEFT PANEL: FORM ---- */}
        <div className="panel form-panel">
          <h2>Delivery Locations</h2>
          <p className="hint">First location is the depot. Type a place name and click Find.</p>

          <CSVUpload onLocationsLoaded={setLocations} geocode={geocodeLocation} />

          {locations.map((loc, idx) => (
            <div key={idx} className={`location-card ${loc.resolved ? 'resolved' : ''}`}>
              <div className="location-card-header">
                <span className="location-label">
                  {idx === 0 ? 'Depot' : `Stop ${idx}`}
                </span>
                {idx >= 2 && (
                  <button className="btn-remove" onClick={() => removeLocation(idx)}>Remove</button>
                )}
              </div>

              <div className="search-row">
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    placeholder="e.g. Colombo Fort, Nugegoda"
                    value={loc.name}
                    onChange={(e) => updateName(idx, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation(idx)}
                    onBlur={() => dismissSuggestions(idx)}
                    autoComplete="off"
                  />
                  {loc.suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      {loc.suggestions.map((s, i) => (
                        <li key={i} onMouseDown={() => selectSuggestion(idx, s)}>
                          <span className="suggestion-name">{s.name}</span>
                          <span className="suggestion-label">{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  className="btn-find"
                  onClick={() => searchLocation(idx)}
                  disabled={loc.searching || !loc.name.trim()}
                >
                  {loc.searching ? '...' : 'Find'}
                </button>
              </div>

              {loc.resolved && (
                <div className="resolved-badge">
                  Found: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </div>
              )}
              {loc.error && (
                <div className="location-error">{loc.error}</div>
              )}
            </div>
          ))}

          <button className="btn-add" onClick={addLocation}>+ Add Location</button>

          <div className="settings-row">
            <div className="setting-group">
              <label>Time of Day</label>
              <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}>
                {TIME_OPTIONS.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label>Day Type</label>
              <select value={dayType} onChange={(e) => setDayType(e.target.value)}>
                {DAY_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="setting-group">
              <label>Vehicles</label>
              <input
                type="number"
                min="1"
                max="5"
                value={numVehicles}
                onChange={(e) => setNumVehicles(e.target.value)}
              />
            </div>
          </div>

          <button className="btn-optimize" onClick={handleOptimize} disabled={loading}>
            {loading ? 'Optimizing...' : 'Optimize Route'}
          </button>

          {error && <div className="error-box">{error}</div>}
        </div>

        {/* ---- RIGHT PANEL: MAP + RESULTS + ANALYTICS ---- */}
        <div className="panel results-panel">

          <MapView locations={locations} result={result} />

          {result && (
            <div className="results-section">
              <h2>Optimized Route</h2>
              <p className="summary">
                Total travel time: <strong>{formatTime(result.total_time_minutes)}</strong>
                &nbsp;|&nbsp; Total road distance: <strong>{result.total_distance_km} km</strong>
                &nbsp;|&nbsp; Stops: <strong>{result.num_stops}</strong>
              </p>

              {result.routes.map((route) => (
                <div key={route.vehicle_id} className="route-card">
                  <h3>Vehicle {route.vehicle_id}</h3>
                  <table className="stops-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Location</th>
                        <th>ETA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.stops.map((stop, i) => (
                        <tr key={i}>
                          <td>{i === 0 ? 'Start' : i === route.stops.length - 1 ? 'Return' : i}</td>
                          <td>{stop.name}</td>
                          <td>{formatTime(stop.eta_minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="route-total">
                    Distance: <strong>{route.distance_km} km</strong>
                    &nbsp;|&nbsp; Time: <strong>{formatTime(route.total_time_minutes)}</strong>
                  </p>

                  {route.steps && route.steps.length > 0 && (
                    <div className="directions-panel">
                      <button
                        className="btn-directions-toggle"
                        onClick={() => toggleDirections(route.vehicle_id)}
                      >
                        Turn-by-Turn Directions
                        <span className="toggle-arrow">
                          {openDirections[route.vehicle_id] ? ' ▲' : ' ▼'}
                        </span>
                      </button>
                      {openDirections[route.vehicle_id] && (
                        <ol className="directions-list">
                          {route.steps.map((step, i) => (
                            <li key={i}>
                              <span className="step-instruction">{step.instruction}</span>
                              <span className="step-distance">
                                {step.distance_m >= 1000
                                  ? `${(step.distance_m / 1000).toFixed(1)} km`
                                  : `${step.distance_m} m`}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <AnalyticsPanel result={result} />
            </div>
          )}

          {!result && !loading && (
            <div className="placeholder">
              <p>Enter delivery locations and click <strong>Optimize Route</strong> to see results.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
