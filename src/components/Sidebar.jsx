import React from 'react';
import { useTheme } from '../context/ThemeContext';
import ModeSlider from './ModeSlider';
import OrayaLogo from './OrayaLogo';

const TABS = [
  { id: 'SONAR',    icon: '◎', label: 'SONAR MAP' },
  { id: 'DANGER',   icon: '⚠', label: 'DANGER SCORE' },
  { id: 'THREATS',  icon: '⬡', label: 'INCIDENTS' },
  { id: 'INTEL',    icon: '▤', label: 'ANALYTICS' },
  { id: 'ROUTE',    icon: '→', label: 'SAFE ROUTE' },
  { id: 'SECTOR',   icon: '◈', label: 'CLUSTER INFO' },
  { id: 'DISPATCH', icon: '✦', label: 'DISPATCH' },
  { id: 'SURVEILLANCE', icon: '📷', label: 'SURVEILLANCE' },
  { id: 'ANOMALY',  icon: '⚡', label: 'ANOMALY SCAN' },
];

export default function Sidebar({ activeTab, onTabChange, threatCount = 0 }) {
  const { currentTheme, changeTheme, themes, mode } = useTheme();

  return (
    <aside style={{
      width: 200,
      flexShrink: 0,
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      zIndex: 50,
      transition: 'background 0.4s ease',
    }}>
      {/* Logo slot */}
      <div style={{
        padding: '1rem 1rem 0.75rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <OrayaLogo variant="icon" status="idle" />
        <span className="label-xs" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>NAVIGATION</span>
      </div>

      {/* Nav tabs */}
      <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
        {TABS.map(({ id, icon, label }) => {
          const isActive = activeTab === id;
          const isAlert = id === 'THREATS' && threatCount > 0;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`sidebar-btn ${isActive ? 'active' : ''}`}
            >
              <span style={{
                fontSize: '0.85rem',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                width: 18,
                flexShrink: 0,
                textAlign: 'center',
                transition: 'color 0.2s',
              }}>
                {icon}
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              {isAlert && (
                <span style={{
                  background: 'var(--red-alert)',
                  color: 'var(--bg-primary)',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 2,
                  animation: 'pulse-amber 1.5s infinite',
                }}>
                  {threatCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme Calibration & Mode Toggle */}
      <div style={{ 
        padding: '1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem', 
        flexShrink: 0,
        background: 'rgba(var(--accent-rgb), 0.03)',
        borderTop: '1px solid var(--border)'
      }}>
        
        {/* Environment Mode Slider */}
        <ModeSlider />

        {/* Theme Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="label-xs" style={{ fontSize: '0.55rem' }}>THEME_CALIBRATION</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => changeTheme(t.id)}
                title={t.name}
                style={{
                  width: 14, height: 14, borderRadius: 2,
                  background: t.color, cursor: 'pointer',
                  border: currentTheme === t.id ? `1px solid var(--text-primary)` : `1px solid transparent`,
                  boxShadow: currentTheme === t.id ? `0 0 8px ${t.color}` : 'none',
                  opacity: currentTheme === t.id ? 1 : 0.4,
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border)',
      }}>
        <div className="label-xs" style={{ lineHeight: 1.8 }}>
          <div>SECTOR: CBD-01</div>
          <div>NODE: {(import.meta.env.VITE_CITY_NAME || 'CHANDIGARH').toUpperCase()}</div>
          <div style={{ color: 'var(--accent)' }}>STATUS: <span className="blink">ACTIVE</span></div>
        </div>
      </div>
    </aside>
  );
}
