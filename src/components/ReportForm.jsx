import React, { useState, useEffect, useRef } from 'react';
import { submitAndAnalyzeReport } from '../api/smartcity';

const VALID_TYPES = [
  { value: 'poor_lighting',       label: 'POOR LIGHTING' },
  { value: 'felt_followed',       label: 'FELT FOLLOWED' },
  { value: 'broken_cctv',         label: 'BROKEN CCTV' },
  { value: 'suspicious_activity', label: 'SUSPICIOUS ACTIVITY' },
];

export default function ReportForm() {
  const [form, setForm] = useState({
    lat: '',
    lng: '',
    incident_type: 'poor_lighting',
    severity: 3,
    description: '',
  });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [incidentId, setIncidentId] = useState('');
  const [nlpData, setNlpData] = useState(null);

  // Refs to keep track of the active timeouts across re-renders
  const successTimeoutRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Cleanup active timeouts when the component unmounts
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    // Clear any pending timers if a new submission happens
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

    try {
      const res = await submitAndAnalyzeReport({
        text: form.description || `${form.incident_type} incident reported at [${form.lat}, ${form.lng}]`,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        incident_type: form.incident_type,
        source: 'dispatch_console',
      });

      setIncidentId(res.report_id || 'RPT_' + Date.now());
      setNlpData(res);
      setStatus('success');

      // Store the success timeout ID in the ref
      successTimeoutRef.current = setTimeout(() => {
        setStatus(null);
        setForm({ lat: '', lng: '', incident_type: 'poor_lighting', severity: 3, description: '' });
        setIncidentId('');
        setNlpData(null);
      }, 8000);
    } catch (err) {
      setErrorMsg(typeof err === 'object' && err !== null && err.message ? err.message : 'DISPATCH FAILED');
      setStatus('error');
      
      // Store the error timeout ID in the ref
      errorTimeoutRef.current = setTimeout(() => {
        setStatus(null);
      }, 4000);
    }
  };

  const SevBtn = ({ v }) => (
    <button
      type="button"
      onClick={() => set('severity', v)}
      style={{
        flex: 1,
        padding: '0.4rem',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
        background: form.severity === v
          ? (v >= 5 ? 'var(--red-alert)' : v >= 3 ? 'var(--amber)' : 'var(--accent)')
          : 'rgba(255,255,255,0.04)',
        border: `1px solid ${form.severity === v
          ? (v >= 5 ? 'var(--red-alert)' : v >= 3 ? 'var(--amber)' : 'var(--accent)')
          : 'var(--border)'}`,
        color: form.severity === v ? '#030d18' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        fontWeight: form.severity === v ? 700 : 400,
      }}
    >
      {v}
    </button>
  );

  return (
    <div className="panel panel-cut" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="label-xs" style={{ color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="blink-slow" style={{ color: 'var(--red-alert)' }}>✦</span>
        INCIDENT DISPATCH CONSOLE
      </div>

      {/* Overlay states */}
      {status === 'success' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(3,13,24,0.97)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', padding: '1.25rem',
        }}
          className="fade-in"
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--accent)', letterSpacing: '0.2em' }}>
            DISPATCH CONFIRMED
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            {incidentId}
          </div>
          <div className="led led-green pulse-green" style={{ width: 12, height: 12, marginBottom: 4 }} />

          {nlpData && (() => {
            const level = nlpData.emergency_level || 'NORMAL';
            const levelColor = level === 'CRITICAL' ? 'var(--red-alert)'
              : level === 'HIGH' ? '#ff6600'
              : level === 'MEDIUM' ? 'var(--amber)'
              : level === 'LOW' ? 'var(--accent)'
              : 'var(--text-secondary)';
            const sev = Math.min(5, Math.max(1, nlpData.severity || 1));
            const sevPct = ((sev - 1) / 4) * 100;
            const distress = nlpData.distress_level || 'LOW';
            const keywords = (nlpData.matched_keywords || []).slice(0, 6);

            return (
              <div style={{
                background: 'rgba(0,255,136,0.04)',
                border: '1px solid var(--border)',
                padding: '0.9rem',
                width: '90%',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <div className="label-xs" style={{ color: 'var(--accent)', marginBottom: 2 }}>NLP ANALYSIS COMPLETE</div>

                {/* Emergency level badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>EMERGENCY LEVEL</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem', padding: '2px 8px',
                    border: `1px solid ${levelColor}`, color: levelColor,
                    background: `${levelColor}18`, letterSpacing: '0.1em',
                  }}>
                    {level}
                  </span>
                </div>

                {/* Severity bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>SEVERITY</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: levelColor }}>{sev.toFixed(1)} / 5.0</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                    <div style={{
                      height: 3, width: `${sevPct}%`, borderRadius: 2,
                      background: levelColor,
                      boxShadow: `0 0 6px ${levelColor}`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Distress */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>DISTRESS</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: distress === 'HIGH' ? 'var(--red-alert)' : distress === 'MEDIUM' ? 'var(--amber)' : 'var(--text-secondary)' }}>{distress}</span>
                </div>

                {/* Keywords */}
                {keywords.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)', marginBottom: 4 }}>MATCHED KEYWORDS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {keywords.map(kw => (
                        <span key={kw} style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                          padding: '1px 6px', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', background: 'rgba(255,255,255,0.03)',
                        }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {nlpData.is_duplicate && (
                  <div style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', marginTop: 2 }}>
                    [!] POSSIBLE DUPLICATE REPORT
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      {status === 'error' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(3,13,24,0.95)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem',
        }}
          className="fade-in"
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--red-alert)', letterSpacing: '0.2em' }}>
            DISPATCH FAILED
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.67rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 240 }}>
            {errorMsg}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
        {/* Coordinates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <div className="label-xs" style={{ marginBottom: 3 }}>LATITUDE</div>
            <input type="number" step="any" required placeholder="12.9716"
              value={form.lat} onChange={e => set('lat', e.target.value)}
              className="sub-input"
            />
          </div>
          <div>
            <div className="label-xs" style={{ marginBottom: 3 }}>LONGITUDE</div>
            <input type="number" step="any" required placeholder="77.5946"
              value={form.lng} onChange={e => set('lng', e.target.value)}
              className="sub-input"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <div className="label-xs" style={{ marginBottom: 3 }}>INCIDENT TYPE</div>
          <select
            value={form.incident_type}
            onChange={e => set('incident_type', e.target.value)}
            className="sub-input"
          >
            {VALID_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <div className="label-xs" style={{ marginBottom: 5 }}>SEVERITY LEVEL</div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[1, 2, 3, 4, 5].map(v => <SevBtn key={v} v={v} />)}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Description textarea */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="label-xs" style={{ marginBottom: 3 }}>DESCRIPTION (OPTIONAL)</div>
          <textarea
            placeholder="Describe the incident for NLP analysis (min 5 chars)..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="sub-input"
            style={{ flex: 1, minHeight: 60, resize: 'none' }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.72rem',
            letterSpacing: '0.2em',
            padding: '0.7rem',
            background: status === 'loading' ? 'rgba(255,51,68,0.1)' : 'rgba(255,51,68,0.12)',
            border: '1px solid var(--red-alert)',
            color: 'var(--red-alert)',
            cursor: status === 'loading' ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            width: '100%',
          }}
          onMouseEnter={e => { if (status !== 'loading') { e.currentTarget.style.background = 'var(--red-alert)'; e.currentTarget.style.color = '#030d18'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,51,68,0.12)'; e.currentTarget.style.color = 'var(--red-alert)'; }}
        >
          {status === 'loading' ? '⟳ TRANSMITTING...' : '✦ DISPATCH REPORT'}
        </button>
      </form>
    </div>
  );
}
