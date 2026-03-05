import React, { useState, useRef } from 'react';

function CSVUpload({ onLocationsLoaded, geocode }) {
  const [progress, setProgress] = useState('');
  const [rowErrors, setRowErrors] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProgress('');
    setRowErrors([]);

    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // expect header row "name"
    if (lines.length < 2 || lines[0].toLowerCase() !== 'name') {
      setProgress('');
      setRowErrors(['CSV must have a header row containing "name" and at least one data row.']);
      inputRef.current.value = '';
      return;
    }

    const names = lines.slice(1).filter(Boolean);
    const resolved = [];
    const errors = [];

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      setProgress(`Geocoding ${i + 1} / ${names.length}: ${name}...`);
      const coords = await geocode(name);
      if (coords) {
        resolved.push({ name, lat: coords.lat, lng: coords.lng, resolved: true, searching: false, error: '' });
      } else {
        errors.push(`Row ${i + 2}: "${name}" — location not found`);
        resolved.push({ name, lat: null, lng: null, resolved: false, searching: false, error: 'Location not found' });
      }
    }

    setProgress(`Done — ${resolved.filter(r => r.resolved).length} of ${names.length} geocoded.`);
    setRowErrors(errors);
    onLocationsLoaded(resolved);
    inputRef.current.value = '';
  };

  return (
    <div className="csv-upload">
      <div className="csv-header">
        <label className="btn-csv" htmlFor="csv-input">
          Upload CSV
        </label>
        <input
          id="csv-input"
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        <button
          type="button"
          className="btn-hint-toggle"
          onClick={() => setShowHint(h => !h)}
          title="Show expected CSV format"
        >
          ?
        </button>
      </div>

      {showHint && (
        <div className="csv-hint">
          <strong>Expected format:</strong>
          <pre>{`name\nColombo Fort\nNugegoda\nDehiwala`}</pre>
          <p>First location becomes the depot.</p>
        </div>
      )}

      {progress && <p className="csv-progress">{progress}</p>}

      {rowErrors.length > 0 && (
        <ul className="csv-errors">
          {rowErrors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}

export default CSVUpload;
