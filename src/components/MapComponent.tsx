'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, HeatmapLayer } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import styles from './MapComponent.module.css';
import Link from 'next/link';
import { Layers } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 70px)'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

const libraries: ("visualization")[] = ['visualization'];

export default function MapComponent() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const [issues, setIssues] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    if (!map) return;
    const handleScroll = () => {
      // Calculate scroll progress percentage
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      const scrollPercent = window.scrollY / totalScroll;
      
      // Zoom in from 13 to 15.5 as user scrolls
      const newZoom = 13 + scrollPercent * 2.5;
      map.setZoom(Math.min(16, Math.max(12, newZoom)));
      
      // Pan toward the first issue location if available
      if (issues.length > 0) {
        const targetIssue = issues[0];
        const startLat = defaultCenter.lat;
        const startLng = defaultCenter.lng;
        const targetLat = targetIssue.lat;
        const targetLng = targetIssue.lng;
        
        map.setCenter({
          lat: startLat + (targetLat - startLat) * Math.min(1, scrollPercent * 1.5),
          lng: startLng + (targetLng - startLng) * Math.min(1, scrollPercent * 1.5)
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [map, issues]);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setIssues(data);
    }
  };

  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        mapInstance.setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(null);
  }, []);

  const getMarkerIcon = (status: string, category: string) => {
    const color = status === 'resolved' ? '#10b981' : (status === 'validated' ? '#ea580c' : '#f59e0b');
    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: '#ffffff',
      scale: 1.5,
      anchor: isLoaded ? new window.google.maps.Point(12, 24) : null
    };
  };

  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google) return [];
    return issues.map(issue => new window.google.maps.LatLng(issue.lat, issue.lng));
  }, [issues, isLoaded]);

  if (!isLoaded) return <div className={styles.loading}>Loading Map...</div>;

  return (
    <div className={styles.mapContainer}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={() => setShowHeatmap(!showHeatmap)} 
          className="btn" 
          style={{ 
            background: showHeatmap ? 'hsl(var(--primary))' : 'hsla(var(--card), 0.9)', 
            color: showHeatmap ? 'white' : 'hsl(var(--foreground))',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={18} /> {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        {showHeatmap && (
          <HeatmapLayer 
            data={heatmapData} 
            options={{ radius: 30, opacity: 0.8 }} 
          />
        )}

        {!showHeatmap && issues.map(issue => (
          <Marker
            key={issue.id}
            position={{ lat: issue.lat, lng: issue.lng }}
            icon={getMarkerIcon(issue.status, issue.category)}
            onClick={() => setSelectedIssue(issue)}
          />
        ))}

        {!showHeatmap && selectedIssue && (
          <InfoWindow
            position={{ lat: selectedIssue.lat, lng: selectedIssue.lng }}
            onCloseClick={() => setSelectedIssue(null)}
          >
            <div className={styles.infoWindow}>
              <h3 className={styles.infoTitle}>{selectedIssue.title}</h3>
              <p className={styles.infoCategory}>{selectedIssue.category}</p>
              <div className={styles.infoMeta}>
                <span className={`badge badge-${selectedIssue.status.toLowerCase()}`}>
                  {selectedIssue.status}
                </span>
                <span className={styles.infoDate}>
                  {new Date(selectedIssue.created_at).toLocaleDateString()}
                </span>
              </div>
              <Link href={`/issue/${selectedIssue.id}`} className="btn btn-primary" style={{ marginTop: '0.75rem', width: '100%', fontSize: '0.85rem' }}>
                View Details
              </Link>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {!showHeatmap && (
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#f59e0b' }}></span> Pending
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#ea580c' }}></span> Validated
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#10b981' }}></span> Resolved
          </div>
        </div>
      )}
    </div>
  );
}
