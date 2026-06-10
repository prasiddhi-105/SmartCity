import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Explorer from '../components/Explorer';
import { useTigerGraph } from '../hooks/useTigerGraph';
import { postSOS, fetchSafeZones, fetchSosContacts, submitAndAnalyzeReport } from '../api/smartcity';
import SafeRoutePanel from '../components/SafeRoutePanel';
import ModeSlider from '../components/ModeSlider';
import OrayaLogo from '../components/OrayaLogo';

const INCIDENT_TYPES = [
  'poor_lighting', 'broken_cctv', 'felt_followed', 'suspicious_activity',
  'harassment', 'unsafe_road', 'missing_person', 'other'
];

export default function PublicCitizenPortal() {
  const navigate = useNavigate();
  const { intersections, incidents, selectedIntersection } = useTigerGraph();

  const [sosStatus, setSosStatus] = useState('IDLE');
  const [safeZones, setSafeZones] = useState([]);
  const [contacts, setContacts] = useState(null);
  const [tab, setTab] = useState('sos'); // 'sos' | 'route' | 'report'
  const [userPos, setUserPos] = useState(null);

  // Dual route state — set by SafeRoutePanel callback
  const [safestGeo, setSafestGeo] = useState(null);
  const [fastestGeo, setFastestGeo] = useState(null);
  const [balancedGeo, setBalancedGeo] = useState(null);

  // Report form state
  const [reportText, setReportText] = useState('');
  const [reportType, setReportType] = useState('suspicious_activity');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    fetchSafeZones().then(r => setSafeZones(Array.isArray(r) ? r : [])).catch(() => {});
    fetchSosContacts().then(r => setContacts(r)).catch(() => {});
    // Try get GPS for map centering
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  const handleSOS = async () => {
    setSosStatus('SENDING');
    try {
      let lat = 30.7333, lng = 76.7794; // Chandigarh fallback
      if (userPos) { lat = userPos.lat; lng = userPos.lng; }
      await postSOS(lat, lng, 'EMERGENCY SOS via Public Portal');
      setSosStatus('SENT');
      setTimeout(() => setSosStatus('IDLE'), 6000);
    } catch {
      setSosStatus('ERROR');
      setTimeout(() => setSosStatus('IDLE'), 3000);
    }
  };

  const handleReport = async () => {
    if (!reportText.trim()) { setReportError('Please describe the incident'); return; }
    setReportSubmitting(true);
    setReportError(null);
    setReportResult(null);
    try {
      let lat = 30.7333, lng = 76.7794; // Chandigarh fallback
      if (userPos) { lat = userPos.lat; lng = userPos.lng; }
      const res = await submitAndAnalyzeReport({
        text: reportText,
        incident_type: reportType,
        lat, lng,
        source: 'citizen_portal',
      });
      setReportResult(res);
      setReportText('');
    } catch (e) {
      setReportError(e.message || 'Submission failed');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleRouteComputed = useCallback((data, src) => {
    setSafestGeo(data?.safest_route?.route_geojson || null);
    setFastestGeo(data?.fastest_route?.route_geojson || data?.shortest_route?.route_geojson || null);
    setBalancedGeo(data?.balanced_route?.route_geojson || null);
    if (src) setUserPos(src);
  }, []);

  const sosS = { IDLE: ['#ff3344', '🚨 ACTIVATE SOS', ''], SENDING: ['#b91c1c', '📡 BROADCASTING...', ''], SENT: ['var(--accent)', '✔ HELP EN ROUTE', ''], ERROR: ['var(--amber)', '⚠ RETRY', ''] }[sosStatus];

  const panelStyle = { flex: 1, overflowY: 'auto', padding: '0 0.25rem' };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--accent)', background: 'var(--bg-panel)', flexShrink: 0 }}>
        <OrayaLogo
          variant="full"
          status="active"
          subtitle={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>SAFETY PORTAL</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--accent)', background: 'rgba(0,255,136,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>PUBLIC ACCESS</span>
            </div>
          }
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '150px' }}><ModeSlider /></div>
          <button onClick={() => navigate('/')} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '0.4rem 1rem', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer' }}>
            EXIT
          </button>
        </div>
      </header>

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            gap: '0',
            overflowX: 'auto'
          }}>

        {/* Left panel */}
