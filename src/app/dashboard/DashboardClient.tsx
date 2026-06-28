'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import gsap from 'gsap';
import { 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  MapPin, 
  ThumbsUp, 
  PlusCircle, 
  Clock, 
  Building2, 
  Flame,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star,
  Sparkles,
  Route,
  Send,
  FileSpreadsheet,
  Zap,
  Layers,
  Map as MapIcon,
  Filter,
  Eye,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wrench,
  UserCheck
} from 'lucide-react';
import MapComponent from '@/components/MapComponent';

export default function DashboardClient() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  
  // Real-time counting stats via GSAP
  const [animatedStats, setAnimatedStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    highRisk: 0
  });

  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [loading, setLoading] = useState(true);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Map Controls State
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const [forceHeatmap, setForceHeatmap] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  // Geolocation & Radius States
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState(3.0); // Default: 3km radius slider

  // Routing Overlay state
  const [routeStart, setRouteStart] = useState('');
  const [routeEnd, setRouteEnd] = useState('');
  const [detectedRouteHazards, setDetectedRouteHazards] = useState<any[]>([]);

  // AI Predictive Risk Forecasting state
  const [forecastZones, setForecastZones] = useState<any[]>([]);

  // Selection & Highlight hover sync states
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);

  // Collapsible Accordion Sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    overview: false,
    incidents: false,
    priority: true,
    nearby: true,
    insights: true,
    validation: true
  });

  // Filters State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');

  // AI Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Tactical AI Advisor online. Ask me about cluster hazard risks, SLA breaches, or municipal work order updates.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    detectUserLocation();
    fetchForecastData();
  }, []);

  const detectUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.log('Proximity geolocation access denied by user.', err)
      );
    }
  };

  const fetchForecastData = async () => {
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.zones) {
          setForecastZones(data.zones);
        }
      }
    } catch (e) {
      console.warn('Forecast fetch failed:', e);
    }
  };

  const getDistanceInKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const animateStats = (targets: { total: number, resolved: number, pending: number, highRisk: number }) => {
    const obj = { total: 0, resolved: 0, pending: 0, highRisk: 0 };
    gsap.to(obj, {
      total: targets.total,
      resolved: targets.resolved,
      pending: targets.pending,
      highRisk: targets.highRisk,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        setAnimatedStats({
          total: Math.floor(obj.total),
          resolved: Math.floor(obj.resolved),
          pending: Math.floor(obj.pending),
          highRisk: Math.floor(obj.highRisk)
        });
      }
    });
  };

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }

      const { data: fetchedIssues } = await supabase
        .from('issues')
        .select('*')
        .order('priority_score', { ascending: false });

      if (fetchedIssues) {
        setIssues(fetchedIssues);

        const total = fetchedIssues.length;
        const resolved = fetchedIssues.filter(i => i.status === 'resolved').length;
        const pending = fetchedIssues.filter(i => i.status === 'pending').length;
        const highRisk = fetchedIssues.filter(i => i.safety_risk === 'high').length;

        animateStats({ total, resolved, pending, highRisk });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateIssue = async (issue: any) => {
    if (!userProfile) return;

    const upvotedIssues = JSON.parse(localStorage.getItem('community_hero_upvotes') || '[]');
    if (upvotedIssues.includes(issue.id)) {
      alert("You have already validated/upvoted this issue.");
      return;
    }

    setActionLoadingId(issue.id);
    const newUpvotes = (issue.upvotes || 0) + 1;
    const newPriorityScore = Math.min(100, (issue.priority_score || 25) + 5);

    try {
      const { error } = await supabase
        .from('issues')
        .update({ 
          upvotes: newUpvotes,
          priority_score: newPriorityScore
        })
        .eq('id', issue.id);

      if (error) throw error;

      upvotedIssues.push(issue.id);
      localStorage.setItem('community_hero_upvotes', JSON.stringify(upvotedIssues));

      await supabase.from('issue_events').insert([{
        issue_id: issue.id,
        type: 'duplicate_linked',
        message: `Community validation by ${userProfile.name}. Upvotes raised to ${newUpvotes}.`
      }]);

      const newScore = (userProfile.hero_score || 0) + 5;
      await supabase
        .from('users')
        .update({ hero_score: newScore })
        .eq('email', userProfile.email);

      setUserProfile({ ...userProfile, hero_score: newScore });
      
      const updatedIssues = issues.map(i => i.id === issue.id ? { ...i, upvotes: newUpvotes, priority_score: newPriorityScore } : i);
      setIssues(updatedIssues);
      
      // Update selected issue detail states
      if (selectedIssue && selectedIssue.id === issue.id) {
        setSelectedIssue({ ...selectedIssue, upvotes: newUpvotes, priority_score: newPriorityScore });
      }

      const total = updatedIssues.length;
      const resolved = updatedIssues.filter(i => i.status === 'resolved').length;
      const pending = updatedIssues.filter(i => i.status === 'pending').length;
      const highRisk = updatedIssues.filter(i => i.safety_risk === 'high').length;
      animateStats({ total, resolved, pending, highRisk });

    } catch (err) {
      console.error('Failed to validate issue:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/citizen-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory,
          userLocation
        })
      });

      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'bot', text: data.text || 'I could not process your query at this moment.' }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'bot', text: 'Error connecting to Municipal AI Assistant.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const exportIssuesToCsv = () => {
    if (issues.length === 0) return;
    const headers = ['ID', 'Title', 'Category', 'Severity', 'Status', 'Upvotes', 'Department', 'Priority Score', 'Latitude', 'Longitude', 'Created At'];
    const rows = issues.map(i => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      i.status,
      i.upvotes,
      i.department,
      i.priority_score,
      i.lat,
      i.lng,
      i.created_at
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Community_Hero_Reports_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSlaDetails = (slaDueAtStr: string, status: string) => {
    if (!slaDueAtStr) return { text: 'No SLA Set', color: '#737373', badgeClass: 'badge-pending' };
    
    const dueDate = new Date(slaDueAtStr);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));

    if (status === 'resolved') {
      return { text: 'Resolved in SLA', color: 'hsl(var(--accent))', badgeClass: 'badge-resolved' };
    }

    if (diffHrs < 0) {
      return { text: `Overdue by ${Math.abs(diffHrs)}h (Escalated)`, color: 'hsl(var(--destructive))', badgeClass: 'badge-high-risk' };
    }

    if (diffHrs <= 24) {
      return { text: `Due in ${diffHrs}h (Urgent)`, color: 'hsl(var(--warning))', badgeClass: 'badge-pending' };
    }

    return { text: `Due in ${diffHrs}h`, color: '#a3a3a3', badgeClass: 'badge-pending' };
  };

  const getCategoryEmoji = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('pothole') || cat.includes('road')) return '🕳️';
    if (cat.includes('light') || cat.includes('street')) return '💡';
    if (cat.includes('garbage') || cat.includes('waste')) return '🚮';
    if (cat.includes('water') || cat.includes('leak') || cat.includes('drain')) return '💧';
    if (cat.includes('tree') || cat.includes('block')) return '🌳';
    return '🚧';
  };

  const getSeverityColor = (severity: string) => {
    const sev = (severity || '').toLowerCase();
    if (sev === 'high') return '#ef4444'; // Red
    if (sev === 'medium') return '#eab308'; // Yellow
    return '#3b82f6'; // Blue
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter lists based on bottom controller settings
  const filteredIssues = issues.filter(issue => {
    if (selectedCategoryFilter !== 'all') {
      const match = getCategoryEmoji(issue.category);
      if (selectedCategoryFilter === 'pothole' && match !== '🕳️') return false;
      if (selectedCategoryFilter === 'streetlight' && match !== '💡') return false;
      if (selectedCategoryFilter === 'garbage' && match !== '🚮') return false;
      if (selectedCategoryFilter === 'water' && match !== '💧') return false;
    }

    if (selectedSeverityFilter !== 'all') {
      if (selectedSeverityFilter === 'high' && issue.severity?.toLowerCase() !== 'high') return false;
      if (selectedSeverityFilter === 'medium' && issue.severity?.toLowerCase() !== 'medium') return false;
    }

    return true;
  });

  const pendingList = filteredIssues.filter(i => i.status === 'pending');
  const resolvedList = filteredIssues.filter(i => i.status === 'resolved');
  const activeList = activeTab === 'pending' ? pendingList : resolvedList;

  // Near Me Filter
  const nearMeList = activeList.filter(i => {
    if (!userLocation) return false;
    const dist = getDistanceInKm(userLocation.lat, userLocation.lng, i.lat, i.lng);
    return dist <= nearMeRadius;
  });

  // Priority Queue sorted
  const priorityQueueList = [...activeList].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

  return (
    <div style={{ position: 'relative', width: '100vw', height: 'calc(100vh - 70px)', overflow: 'hidden', background: '#070707' }}>
      
      {/* 1. Immersive Edge-to-Edge Map Base */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
        <MapComponent 
          externalIssues={activeList}
          startAddress={routeStart} 
          endAddress={routeEnd}
          onHazardsDetected={(hazards) => setDetectedRouteHazards(hazards)}
          forecastZones={forecastZones}
          highlightedIssueId={highlightedIssueId}
          onSelectIssue={(issue) => setSelectedIssue(issue)}
          mapTypeId={mapTypeId}
          forceHeatmap={forceHeatmap}
          showTraffic={showTraffic}
        />
      </div>

      {/* 2. Floating Operations Panel (Left Sidebar) */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        left: isLeftSidebarOpen ? '1.5rem' : '-440px',
        bottom: '1.5rem',
        width: '400px',
        background: 'rgba(12, 12, 12, 0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Operations Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="hsl(var(--primary))" className="pulse" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.01em', color: '#ffffff', margin: 0 }}>
              Tactical Operations
            </h2>
          </div>
          <button 
            onClick={exportIssuesToCsv}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <FileSpreadsheet size={12} /> Export CSV
          </button>
        </div>

        {/* Scrollable Collapsible Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
          
          {/* Section 1: Overview & KPI Stats */}
          <div style={{ marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            <button 
              onClick={() => toggleSection('overview')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.015)', border: 'none', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <span>OPERATIONAL SUMMARY</span>
              {collapsedSections.overview ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!collapsedSections.overview && (
              <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '10px' }}>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: '#a3a3a3', fontWeight: 600 }}>ACTIVE CASES</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>{animatedStats.pending}</span>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: '10px' }}>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: '#a3a3a3', fontWeight: 600 }}>RESOLVED LOGS</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'hsl(var(--accent))' }}>{animatedStats.resolved}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Live Incidents Feed */}
          <div style={{ marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            <button 
              onClick={() => toggleSection('incidents')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.015)', border: 'none', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <span>INCIDENTS FEED ({activeList.length})</span>
              {collapsedSections.incidents ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!collapsedSections.incidents && (
              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {activeList.map(issue => (
                  <div 
                    key={issue.id}
                    className="card"
                    onMouseEnter={() => setHighlightedIssueId(issue.id)}
                    onMouseLeave={() => setHighlightedIssueId(null)}
                    onClick={() => setSelectedIssue(issue)}
                    style={{ 
                      padding: '0.75rem', 
                      background: highlightedIssueId === issue.id ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                      border: highlightedIssueId === issue.id ? '1px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>{getCategoryEmoji(issue.category)} <strong>{issue.category}</strong></span>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getSeverityColor(issue.severity) }} />
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {issue.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Priority Queue */}
          <div style={{ marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            <button 
              onClick={() => toggleSection('priority')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.015)', border: 'none', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <span>PRIORITY QUEUE (Sorted by AI)</span>
              {collapsedSections.priority ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!collapsedSections.priority && (
              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                {priorityQueueList.slice(0, 5).map(issue => (
                  <div 
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    style={{ padding: '0.65rem', background: 'rgba(255,255,255,0.015)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                      <span style={{ color: '#ffffff', fontWeight: 600 }}>{issue.title}</span>
                      <span style={{ color: 'hsl(var(--primary))', fontWeight: 800 }}>P: {issue.priority_score || 25}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Nearby Reports */}
          <div style={{ marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            <button 
              onClick={() => toggleSection('nearby')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.015)', border: 'none', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <span>NEARBY RADAR ({nearMeList.length})</span>
              {collapsedSections.nearby ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!collapsedSections.nearby && (
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#a3a3a3' }}>
                  <span>Proximity Radius:</span>
                  <span style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>{nearMeRadius} km</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="15" 
                  step="0.5" 
                  value={nearMeRadius}
                  onChange={(e) => setNearMeRadius(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'hsl(var(--primary))' }}
                />
              </div>
            )}
          </div>

          {/* Section 5: AI Insights */}
          <div style={{ marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', overflow: 'hidden' }}>
            <button 
              onClick={() => toggleSection('insights')}
              style={{ width: '100%', background: 'rgba(255,255,255,0.015)', border: 'none', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#e5e7eb', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <span>AI FORECAST ZONES ({forecastZones.length})</span>
              {collapsedSections.insights ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
            {!collapsedSections.insights && (
              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {forecastZones.map((zone, idx) => (
                  <div key={idx} style={{ padding: '0.65rem', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.15)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#a855f7' }}>
                      <span>{zone.hazardType}</span>
                      <span>Risk: {zone.riskScore}%</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#a3a3a3', margin: '0.25rem 0 0 0' }}>{zone.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Collapsible toggle bar footer */}
        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab(activeTab === 'pending' ? 'resolved' : 'pending')}
            className="btn btn-secondary" 
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.76rem' }}
          >
            Show: {activeTab === 'pending' ? 'Resolved Logs' : 'Pending Verification'}
          </button>
          
          <Link href="/report" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <PlusCircle size={13} /> File Issue
          </Link>
        </div>
      </div>

      {/* Sidebar collapsible state handle */}
      <button 
        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        style={{
          position: 'absolute',
          left: isLeftSidebarOpen ? '424px' : '1.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '48px',
          background: 'rgba(12, 12, 12, 0.72)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'hsl(var(--foreground))'
        }}
      >
        {isLeftSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* 3. Floating Bottom GIS map Console Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        background: 'rgba(12, 12, 12, 0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '100px',
        padding: '0.5rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
      }}>
        
        {/* Style selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapIcon size={14} color="#737373" />
          <select 
            value={mapTypeId}
            onChange={(e) => setMapTypeId(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            <option value="roadmap" style={{ background: '#121212' }}>Tactical Dark</option>
            <option value="satellite" style={{ background: '#121212' }}>Imagery</option>
            <option value="hybrid" style={{ background: '#121212' }}>Hybrid</option>
            <option value="terrain" style={{ background: '#121212' }}>Terrain</option>
          </select>
        </div>

        <div style={{ height: '14px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Overlay triggers */}
        <button 
          onClick={() => setForceHeatmap(!forceHeatmap)}
          style={{ background: 'none', border: 'none', color: forceHeatmap ? 'hsl(var(--primary))' : '#737373', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <Layers size={13} /> Heatmap
        </button>

        <button 
          onClick={() => setShowTraffic(!showTraffic)}
          style={{ background: 'none', border: 'none', color: showTraffic ? 'hsl(var(--primary))' : '#737373', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <Activity size={13} /> Traffic
        </button>

        <div style={{ height: '14px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Quick Severity filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Filter size={13} color="#737373" />
          <select 
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            <option value="all" style={{ background: '#121212' }}>All Severity</option>
            <option value="high" style={{ background: '#121212' }}>High Only</option>
            <option value="medium" style={{ background: '#121212' }}>Medium+</option>
          </select>
        </div>

      </div>

      {/* 4. Floating Right Inspector panel */}
      {selectedIssue && (
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          bottom: '1.5rem',
          width: '420px',
          background: 'rgba(12, 12, 12, 0.75)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease'
        }}>
          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              INCIDENT INSPECTOR
            </span>
            <button 
              onClick={() => setSelectedIssue(null)}
              style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>

          {/* Inspector Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            
            {/* Proof image */}
            {selectedIssue.image_url ? (
              <img 
                src={selectedIssue.image_url} 
                alt="Proof" 
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '14px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '180px', background: 'rgba(255,255,255,0.01)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#737373', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.25rem' }}>
                No Image Proof Provided
              </div>
            )}

            {/* Info details */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
              {selectedIssue.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#a3a3a3', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {selectedIssue.description}
            </p>

            {/* Meta tags Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#737373' }}>AI PRIORITY</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: getSeverityColor(selectedIssue.severity), display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Flame size={12} /> {selectedIssue.priority_score || 25}
                </span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.65rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#737373' }}>DEPARTMENT</span>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', marginTop: '0.15rem' }}>
                  {selectedIssue.department || 'General Admin'}
                </span>
              </div>
            </div>

            {/* SLA Ticker */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.85rem 1rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.65rem', color: '#737373', fontWeight: 600 }}>SLA DUE STATUS</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: getSlaDetails(selectedIssue.sla_due_at, selectedIssue.status).color }}>
                {getSlaDetails(selectedIssue.sla_due_at, selectedIssue.status).text}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {selectedIssue.status === 'pending' ? (
                <button 
                  onClick={() => handleValidateIssue(selectedIssue)}
                  disabled={actionLoadingId === selectedIssue.id}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <ThumbsUp size={14} /> Validate Incident ({selectedIssue.upvotes || 0})
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '10px', textAlign: 'center', fontSize: '0.8rem', color: 'hsl(var(--accent))' }}>
                  ✓ Issue has been resolved and closed.
                </div>
              )}

              <Link href={`/issue/${selectedIssue.id}`} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.82rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <ExternalLink size={14} /> Open Review Logs
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* Floating Chatbot Indicator Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {chatOpen && (
          <div className="card" style={{
            width: '330px',
            height: '400px',
            background: 'rgba(12, 12, 12, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            marginBottom: '1rem',
            boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '1.25rem 1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} /> AI Operations Assistant
              </span>
              <button 
                onClick={() => setChatOpen(false)}
                style={{ background: 'none', border: 'none', color: '#737373', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem', paddingRight: '0.25rem' }}>
              {chatHistory.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  padding: '0.5rem 0.75rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  fontSize: '0.78rem',
                  maxWidth: '85%',
                  lineHeight: 1.4,
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.75rem', borderRadius: '12px 12px 12px 0', fontSize: '0.78rem', color: '#737373' }}>
                  Analyzing command data...
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Query routing alerts..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        )}

        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className="btn btn-primary animate-pulse"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
            border: 'none',
            padding: 0
          }}
        >
          <Sparkles size={24} color="white" />
        </button>
      </div>

    </div>
  );
}
