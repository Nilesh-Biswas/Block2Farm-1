import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, ZoomControl, useMap } from 'react-leaflet';
import { Activity, ArrowDownRight, ArrowUpRight, Bell, ChevronDown, CloudRain, CloudSun, Droplets, LocateFixed, MapPin, Menu, RefreshCw, Search, Sun, Wind, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fmt = (n, digits = 0) => Number(n ?? 0).toFixed(digits);

function Recenter({ point }) { const map = useMap(); useEffect(() => { if (point) map.flyTo([point.latitude, point.longitude], 12, { duration: .7 }); }, [point, map]); return null; }

export default function App() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState('');
  const firstRefreshStarted = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([fetch(`${API}/api/panchayats`), fetch(`${API}/api/meta`)]);
      if (!p.ok || !m.ok) throw new Error('Could not connect to the weather API. Start the backend and try again.');
      const data = await p.json(); setRows(data); setMeta(await m.json());
      setSelected(current => data.find(x => x.id === current?.id) || data[0] || null); setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function refresh() {
    setRefreshing(true);
    try { const response = await fetch(`${API}/api/forecasts/refresh`, { method: 'POST' }); if (!response.ok) { const result = await response.json(); throw new Error(result.detail || 'Could not reload the local IMD snapshot.'); } await load(); }
    catch (e) { setError(e.message); } finally { setRefreshing(false); }
  }
  useEffect(() => {
    if (!loading && rows.length && rows.every(p => !p.latest_forecast) && !firstRefreshStarted.current) {
      firstRefreshStarted.current = true;
      refresh();
    }
  }, [loading, rows]);

  const filtered = useMemo(() => rows.filter(p => `${p.name} ${p.block_name} ${p.crop}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const forecast = selected?.latest_forecast;
  const advice = selected?.advisory;
  const avgTemp = rows.length ? rows.reduce((a, p) => a + (p.latest_forecast?.temperature_c || 0), 0) / rows.length : 0;
  const totalRain = rows.reduce((a, p) => a + (p.latest_forecast?.rainfall_mm || 0), 0);
  const alertCount = rows.filter(p => ['critical', 'warning'].includes(p.advisory?.severity)).length;
  const imdConnected = rows.some(p => p.latest_forecast?.source?.includes('IMD snapshot'));
  const point = selected ? [selected.latitude, selected.longitude] : [30.73, 76.8];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><CloudSun size={21}/></div><div><b>fieldcast<span>.</span></b><small>LOCAL WEATHER, BETTER DECISIONS</small></div><button className="icon-button close-menu" onClick={() => setMobileOpen(false)}><X size={19}/></button></div>
      <div className="workspace"><div className="workspace-icon">IN</div><div><b>Pilot workspace</b><small>India · Demo district</small></div><ChevronDown size={15} className="muted"/></div>
      <div className="side-label">WORKSPACE</div>
      <button className="nav-item active"><span className="nav-glyph"><Activity size={17}/></span> Weather overview <span className="nav-dot"/></button>
      <button className="nav-item" onClick={() => document.getElementById('advisory')?.scrollIntoView({ behavior: 'smooth' })}><span className="nav-glyph"><Bell size={17}/></span> Crop advisories {alertCount > 0 && <span className="nav-count">{alertCount}</span>}</button>
      <div className="side-label panchayat-label">PANCHAYATS <span>{rows.length.toString().padStart(2, '0')}</span></div>
      <div className="search-box"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a Panchayat"/><kbd>/</kbd></div>
      <div className="location-list">{filtered.map(p => <button key={p.id} className={`location-item ${p.id === selected?.id ? 'selected' : ''}`} onClick={() => { setSelected(p); setMobileOpen(false); }}><span className="location-marker"><MapPin size={15}/></span><span className="location-copy"><b>{p.name}</b><small>{p.block_name}</small></span><span className="location-temp">{fmt(p.latest_forecast?.temperature_c)}°</span></button>)}</div>
      <div className="sidebar-bottom"><div className="avatar">FC</div><div><b>Fieldcast demo</b><small>Prototype account</small></div><ChevronDown size={15} className="muted"/></div>
    </aside>
    {mobileOpen && <button className="scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="top-title"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button><div><div className="eyebrow">WEATHER INTELLIGENCE <span>/</span> OVERVIEW</div><h1>Good morning, Field team <span className="wave">☀</span></h1></div></div><div className="top-actions"><span className="live-status"><i/> {imdConnected ? 'IMD SNAPSHOT' : 'LOADING DATA'}</span><button className="refresh-btn" onClick={refresh} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''}/><span>{refreshing ? 'Loading' : 'Reload snapshot'}</span></button><button className="notification-button" aria-label="Notifications"><Bell size={17}/><i/></button></div></header>
      {error && <div className="error-banner">{error}<button onClick={load}>Retry</button></div>}
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow">SATURDAY, 26 SEPTEMBER 2026 <span className="status-pill">● &nbsp;ALL SYSTEMS NORMAL</span></div><h2>Your district, <em>in focus.</em></h2><p>Hyperlocal weather and crop guidance for every Panchayat.</p></div><button className="district-select"><span className="district-icon"><MapPin size={16}/></span><span><small>YOUR PILOT DISTRICT</small><b>Demo District, India</b></span><ChevronDown size={16}/></button></section>
        <section className="stats-grid">
          <article className="stat-card"><div className="stat-top"><span>AVERAGE TEMPERATURE</span><span className="stat-icon sun-icon"><Sun size={17}/></span></div><div className="stat-value">{loading ? '—' : fmt(avgTemp, 1)}<small>°C</small></div><div className="stat-foot"><span className="positive"><ArrowUpRight size={14}/> 1.2°</span> vs. block baseline</div><div className="sparkline warm"><svg viewBox="0 0 110 30" preserveAspectRatio="none"><path d="M0 24 C12 22 13 8 26 15 S41 23 52 12 S68 15 75 9 S92 12 110 1"/></svg></div></article>
          <article className="stat-card"><div className="stat-top"><span>FORECAST RAINFALL</span><span className="stat-icon rain-icon"><CloudRain size={17}/></span></div><div className="stat-value">{loading ? '—' : fmt(totalRain / Math.max(rows.length, 1), 1)}<small>mm</small></div><div className="stat-foot"><span className="neutral"><ArrowDownRight size={14}/> IMD snapshot</span> Panchayat average</div><div className="sparkline blue"><svg viewBox="0 0 110 30" preserveAspectRatio="none"><path d="M0 27 C9 25 14 27 21 20 S32 23 40 17 S53 24 62 13 S77 18 86 9 S101 15 110 3"/></svg></div></article>
          <article className="stat-card"><div className="stat-top"><span>ACTIVE WEATHER ALERTS</span><span className="stat-icon alert-icon"><Bell size={16}/></span></div><div className="stat-value">{loading ? '—' : alertCount.toString().padStart(2, '0')}<small> alerts</small></div><div className="stat-foot"><span className="alert-foot">Across {rows.length} Panchayats</span></div><div className="alert-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        </section>
        <section className="map-section"><div className="section-heading"><div><div className="eyebrow">IMD BLOCK FORECAST SNAPSHOT</div><h3>Hyperlocal conditions <span className="map-date">· &nbsp;Sujanpur, Pathankot</span></h3></div><button className="map-action" onClick={() => selected && window.open(`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=12/${selected.latitude}/${selected.longitude}`, '_blank')}><LocateFixed size={15}/> <span>View selected area</span></button></div>
          <div className="map-frame"><MapContainer center={point} zoom={11} zoomControl={false} scrollWheelZoom className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><ZoomControl position="bottomright"/><Recenter point={selected}/>{rows.map(p => <CircleMarker key={p.id} center={[p.latitude, p.longitude]} radius={p.id === selected?.id ? 12 : 9} pathOptions={{ color: '#fff', weight: 3, fillColor: p.advisory?.severity === 'critical' ? '#e76f51' : p.advisory?.severity === 'warning' ? '#e4a840' : '#277a5d', fillOpacity: .95 }} eventHandlers={{ click: () => setSelected(p) }}><></></CircleMarker>)}</MapContainer>
            <div className="map-legend"><div className="legend-title">PANCHAYAT CONDITIONS</div><div><i className="legend-good"/> Normal <i className="legend-warn"/> Advisory <i className="legend-critical"/> Critical</div></div>
            {selected && <div className="map-card"><div className="map-card-top"><span className="map-card-kicker"><i/> SELECTED DEMO LOCATION</span><button onClick={() => setSelected(null)} aria-label="Close selected area"><X size={15}/></button></div><b>{selected.name}</b><small>{selected.block_name} · {selected.district_name}</small><div className="map-weather"><span><Sun size={16}/> {fmt(forecast?.temperature_c)}°C</span><span><Droplets size={15}/> {fmt(forecast?.rainfall_mm)} mm / 24h</span></div></div>}
            <div className="map-scale">© OpenStreetMap contributors</div>
          </div><div className="map-caption"><span><i/> {rows.length} sample Panchayat locations</span><span>Static IMD data dated 26 Sep 2026 <b>·</b> Terrain-adjusted prototype</span></div>
        </section>
        <section className="bottom-grid"><article className="advisory-panel" id="advisory"><div className="panel-heading"><div><div className="eyebrow">FIELD-READY GUIDANCE</div><h3>Today's advisories</h3></div><button className="text-button">View all <span>↗</span></button></div>{selected && advice ? <div className={`advisory-card ${advice.severity}`}><div className="advisory-symbol">{advice.severity === 'critical' || advice.severity === 'warning' ? <CloudRain size={19}/> : <Sun size={19}/>}</div><div className="advisory-content"><div className="advisory-meta"><span>{advice.severity.toUpperCase()} · {selected.name}</span><span>JUST NOW</span></div><b>{advice.title}</b><p>{advice.message}</p><div className="advice-action"><b>Recommended action</b><span>{advice.action}</span></div></div></div> : <div className="empty-state">Select a Panchayat to see its latest crop advisory.</div>}</article>
          <article className="pipeline-panel"><div className="panel-heading"><div><div className="eyebrow">HOW THE FORECAST IS BUILT</div><h3>From block to field</h3></div><span className="pipeline-chip"><Activity size={13}/> 5 STAGES</span></div><div className="pipeline-list">{[['01','Input forecast','Block-level weather baseline'],['02','Apply terrain physics','Elevation · slope · exposure'],['03','Correct the residual','Land cover · soil moisture'],['04','Clamp & validate','Keep values physically bounded'],['05','Generate advice','Crop stage · rainfall thresholds']].map((s, i) => <div className="pipeline-step" key={s[0]}><span className={`step-number ${i === 4 ? 'last-step' : ''}`}>{s[0]}</span><span className="step-copy"><b>{s[1]}</b><small>{s[2]}</small></span>{i < 4 && <span className="step-line"/>}</div>)}</div></article></section>
        <footer className="footer"><span>FIELDCAST <i>·</i> WEATHER THAT MEETS YOU WHERE YOU FARM</span><span>Prototype · Do not use for operational farm decisions</span></footer>
      </div>
    </main>
  </div>;
}
