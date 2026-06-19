import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Explorer from './Explorer';
import { SafetyVariance, PeakDangerHours } from './Analytics';
import ReportForm from './ReportForm';
import DangerPanel from './DangerPanel';
import IncidentsPanel from './IncidentsPanel';
import SafeRoutePanel from './SafeRoutePanel';
import ClusterPanel from './ClusterPanel';
import CCTVPanel from './CCTVPanel';
import AnomalyScanner from './AnomalyScanner';
import { useTigerGraph } from '../hooks/useTigerGraph';

const PanelHeader = ({ title, subtitle, badge }) => (
  <div style={{ padding: '0.85rem 1rem 0', marginBottom: '0.75rem', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.18em' }}>{title}</div>
      {subtitle && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    {badge && (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.12em',
        padding: '2px 8px', border: '1px solid var(--accent)', color: 'var(--accent)', background: 'rgba(0,255,136,0.06)',
      }}>
        {badge}
      </span>
    )}
  </div>
);

export default function Dashboard() {
  const {
    data, danger, incidents, safeRoute, cluster, intersections,
    routeStart, setRouteStart, routeEnd, setRouteEnd,
    backendOnline, isLoading,
    selectedIntersection, setSelectedIntersection,
    selectedWeather, setSelectedWeather,
    verifiedOnly, setVerifiedOnly,
    refresh,
  } = useTigerGraph();

  const [activeTab, setActiveTab] = React.useState('SONAR');
  const [safestGeo, setSafestGeo]     = React.useState(null);
  const [fastestGeo, setFastestGeo]   = React.useState(null);
  const [balancedGeo, setBalancedGeo] = React.useState(null);
  const [userPos, setUserPos]         = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 900);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const handleRouteComputed = React.useCallback((routeData, src) => {
    const sg = routeData?.safest_route?.route_geojson;
    const fg = routeData?.fastest_route?.route_geojson || routeData?.shortest_route?.route_geojson;
    const bg = routeData?.balanced_route?.route_geojson;
    if (sg) setSafestGeo(sg);
    if (fg) setFastestGeo(fg);
    if (bg) setBalancedGeo(bg);
    if (src) setUserPos(src);
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '2px solid var(--accent)', borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div className="label-xs" style={{ color: 'var(--accent)' }}>INITIALIZING SYSTEMS...</div>
        </div>
      </div>
    );
  }

  const unverifiedCount = Array.isArray(incidents) ? incidents.filter(i => !i.verified).length : 0;

  const renderContent = () => {
    switch (activeTab) {
      case 'SONAR':
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
              gridTemplateRows: isMobile ? 'auto auto auto' : 'auto auto',
              gap: '1rem',
              height: '100%',
            }}
          >
            {/* Main map */}
            <div
              style={{
                gridRow: isMobile ? 'auto' : '1 / 3',
                minHeight: 420,
              }}
            >
              <Explorer
                intersections={intersections}
                incidents={incidents}
                safeRoute={safeRoute}
                safestRouteGeoJSON={safestGeo}
                shortestRouteGeoJSON={fastestGeo}
                balancedRouteGeoJSON={balancedGeo}
                selectedIntersection={selectedIntersection}
                userPosition={userPos}
              />
            </div>

            {/* Risk matrix */}
            <div className="panel panel-cut" style={{ padding: '1rem' }}>
              <div className="label-xs" style={{ color: 'var(--amber)', marginBottom: '0.6rem' }}>⬡ ACTIVE RISK FACTORS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(danger?.warnings?.length > 0 ? danger.warnings : data.primary_risk_factors).slice(0, 4).map((f, i) => (
                  <div key={i} style={{
                    padding: '0.4rem 0.6rem', border: '1px solid var(--border)',
                    background: 'rgba(255,170,0,0.04)', borderLeft: '2px solid var(--amber)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-primary)', lineHeight: 1.4,
                  }}>
                    {f}
                  </div>
                ))}
                {data.primary_risk_factors.length === 0 && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    NO ACTIVE THREATS
                  </div>
                )}
                {/* Isolation score */}
                <div style={{ marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="label-xs">ISOLATION INDEX</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--accent)' }}>
                      {((danger?.meta?.isolation_score ?? data.isolation_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                    <div style={{
                      height: 2, width: `${(danger?.meta?.isolation_score ?? data.isolation_score) * 100}%`,
                      background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)',
                      transition: 'width 1s ease',
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Dispatch mini */}
            <div style={{ position: 'relative' }}>
              <ReportForm />
            </div>
          </div>
        );

      case 'DANGER':
        return (
          <DangerPanel
            danger={danger}
            selectedIntersection={selectedIntersection}
            setSelectedIntersection={setSelectedIntersection}
            selectedWeather={selectedWeather}
            setSelectedWeather={setSelectedWeather}
          />
        );

      case 'THREATS':
        return (
          <IncidentsPanel
            incidents={incidents}
            verifiedOnly={verifiedOnly}
            setVerifiedOnly={setVerifiedOnly}
          />
        );

      case 'INTEL':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1rem', height: '100%' }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <SafetyVariance data={data.variance} />
            </div>
            <div style={{ gridColumn: '1 / 3' }}>
              <PeakDangerHours data={data.peak_hours} />
            </div>
          </div>
        );

      case 'ROUTE':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ flex: 1, minHeight: 300 }}>
              <Explorer
                intersections={intersections}
                incidents={incidents}
                safeRoute={safeRoute}
                safestRouteGeoJSON={safestGeo}
                shortestRouteGeoJSON={fastestGeo}
                balancedRouteGeoJSON={balancedGeo}
                selectedIntersection={selectedIntersection}
                userPosition={userPos}
              />
            </div>
            <div style={{ height: '420px', flexShrink: 0, overflowY: 'auto', padding: '0 0.5rem' }}>
              <SafeRoutePanel onRouteComputed={handleRouteComputed} />
            </div>
          </div>
        );

      case 'SECTOR':
        return <ClusterPanel cluster={cluster} />;

      case 'DISPATCH':
        return (
          <div style={{ maxWidth: 460, margin: '0 auto', height: '100%', position: 'relative' }}>
            <ReportForm />
          </div>
        );

      case 'SURVEILLANCE':
        return <CCTVPanel />;

      case 'ANOMALY':
        return <AnomalyScanner />;

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary)', overflow: 'hidden', position: 'relative' }}>
      {/* Hex bg & scanlines */}
      <div className="hex-bg" />
      <div className="scanlines" />
      <div className="vignette" />

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} threatCount={unverifiedCount} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <Header
          safetyScore={data.comfort_score}
          comfortLabel={data.comfort_label}
          backendOnline={backendOnline}
          intersectionName={danger?.meta?.intersection_name}
          onRefresh={refresh}
        />

        {/* Tab breadcrumb */}
        <div style={{
          padding: '0.4rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: 'var(--text-secondary)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span>ORAYA</span>
          <span style={{ color: 'var(--border)' }}>›</span>
          <span style={{ color: 'var(--accent)' }}>{activeTab}</span>
          <div style={{ flex: 1 }} />
          <span className="blink-slow" style={{ color: 'rgba(0,255,136,0.4)' }}>●</span>
          <span style={{ color: 'rgba(0,255,136,0.4)' }}>LIVE</span>
        </div>

        <main style={{ flex: 1, padding: '1rem', overflow: 'auto', display: 'flex', flexDirection: 'column' }} className="fade-in" key={activeTab}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