<div style={{
  width: '100%',
  maxWidth: '100%',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid var(--border)',
  background: 'var(--bg-panel)'
}}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[['sos', '🚨 SOS'], ['route', '🗺 ROUTE'], ['report', '📋 REPORT']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: '10px 0', fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                  letterSpacing: '0.08em', cursor: 'pointer',
                  background: tab === key ? 'rgba(0,255,136,0.08)' : 'transparent',
                  border: 'none', borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
                  color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

            {/* ── SOS TAB ── */}
            {tab === 'sos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', border: '2px solid var(--red-alert)', background: 'rgba(255,51,68,0.08)', textAlign: 'center', borderRadius: '4px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--red-alert)', margin: '0 0 0.75rem', fontSize: '1rem', letterSpacing: '0.2em' }}>EMERGENCY OVERRIDE</h2>
                  <button
                    onClick={handleSOS}
                    disabled={sosStatus === 'SENDING'}
                    style={{
                      width: '100%', padding: '16px 0', background: sosS[0], color: '#fff',
                      fontFamily: 'var(--font-display)', fontSize: '1rem', border: 'none', borderRadius: '4px',
                      cursor: sosStatus === 'SENDING' ? 'wait' : 'pointer',
                      boxShadow: sosStatus === 'IDLE' ? '0 0 20px rgba(255,51,68,0.4)' : 'none',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {sosS[1]}
                  </button>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                    Instantly broadcasts your GPS location to rapid response units.
                  </p>
                </div>

                {contacts && (
                  <div style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '4px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '0.6rem', letterSpacing: '0.15em' }}>EMERGENCY CONTACTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Emergency</span>
                        <a href={`tel:${contacts.emergency}`} style={{ color: 'var(--red-alert)', fontWeight: 'bold' }}>{contacts.emergency}</a>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Women Helpline</span>
                        <a href={`tel:${contacts.women_helpline}`} style={{ color: 'var(--red-alert)', fontWeight: 'bold' }}>{contacts.women_helpline}</a>
                      </div>
                      {contacts.nearest_police_box && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Nearest Police</div>
                          <div style={{ color: 'var(--accent)', marginTop: '2px' }}>{contacts.nearest_police_box.name}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{contacts.nearest_police_box.distance_m}m away</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Safe zones list */}
                {safeZones.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>NEARBY SAFE ZONES</div>
                    {safeZones.map((z, i) => (
                      <div key={i} style={{ padding: '8px', border: '1px solid var(--border)', marginBottom: '4px', borderRadius: '3px', background: 'rgba(0,0,0,0.2)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--accent)' }}>{z.name}</span>
                        <span style={{ float: 'right', color: z.is_open_now ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.62rem' }}>
                          {z.is_open_now ? '✅ OPEN' : '❌ CLOSED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ROUTE TAB ── */}
            {tab === 'route' && (
              <SafeRoutePanel onRouteComputed={handleRouteComputed} />
            )}

            {/* ── REPORT TAB ── */}
            {tab === 'report' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.2em', marginBottom: '0.25rem' }}>SUBMIT INCIDENT REPORT</div>

                <div>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: '4px' }}>INCIDENT TYPE</div>
                  <select
                    value={reportType}
                    onChange={e => setReportType(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}
                  >
                    {INCIDENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', letterSpacing: '0.15em', marginBottom: '4px' }}>DESCRIBE THE INCIDENT</div>
                  <textarea
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    placeholder="Describe what happened, when, and any relevant details..."
                    rows={5}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  onClick={handleReport}
                  disabled={reportSubmitting}
                  style={{
                    padding: '10px', background: 'rgba(0,255,136,0.1)', border: '1px solid var(--accent)', borderLeft: '3px solid var(--accent)',
                    color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: '0.72rem', letterSpacing: '0.18em',
                    cursor: reportSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  {reportSubmitting ? '⏳ ANALYZING & SUBMITTING...' : '→ SUBMIT REPORT'}
                </button>

                {reportError && (
                  <div style={{ padding: '8px', background: 'rgba(255,51,68,0.07)', border: '1px solid var(--red-alert)', color: 'var(--red-alert)', fontSize: '0.65rem' }}>✕ {reportError}</div>
                )}

                {reportResult && (
                  <div style={{ padding: '10px', background: 'rgba(0,255,136,0.06)', border: '1px solid var(--accent)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '6px' }}>✔ REPORT SUBMITTED</div>
                    <div style={{ color: 'var(--text-secondary)' }}>ID: <span style={{ color: 'var(--text-primary)' }}>{reportResult.report_id}</span></div>
                    {reportResult.severity_label && <div style={{ color: 'var(--text-secondary)' }}>Severity: <span style={{ color: 'var(--amber)' }}>{reportResult.severity_label?.toUpperCase()}</span></div>}
                    {reportResult.emergency_level && <div style={{ color: 'var(--text-secondary)' }}>Emergency Level: <span style={{ color: 'var(--red-alert)' }}>{reportResult.emergency_level?.toUpperCase()}</span></div>}
                    {reportResult.emotion && <div style={{ color: 'var(--text-secondary)' }}>Emotion detected: <span style={{ color: 'var(--text-primary)' }}>{reportResult.emotion}</span></div>}
                    {reportResult.key_phrases?.length > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '3px' }}>Key phrases:</div>
                        <div style={{ color: 'var(--accent)' }}>{reportResult.key_phrases.slice(0, 3).join(' · ')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Explorer
            intersections={intersections}
            incidents={incidents}
            safestRouteGeoJSON={safestGeo}
            shortestRouteGeoJSON={fastestGeo}
            balancedRouteGeoJSON={balancedGeo}
            safeZones={safeZones}
            selectedIntersection={selectedIntersection}
            userPosition={userPos}
          />
        </div>
      </div>
    </div>
  );
}
