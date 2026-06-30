'use client';

import MapComponent from '@/components/MapComponent';
import { ShieldAlert } from 'lucide-react';

export default function EmbedMapPage() {
  return (
    <div className="embed-mode" style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'var(--background)' }}>
      
      {/* Floating brand header */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 50,
        background: 'rgb(var(--card-rgb) / 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--surface-hover)',
        borderRadius: '12px',
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}>
        <ShieldAlert size={18} color="var(--primary)" />
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
          Community Hero Live Map
        </span>
      </div>

      <MapComponent />
    </div>
  );
}
