import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// FIX: default marker icons broken in react-leaflet
// ============================================================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

// custom depot icon (blue) and stop icon (red)
const depotIcon = new L.Icon({
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
});

// ============================================================
// AUTO-FIT: re-centres the map when markers change
// ============================================================
function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const valid = points.filter(p => p && !isNaN(p[0]) && !isNaN(p[1]));
    if (valid.length === 0) return;

    if (valid.length === 1) {
      map.setView(valid[0], 13);
    } else {
      map.fitBounds(valid, { padding: [40, 40] });
    }
  }, [points, map]);

  return null;
}

// ============================================================
// MAIN MAP COMPONENT
// ============================================================
function MapView({ locations, result }) {

  // collect all valid lat/lng from the input form
  const inputPoints = locations
    .map(loc => {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng);
      return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null;
    })
    .filter(Boolean);

  // use real road geometry from OSRM Route API (falls back to empty if unavailable)
  const routeLines = result
    ? result.routes.map(route => route.geometry || [])
    : [];

  // colours for multiple vehicles
  const lineColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

  return (
    <div className="map-wrapper">
      <MapContainer
        center={[6.9271, 79.8612]}   // Colombo default centre
        zoom={12}
        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* auto-fit to road geometry when available, else fall back to input markers */}
        <FitBounds points={
          (result && result.routes[0]?.geometry?.length > 0)
            ? result.routes[0].geometry
            : inputPoints
        } />

        {/* place a marker for each location entered in the form */}
        {locations.map((loc, idx) => {
          const lat = parseFloat(loc.lat);
          const lng = parseFloat(loc.lng);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <Marker key={idx} position={[lat, lng]} icon={depotIcon}>
              <Popup>
                <strong>{loc.name || `Location ${idx + 1}`}</strong>
                <br />
                {idx === 0 ? 'Depot (Start)' : `Stop ${idx}`}
              </Popup>
            </Marker>
          );
        })}

        {/* draw optimized route lines after solving */}
        {routeLines.map((line, idx) => (
          <Polyline
            key={idx}
            positions={line}
            color={lineColors[idx % lineColors.length]}
            weight={4}
            opacity={0.8}
          />
        ))}

      </MapContainer>
    </div>
  );
}

export default MapView;
