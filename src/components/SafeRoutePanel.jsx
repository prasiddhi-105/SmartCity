import React, { useState, useCallback } from 'react';
import { fetchDualRoute } from '../api/smartcity';

const S = {
  input: {
    input: {
  width: '100%',
  minWidth: 0,
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '7px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  boxSizing: 'border-box',
  outline: 'none',
},
  },
  label: { fontSize: '0.56rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: '3px' },
  stat: {
    padding: '0.45rem 0.6rem', border: '1px solid var(--border)',
    background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '2px',
  },
};

// Nominatim geocode — search within India
async function geocodeAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Chandigarh, India')}&limit=1`;
  const r = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'OrayaOS/1.0' } });
  const results = await r.json();
  if (!results.length) {
    // Retry without city prefix
    const r2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', India')}&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'OrayaOS/1.0' } });
    const results2 = await r2.json();
    if (!results2.length) throw new Error(`Location not found: "${query}"`);
    return { lat: parseFloat(results2[0].lat), lng: parseFloat(results2[0].lon), name: results2[0].display_name };
  }
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), name: results[0].display_name };
}

const ROUTES_META = [
  { key: 'safest_route',   label: 'SAFEST',   color: '#00ff88', dash: 'none' },
  { key: 'fastest_route',  label: 'FASTEST',  color: '#3b82f6', dash: '8,5' },
  { key: 'balanced_route', label: 'BALANCED', color: '#f59e0b', dash: '12,4,3,4' },
];

