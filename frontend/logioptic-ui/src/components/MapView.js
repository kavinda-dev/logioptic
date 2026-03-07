import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// react-leaflet v4 strips Leaflet's default icon paths at build time; restore them manually
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

const depotIcon = new L.Icon({
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
});

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

function MapView({ locations, result }) {

  const inputPoints = locations
    .map(loc => {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng);
      return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null;
    })
    .filter(Boolean);

  // prefer OSRM road geometry for auto-fit; fall back to raw input coordinates
  const routeLines = result
    ? result.routes.map(route => route.geometry || [])
    : [];

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

        <FitBounds points={
          (result && result.routes[0]?.geometry?.length > 0)
            ? result.routes[0].geometry
            : inputPoints
        } />

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
