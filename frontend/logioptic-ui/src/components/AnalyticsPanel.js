import React from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function formatTime(minutes) {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`;
}

function AnalyticsPanel({ result }) {
  if (!result) return null;

  const { total_distance_km, total_time_minutes, num_stops, routes } = result;
  const avgTimePerStop = num_stops > 0 ? (total_time_minutes / num_stops).toFixed(1) : '—';

  // Line chart: ETA progression for vehicle 0
  const firstRoute = routes && routes[0];
  const etaData = firstRoute
    ? firstRoute.stops.map((stop, i) => {
        const isReturn = i === firstRoute.stops.length - 1;
        const label = isReturn
          ? 'Return'
          : stop.name.length > 10 ? stop.name.slice(0, 10) + '…' : stop.name;
        return { name: label, eta: stop.eta_minutes };
      })
    : [];

  // Bar chart: per-vehicle comparison (only when > 1 vehicle)
  const vehicleData = routes
    ? routes.map((r, i) => ({
        vehicle: `V${i + 1}`,
        distance_km: r.distance_km,
        time_min: r.total_time_minutes,
      }))
    : [];

  return (
    <div className="analytics-panel">
      <h2>Analytics</h2>

      {/* Metric cards */}
      <div className="metric-cards">
        <div className="metric-card metric-blue">
          <div className="metric-label">Total Distance</div>
          <div className="metric-value">{total_distance_km} <span className="metric-unit">km</span></div>
        </div>
        <div className="metric-card metric-teal">
          <div className="metric-label">Total Time</div>
          <div className="metric-value">{formatTime(total_time_minutes)}</div>
        </div>
        <div className="metric-card metric-green">
          <div className="metric-label">Total Stops</div>
          <div className="metric-value">{num_stops}</div>
        </div>
        <div className="metric-card metric-amber">
          <div className="metric-label">Avg Time / Stop</div>
          <div className="metric-value">{formatTime(avgTimePerStop)}</div>
        </div>
      </div>

      {/* Line chart — ETA progression */}
      {etaData.length > 1 && (
        <div className="chart-block">
          <h3>Stop ETA Progression — Vehicle 1</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={etaData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis unit=" min" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [formatTime(v), 'ETA']} />
              <Line type="monotone" dataKey="eta" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bar chart — per-vehicle (only if > 1 vehicle) */}
      {vehicleData.length > 1 && (
        <div className="chart-block">
          <h3>Per-Vehicle Comparison</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vehicleData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="vehicle" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="distance_km" name="Distance (km)" fill="#2563eb" />
              <Bar dataKey="time_min" name="Time (min)" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPanel;