export default function SafeRoutePanel({ onRouteComputed }) {
  const [destQuery, setDestQuery]   = useState('');
  const [srcQuery, setSrcQuery]     = useState('');
  const [useGPS, setUseGPS]         = useState(true);
  const [loading, setLoading]       = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError]           = useState(null);
  const [result, setResult]         = useState(null);
  const [gpsCoords, setGpsCoords]   = useState(null);
  const [gpsName, setGpsName]       = useState(null);

  const getGPS = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(c);
        setGpsName(`${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
        setGpsLoading(false);
        resolve(c);
      },
      () => { setGpsLoading(false); reject(new Error('GPS denied — allow location or uncheck Use My Location')); },
      { timeout: 8000 }
    );
  }), []);

  const handleCompute = async () => {
    setError(null); setResult(null); setLoading(true);
    try {
      let src;
      if (useGPS) {
        src = gpsCoords || await getGPS();
      } else {
        if (!srcQuery.trim()) { setError('Enter a start location'); setLoading(false); return; }
        src = await geocodeAddress(srcQuery);
      }
      if (!destQuery.trim()) { setError('Enter a destination'); setLoading(false); return; }
      const dest = await geocodeAddress(destQuery);
      const data = await fetchDualRoute(src.lat, src.lng, dest.lat, dest.lng);

      if (!data || typeof data !== 'object') throw new Error('Invalid response from route service');
      setResult({ ...data, srcName: useGPS ? gpsName : srcQuery, destName: dest.name || destQuery });

      if (onRouteComputed) {
        onRouteComputed(data, src, dest);
      }
    } catch (e) {
      setError(e.message || 'Route computation failed');
    } finally {
      setLoading(false);
    }
  };

  const RouteCard = ({ routeKey, meta, data }) => {
    const r = data?.[routeKey];
    if (!r) return null;
    const danger = r.danger_score ?? r.overall_danger_score ?? 0;
    const eta = r.estimated_time_min ?? r.estimated_time_minutes ?? '—';
    const dist = r.distance_m;
    return (
      <div style={{ border: `1px solid ${meta.color}44`, borderLeft: `3px solid ${meta.color}`, padding: '0.6rem', background: `${meta.color}08`, marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {/* Dash preview */}
          <svg width="28" height="6">
            <line x1="0" y1="3" x2="28" y2="3" stroke={meta.color} strokeWidth="3"
              strokeDasharray={meta.dash === 'none' ? undefined : meta.dash} />
          </svg>
          <span style={{ fontSize: '0.62rem', color: meta.color, letterSpacing: '0.15em', fontFamily: 'var(--font-mono)' }}>
            ◎ {meta.label} ROUTE
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
          <div style={S.stat}>
            <span style={{ fontSize: '0.52rem', color: 'var(--text-secondary)' }}>DISTANCE</span>
            <span style={{ color: meta.color, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              {dist ? (dist >= 1000 ? `${(dist/1000).toFixed(1)}km` : `${Math.round(dist)}m`) : '—'}
            </span>
          </div>
          <div style={S.stat}>
            <span style={{ fontSize: '0.52rem', color: 'var(--text-secondary)' }}>ETA</span>
            <span style={{ color: meta.color, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{eta} min</span>
          </div>
          <div style={S.stat}>
            <span style={{ fontSize: '0.52rem', color: 'var(--text-secondary)' }}>DANGER</span>
            <span style={{ color: danger > 0.6 ? '#ff3344' : danger > 0.35 ? '#ffaa00' : meta.color, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              {(danger * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        {r.recommendation && (
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
            {r.recommendation}
          </div>
        )}
      </div>
    );
  };

  return (
<div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontFamily: 'var(--font-mono)', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>      {/* Source */}
      <div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '5px' }}>
          <span style={S.label}>START POINT</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', fontSize: '0.58rem', color: 'var(--accent)', cursor: 'pointer' }}>
            <input type="checkbox" checked={useGPS} onChange={e => setUseGPS(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            USE MY LOCATION
          </label>
        </div>
        {useGPS ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ ...S.input, flex: 1, display: 'flex', alignItems: 'center', color: gpsName ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {gpsLoading ? '📡 Acquiring GPS...' : gpsName ? `📍 ${gpsName}` : '📍 Press GET →'}
            </div>
            <button onClick={getGPS} disabled={gpsLoading}
              style={{ border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', padding: '6px 10px', fontSize: '0.65rem', cursor: 'pointer' }}>
              {gpsLoading ? '...' : 'GET'}
            </button>
          </div>
        ) : (
          <input style={S.input} value={srcQuery} onChange={e => setSrcQuery(e.target.value)} placeholder="e.g. Sector 17 Plaza, Chandigarh" />
        )}
      </div>

      {/* Destination */}
      <div>
        <div style={S.label}>DESTINATION</div>
        <input style={S.input} value={destQuery} onChange={e => setDestQuery(e.target.value)}
          placeholder="e.g. Sector 43 ISBT, Chandigarh"
          onKeyDown={e => e.key === 'Enter' && handleCompute()} />
      </div>

      {/* Compute */}
      <button onClick={handleCompute} disabled={loading}
        style={{
          width: '100%', padding: '9px', background: loading ? 'rgba(0,255,136,0.05)' : 'rgba(0,255,136,0.12)',
          border: '1px solid var(--accent)', borderLeft: '3px solid var(--accent)',
          color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '0.7rem',
          letterSpacing: '0.15em', cursor: loading ? 'wait' : 'pointer',
        }}>
        {loading ? '⏳ COMPUTING ROUTES...' : '→ COMPUTE SAFEST · FASTEST · BALANCED'}
      </button>

      {error && (
        <div style={{ padding: '8px', background: 'rgba(255,51,68,0.07)', border: '1px solid var(--red-alert)', color: 'var(--red-alert)', fontSize: '0.65rem' }}>✕ {error}</div>
      )}

      {/* Legend */}
      {result && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', fontSize: '0.6rem' }}>
            {ROUTES_META.map(m => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="22" height="5">
                  <line x1="0" y1="2.5" x2="22" y2="2.5" stroke={m.color} strokeWidth="3" strokeDasharray={m.dash === 'none' ? undefined : m.dash} />
                </svg>
                <span style={{ color: m.color }}>{m.label}</span>
              </div>
            ))}
          </div>

          {ROUTES_META.map(m => (
            <RouteCard key={m.key} routeKey={m.key} meta={m} data={result} />
          ))}

          {/* Cross-comparison */}
          {result.comparison && (
            <div style={{ padding: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
              🛡 Danger: Safest <span style={{ color: '#00ff88' }}>{((result.comparison.safest_danger || 0) * 100).toFixed(0)}%</span>
              {' · '}Balanced <span style={{ color: '#f59e0b' }}>{((result.comparison.balanced_danger || 0) * 100).toFixed(0)}%</span>
              {' · '}Fastest <span style={{ color: '#3b82f6' }}>{((result.comparison.fastest_danger || 0) * 100).toFixed(0)}%</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
