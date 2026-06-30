'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import MapComponent from '@/components/MapComponent';
import {
  Navigation, Layers, Car, Map as MapIcon, AlertTriangle, ShieldCheck,
  Search, X, SlidersHorizontal, Loader2
} from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '🗺️' },
  { key: 'pothole', label: 'Roads', emoji: '🕳️' },
  { key: 'light', label: 'Lights', emoji: '💡' },
  { key: 'garbage', label: 'Waste', emoji: '🚮' },
  { key: 'water', label: 'Water', emoji: '💧' },
];

function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function MapPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [category, setCategory] = useState('all');
  const [nearMe, setNearMe] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [activeRoute, setActiveRoute] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [hazards, setHazards] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [traffic, setTraffic] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    supabase.from('issues').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setIssues(data);
    });
  }, []);

  const filtered = issues.filter(i => {
    if (category === 'all') return true;
    const c = (i.category || '').toLowerCase();
    if (category === 'pothole') return c.includes('pothole') || c.includes('road');
    if (category === 'light') return c.includes('light') || c.includes('street');
    if (category === 'garbage') return c.includes('garbage') || c.includes('waste');
    if (category === 'water') return c.includes('water') || c.includes('leak') || c.includes('drain');
    return true;
  });

  const nearby = nearMe && userLoc
    ? filtered.filter(i => distKm(userLoc, { lat: i.lat, lng: i.lng }) <= 5)
    : filtered;

  const runRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end) return;
    setScanning(true);
    setHazards([]);
    setActiveRoute({ start, end });
  };

  const toggleNearMe = () => {
    if (nearMe) { setNearMe(false); return; }
    if (userLoc) { setNearMe(true); return; }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMe(true); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100dvh)', overflow: 'hidden', background: 'var(--background)' }}>
      {/* Full-bleed map */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapComponent
          externalIssues={nearby}
          startAddress={activeRoute.start}
          endAddress={activeRoute.end}
          showTraffic={traffic}
          forceHeatmap={heatmap}
          mapTypeId={mapType}
          onHazardsDetected={(h) => { setHazards(h || []); setScanning(false); }}
        />
      </div>

      {/* Toggle panel button (mobile/compact) */}
      <button
        onClick={() => setPanelOpen(o => !o)}
        className="btn btn-primary"
        style={{ position: 'absolute', top: '90px', right: '1rem', zIndex: 20, padding: '0.55rem 0.7rem' }}
      >
        {panelOpen ? <X size={16} /> : <SlidersHorizontal size={16} />}
      </button>

      {/* Floating control panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            style={{
              position: 'absolute', top: '90px', left: '1rem', bottom: '1rem', width: 'min(360px, calc(100vw - 2rem))',
              zIndex: 15, background: 'rgb(var(--card-rgb) / 0.82)', backdropFilter: 'blur(22px) saturate(160%)',
              WebkitBackdropFilter: 'blur(22px) saturate(160%)', border: '1px solid var(--border)', borderRadius: '20px',
              boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1.1rem 1.2rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MapIcon size={18} color="var(--accent)" /> Live Operations Map
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {nearby.length} issues {nearMe ? 'within 5 km of you' : 'plotted'} · plan a safe route below
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Category filter */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Filter</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setCategory(c.key)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: '999px',
                      fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      border: `1px solid ${category === c.key ? 'var(--accent)' : 'var(--border)'}`,
                      background: category === c.key ? 'rgb(var(--accent-rgb) / 0.12)' : 'transparent',
                      color: category === c.key ? 'var(--accent)' : 'var(--foreground-secondary)',
                    }}>{c.emoji} {c.label}</button>
                  ))}
                </div>
              </div>

              {/* Route safety scanner */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Route Safety Scanner</label>
                <form onSubmit={runRoute} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Navigation size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                    <input className="input-field" style={{ paddingLeft: '2.2rem', fontSize: '0.82rem' }} placeholder="Start address" value={start} onChange={e => setStart(e.target.value)} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--destructive)' }} />
                    <input className="input-field" style={{ paddingLeft: '2.2rem', fontSize: '0.82rem' }} placeholder="Destination" value={end} onChange={e => setEnd(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={!start || !end || scanning} style={{ fontSize: '0.82rem' }}>
                    {scanning ? <><Loader2 className="spin" size={15} /> Scanning route…</> : <>Scan route for hazards</>}
                  </button>
                </form>

                {/* Hazard results */}
                {activeRoute.start && !scanning && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '12px', border: `1px solid ${hazards.length ? 'rgb(var(--destructive-rgb) / 0.35)' : 'rgb(var(--accent-rgb) / 0.35)'}`, background: hazards.length ? 'rgb(var(--destructive-rgb) / 0.08)' : 'rgb(var(--accent-rgb) / 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: hazards.length ? 'var(--destructive)' : 'var(--accent)' }}>
                      {hazards.length ? <><AlertTriangle size={15} /> {hazards.length} hazard{hazards.length > 1 ? 's' : ''} on this route</> : <><ShieldCheck size={15} /> Route looks clear</>}
                    </div>
                    {hazards.slice(0, 4).map((h, i) => (
                      <div key={i} style={{ fontSize: '0.76rem', color: 'var(--foreground-secondary)', marginTop: '0.35rem' }}>
                        • {h.title || h.category || 'Reported hazard'}{h.severity ? ` (${h.severity})` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Layer toggles */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Layers</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <Toggle icon={<Layers size={15} />} label="Heatmap density" on={heatmap} set={() => setHeatmap(v => !v)} />
                  <Toggle icon={<Navigation size={15} />} label={locating ? 'Locating you…' : 'Problems near me (5 km)'} on={nearMe} set={toggleNearMe} />
                  <Toggle icon={<Car size={15} />} label="Live traffic" on={traffic} set={() => setTraffic(v => !v)} />
                  <Toggle icon={<MapIcon size={15} />} label="Satellite view" on={mapType === 'satellite'} set={() => setMapType(t => t === 'roadmap' ? 'satellite' : 'roadmap')} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ icon, label, on, set }: { icon: React.ReactNode; label: string; on: boolean; set: () => void }) {
  return (
    <button onClick={set} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.6rem 0.8rem',
      borderRadius: '12px', border: '1px solid var(--border)', background: on ? 'rgb(var(--accent-rgb) / 0.1)' : 'transparent',
      cursor: 'pointer', color: on ? 'var(--accent)' : 'var(--foreground-secondary)', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>{icon} {label}</span>
      <span style={{ width: '34px', height: '18px', borderRadius: '99px', background: on ? 'var(--accent)' : 'var(--border-strong)', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: '2px', left: on ? '18px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </span>
    </button>
  );
}
