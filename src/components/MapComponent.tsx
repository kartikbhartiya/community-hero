'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, TrafficLayer, HeatmapLayer, DirectionsRenderer, Circle } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import styles from './MapComponent.module.css';
import { Layers, AlertTriangle } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 12.9716, // Bangalore default coordinates
  lng: 77.5946
};

const libraries: ("visualization")[] = ['visualization'];

interface MapComponentProps {
  externalIssues?: any[];
  startAddress?: string;
  endAddress?: string;
  onHazardsDetected?: (hazards: any[]) => void;
  forecastZones?: any[];
  highlightedIssueId?: string | null;
  onSelectIssue?: (issue: any) => void;
  mapTypeId?: string;
  forceHeatmap?: boolean;
  showTraffic?: boolean;
}

export default function MapComponent({ 
  externalIssues, 
  startAddress = '', 
  endAddress = '', 
  onHazardsDetected,
  forecastZones = [],
  highlightedIssueId = null,
  onSelectIssue,
  mapTypeId = 'roadmap',
  forceHeatmap = false,
  showTraffic = false
}: MapComponentProps) {
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    version: '3.64',
    libraries
  });

  const [localIssues, setLocalIssues] = useState<any[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(13);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  
  // Directions routing state
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [routeHazards, setRouteHazards] = useState<any[]>([]);

  // If external issues are provided, use them; otherwise fetch from DB
  const issues = useMemo(() => {
    return externalIssues || localIssues;
  }, [externalIssues, localIssues]);

  useEffect(() => {
    if (!externalIssues) {
      fetchIssues();
    }
  }, [externalIssues]);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLocalIssues(data);
    }
  };

  // Pan and Zoom camera to highlighted issue when hovered in sidebar
  useEffect(() => {
    if (highlightedIssueId && map) {
      const target = issues.find(i => i.id === highlightedIssueId);
      if (target) {
        map.panTo({ lat: target.lat, lng: target.lng });
        map.setZoom(16);
      }
    }
  }, [highlightedIssueId, map, issues]);

  // Google Maps directions calculation
  useEffect(() => {
    if (!isLoaded || !startAddress || !endAddress || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: startAddress,
        destination: endAddress,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          calculateRouteHazards(result);
        } else {
          console.error(`Directions request failed: ${status}`);
        }
      }
    );
  }, [isLoaded, startAddress, endAddress]);

  // Reset directions if addresses are cleared
  useEffect(() => {
    if (!startAddress && !endAddress) {
      setDirectionsResponse(null);
      setRouteHazards([]);
      if (onHazardsDetected) onHazardsDetected([]);
    }
  }, [startAddress, endAddress]);

  // Haversine distance calculator
  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in meters
  };

  // Check if any issues are along the route path (within 150m buffer)
  const calculateRouteHazards = (result: google.maps.DirectionsResult) => {
    const routePath = result.routes[0]?.overview_path;
    if (!routePath || issues.length === 0) return;

    const detected: any[] = [];
    issues.forEach(issue => {
      let minDistance = Infinity;
      routePath.forEach(point => {
        const dist = getDistanceInMeters(issue.lat, issue.lng, point.lat(), point.lng());
        if (dist < minDistance) {
          minDistance = dist;
        }
      });

      if (minDistance <= 150) {
        detected.push(issue);
      }
    });

    setRouteHazards(detected);
    if (onHazardsDetected) {
      onHazardsDetected(detected);
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
    setZoom(mapInstance.getZoom() || 13);
  }, []);

  const onUnmount = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(null);
  }, []);

  // Generate dynamic, glowing SVG markers based on severity & category
  const getMarkerIcon = (issue: any, isSelected: boolean) => {
    let emoji = '📌';
    const cat = (issue.category || '').toLowerCase();
    if (cat.includes('pothole') || cat.includes('road') || cat.includes('pavement')) emoji = '🕳️';
    else if (cat.includes('light') || cat.includes('street') || cat.includes('power')) emoji = '💡';
    else if (cat.includes('garbage') || cat.includes('waste') || cat.includes('dump')) emoji = '🚮';
    else if (cat.includes('water') || cat.includes('leak') || cat.includes('sewage')) emoji = '💧';
    else if (cat.includes('tree') || cat.includes('block') || cat.includes('branch')) emoji = '🌳';
    else if (cat.includes('hazard') || cat.includes('danger') || cat.includes('safety')) emoji = '🚧';

    let ringColor = '#a3a3a3';
    const status = (issue.status || '').toLowerCase();
    
    if (status === 'resolved') {
      ringColor = 'hsl(142, 72%, 40%)'; // Mint resolved accent
    } else {
      const sev = (issue.severity || '').toLowerCase();
      if (sev === 'high') ringColor = '#ef4444'; // Crimson
      else if (sev === 'medium') ringColor = '#eab308'; // Amber
      else ringColor = '#3b82f6'; // Blue
    }

    const size = isSelected ? 50 : 38;
    const strokeWidth = isSelected ? 3 : 1.5;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <filter id="glow-${issue.id}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="#070707" stroke="${ringColor}" stroke-width="${strokeWidth}" ${isSelected ? `filter="url(#glow-${issue.id})"` : ''} />
        <text x="${size/2}" y="${size/2 + 2}" font-size="${isSelected ? 18 : 14}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;utf-8,${encodeURIComponent(svg)}`,
      scaledSize: isLoaded ? new window.google.maps.Size(size, size) : null,
      anchor: isLoaded ? new window.google.maps.Point(size / 2, size / 2) : null
    };
  };

  // Convert issues coordinates list into heatmap LatLng format
  const heatmapData = useMemo(() => {
    if (!isLoaded || !window.google) return [];
    return issues.map(issue => new window.google.maps.LatLng(issue.lat, issue.lng));
  }, [issues, isLoaded]);

  // Determine whether to show heatmap
  const showHeatmap = forceHeatmap || zoom < 14;

  if (!isLoaded) return <div className={styles.loading}>Loading Map Engine...</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      
      {/* Heatmap / Pins Mode Overlay indicator */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        zIndex: 10,
        background: 'rgba(12, 12, 12, 0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '100px',
        padding: '0.5rem 1.25rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#a3a3a3',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <Layers size={14} color="hsl(var(--primary))" />
        <span>Operations Mode: {showHeatmap ? 'Heatmap Density' : 'Tactical Pinpoints'}</span>
      </div>

      {/* Route alerts indicator */}
      {routeHazards.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'rgba(239, 68, 68, 0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: '100px',
          padding: '0.65rem 1.5rem',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 12px 36px rgba(239, 68, 68, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <AlertTriangle size={18} />
          <span>Alert: {routeHazards.length} hazards verified along your path! Rerouting active.</span>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        mapTypeId={mapTypeId}
        onZoomChanged={() => {
          if (map) {
            setZoom(map.getZoom() || 13);
          }
        }}
        options={{ 
          disableDefaultUI: true, 
          zoomControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#0c0c0c" }] },
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#525252" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#0c0c0c" }] },
            {
              featureType: "administrative",
              elementType: "geometry",
              stylers: [{ color: "#262626" }],
            },
            {
              featureType: "road",
              elementType: "geometry.fill",
              stylers: [{ color: "#171717" }],
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#0c0c0c" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#020617" }],
            },
          ]
        }}
      >
        {/* Render traffic conditions if enabled */}
        {showTraffic && <TrafficLayer />}

        {/* Draw routing path renderer */}
        {directionsResponse && (
          <DirectionsRenderer 
            directions={directionsResponse} 
            options={{
              polylineOptions: {
                strokeColor: routeHazards.length > 0 ? '#ef4444' : '#10b981',
                strokeWeight: 5,
                strokeOpacity: 0.85
              },
              markerOptions: {
                visible: true
              }
            }}
          />
        )}

        {/* Draw risk forecast circles */}
        {forecastZones && forecastZones.map((zone, idx) => (
          <Circle
            key={`forecast-${idx}`}
            center={{ lat: zone.lat, lng: zone.lng }}
            radius={zone.radius || 300}
            options={{
              strokeColor: '#a855f7', // Purple AI warning zones
              strokeOpacity: 0.8,
              strokeWeight: 1.5,
              fillColor: '#a855f7',
              fillOpacity: 0.22
            }}
          />
        ))}

        {/* Display modes dynamically based on zoom */}
        {showHeatmap && !directionsResponse && typeof window !== 'undefined' && window.google?.maps?.visualization?.HeatmapLayer ? (
          <HeatmapLayer 
            data={heatmapData} 
            options={{ radius: 30, opacity: 0.85 }} 
          />
        ) : (
          issues.map((issue) => {
            const isSelected = (selectedIssueId: string | null) => selectedIssueId === issue.id 
              || hoveredMarkerId === issue.id 
              || highlightedIssueId === issue.id;
              
            return (
              <Marker
                key={issue.id}
                position={{ lat: issue.lat, lng: issue.lng }}
                icon={getMarkerIcon(issue, isSelected(highlightedIssueId))}
                onClick={() => {
                  if (onSelectIssue) onSelectIssue(issue);
                }}
                onMouseOver={() => setHoveredMarkerId(issue.id)}
                onMouseOut={() => setHoveredMarkerId(null)}
              />
            );
          })
        )}
      </GoogleMap>
    </div>
  );
}
