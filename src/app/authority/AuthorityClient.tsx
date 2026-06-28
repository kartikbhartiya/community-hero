'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Building, 
  DollarSign, 
  Camera, 
  CheckSquare, 
  Loader2, 
  RefreshCw, 
  Lock, 
  Eye, 
  Users, 
  BarChart3, 
  Sparkles, 
  Plus, 
  ShieldCheck, 
  ArrowUpRight,
  Database,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Wrench,
  Search,
  Filter,
  FileText,
  Compass,
  AlertCircle,
  ThumbsUp,
  SlidersHorizontal,
  Map,
  X
} from 'lucide-react';

export default function AuthorityClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthCardVisible, setIsAuthCardVisible] = useState(true);

  // Database lists
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Selected issue details
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [repairCost, setRepairCost] = useState<string>('');
  const [repairNotes, setRepairNotes] = useState('');

  // Resolution upload states
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Advanced search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');

  // Live Activity Logs (real from DB)
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Helper to safely parse cost strings like "₹5,000" or "7500" into numbers
  const parseCost = (cost: any): number => {
    if (cost === null || cost === undefined || cost === '') return 0;
    if (typeof cost === 'number') return cost;
    // Strip ₹ symbol, commas, spaces, and any non-numeric chars except dots
    const cleaned = String(cost).replace(/[₹,\s]/g, '').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Full category list matching the Gemini prompt
  const ALL_CATEGORIES = [
    'Potholes', 'Road Damage', 'Broken Streetlight', 'Water Leak', 'Sewage Overflow', 'Open Manhole',
    'Garbage Dumping', 'Overflowing Dustbin', 'Fallen Tree', 'Damaged Footpath', 'Illegal Encroachment',
    'Stray Animals', 'Waterlogging', 'Broken Traffic Signal', 'Missing Road Signs', 'Damaged Bus Stop',
    'Broken Bench', 'Vandalism', 'Noise Pollution', 'Air Pollution', 'Construction Debris',
    'Broken Railing', 'Damaged Playground', 'Electrical Hazard', 'Fire Hazard', 'Abandoned Vehicle',
    'Illegal Parking', 'Damaged Drain Cover', 'Public Toilet Issue', 'Mosquito Breeding', 'Other'
  ];

  // Fetch real activity logs from issue_events
  const fetchActivityLogs = async () => {
    try {
      const { data } = await supabase
        .from('issue_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        setActivityLogs(data.map((ev: any) => {
          const ago = getTimeAgo(ev.created_at);
          return {
            id: ev.id,
            text: ev.message || `${ev.type} event on case #${ev.issue_id?.substring(0, 8)}`,
            type: ev.type === 'escalated' ? 'warning' : ev.type === 'resolved' ? 'success' : 'info',
            time: ago
          };
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch activity logs:', e);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  useEffect(() => {
    const token = sessionStorage.getItem('authority_session');
    if (token) {
      setIsAuthenticated(true);
      fetchIssuesAndEscalate();
    }
  }, []);

  const handleUnlockPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/authority/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('authority_session', data.token);
        setIsAuthCardVisible(false);
        setTimeout(() => {
          setIsAuthenticated(true);
          fetchIssuesAndEscalate();
        }, 300);
      } else {
        setAuthError(data.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setAuthError('Connection error. Try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = () => {
    sessionStorage.setItem('authority_session', 'demo_authorized');
    setIsAuthCardVisible(false);
    setTimeout(() => {
      setIsAuthenticated(true);
      fetchIssuesAndEscalate();
    }, 300);
  };

  const fetchIssuesAndEscalate = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setIssues(data);
        if (data.length > 0 && !selectedIssue) {
          setSelectedIssue(data[0]);
          setAssignedOfficer(data[0].assigned_officer || '');
          setRepairCost(data[0].estimated_cost ? String(parseCost(data[0].estimated_cost)) : '');
        }
        await runAutoEscalation(data);
      }
      // Also fetch real activity logs
      await fetchActivityLogs();
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const runAutoEscalation = async (issuesList: any[]) => {
    setSyncing(true);
    const overdue = issuesList.filter(
      i => i.status === 'pending' && i.sla_due_at && new Date(i.sla_due_at) < new Date() && !i.escalated
    );

    if (overdue.length > 0) {
      for (const issue of overdue) {
        const newScore = Math.min(100, (issue.priority_score || 0) + 15);
        await supabase
          .from('issues')
          .update({ escalated: true, priority_score: newScore })
          .eq('id', issue.id);

        await supabase.from('issue_events').insert([{
          issue_id: issue.id,
          type: 'escalated',
          message: `SLA Overdue! Auto-escalated to smart city control room. Priority score set to ${newScore}/100.`
        }]);
      }
      
      const { data: updated } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });
      if (updated) setIssues(updated);
    }
    setSyncing(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      const updatedList = issues.map(issue => issue.id === id ? { ...issue, status: newStatus } : issue);
      setIssues(updatedList);
      if (selectedIssue?.id === id) {
        setSelectedIssue({ ...selectedIssue, status: newStatus });
      }
      await supabase.from('issue_events').insert([{
        issue_id: id,
        type: newStatus,
        message: `Official status changed to ${newStatus}.`
      }]);
    }
  };

  const handleAssignOfficerAndCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    try {
      const updates: any = {};
      if (assignedOfficer) updates.assigned_officer = assignedOfficer;
      if (repairCost !== '') updates.estimated_cost = repairCost;
      if (repairNotes) updates.resolution_feedback = repairNotes;

      const { error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', selectedIssue.id);

      if (error) throw error;

      // Log a dispatch event
      await supabase.from('issue_events').insert([{
        issue_id: selectedIssue.id,
        type: 'dispatch',
        message: `Work order dispatched${assignedOfficer ? ` to Officer ${assignedOfficer}` : ''}${repairCost ? ` with budget ₹${Number(repairCost).toLocaleString()}` : ''}.`
      }]);

      alert('Work order generated successfully.');
      const updatedIssues = issues.map(i => i.id === selectedIssue.id ? { ...i, ...updates } : i);
      setIssues(updatedIssues);
      setSelectedIssue({ ...selectedIssue, ...updates });
      await fetchActivityLogs();
    } catch (err: any) {
      alert(err.message || 'Error updating dispatch info.');
    }
  };

  const handleAfterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterImageFile(file);
      setVerificationFeedback(null);
      setVerificationError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAfterImage = () => {
    setAfterImageFile(null);
    setAfterImagePreview(null);
    setVerificationFeedback(null);
    setVerificationError(null);
    // Reset the file input
    const input = document.getElementById('after-fix-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const uploadProofFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `resolution_${fileName}`;

    const { error } = await supabase.storage
      .from('issue-images')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('issue-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleVerifyResolution = async () => {
    if (!selectedIssue || !afterImagePreview || !afterImageFile) return;

    setVerifying(true);
    setVerificationError(null);
    setVerificationFeedback(null);

    try {
      const res = await fetch('/api/verify-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeImageUrl: selectedIssue.image_url,
          afterImageBase64: afterImagePreview,
          category: selectedIssue.category
        })
      });

      if (!res.ok) throw new Error('AI comparison service rejected proposal.');
      const verification = await res.json();

      if (verification.isResolved) {
        setVerificationFeedback(`AI Verified: ${verification.reasoning} (${verification.quality} Quality)`);
        
        const proofUrl = await uploadProofFile(afterImageFile);

        const { error: dbError } = await supabase
          .from('issues')
          .update({
            status: 'resolved',
            after_image_url: proofUrl,
            resolved_at: new Date().toISOString(),
            resolution_verified: true,
            resolution_feedback: verification.reasoning
          })
          .eq('id', selectedIssue.id);

        if (dbError) throw dbError;

        await supabase.from('issue_events').insert([{
          issue_id: selectedIssue.id,
          type: 'resolved',
          message: `Official resolution verified by AI. Proof registered.`
        }]);

        const updated = issues.map(i => i.id === selectedIssue.id ? { 
          ...i, 
          status: 'resolved', 
          after_image_url: proofUrl, 
          resolved_at: new Date().toISOString(),
          resolution_verified: true,
          resolution_feedback: verification.reasoning 
        } : i);

        setIssues(updated);
        setSelectedIssue({
          ...selectedIssue,
          status: 'resolved',
          after_image_url: proofUrl,
          resolved_at: new Date().toISOString(),
          resolution_verified: true,
          resolution_feedback: verification.reasoning
        });

        setTimeout(() => {
          setAfterImageFile(null);
          setAfterImagePreview(null);
          setVerificationFeedback(null);
        }, 4000);
      } else {
        setVerificationError(`AI Verification Failed: ${verification.reasoning}`);
      }
    } catch (err: any) {
      console.error(err);
      setVerificationError(err.message || 'Error executing AI resolution comparison.');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadReport = () => {
    if (!selectedIssue) return;
    const rtiText = `SMART CITY OPERATIONS CENTER - INCIDENT REPORT
Case ID: ${selectedIssue.id}
Category: ${selectedIssue.category}
Status: ${selectedIssue.status.toUpperCase()}
Priority Score: ${selectedIssue.priority_score}/100
GPS Coordinates: ${selectedIssue.lat.toFixed(6)}, ${selectedIssue.lng.toFixed(6)}
Routed Department: ${selectedIssue.department}
Assigned Officer: ${selectedIssue.assigned_officer || 'Unassigned'}
Estimated Repair Budget: ₹${parseCost(selectedIssue.estimated_cost).toLocaleString()}
SLA Hours: ${selectedIssue.sla_hours} hrs
Created At: ${new Date(selectedIssue.created_at).toLocaleString()}
Reporter: ${selectedIssue.reporter_name || 'Anonymous Citizen'}

AI Summary:
${selectedIssue.official_summary || 'No AI summary generated.'}

Citizen Description:
${selectedIssue.description}`;

    const blob = new Blob([rtiText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Incident_Report_Case_${selectedIssue.id.substring(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSlaRemainingHours = (slaDueAtStr: string, status: string) => {
    if (!slaDueAtStr) return 0;
    if (status === 'resolved') return 0;
    const dueDate = new Date(slaDueAtStr);
    const diffHrs = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60));
    return diffHrs;
  };

  // Filter Issues
  const filteredList = issues.filter(issue => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (issue.id || '').toLowerCase().includes(term) ||
      (issue.title || '').toLowerCase().includes(term) ||
      (issue.description || '').toLowerCase().includes(term) ||
      (issue.reporter_name || '').toLowerCase().includes(term) ||
      (issue.reporter_email || '').toLowerCase().includes(term) ||
      (issue.assigned_officer || '').toLowerCase().includes(term) ||
      (issue.department || '').toLowerCase().includes(term) ||
      `${issue.lat.toFixed(4)},${issue.lng.toFixed(4)}`.includes(term);

    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchesDept = deptFilter === 'all' || issue.department === deptFilter;
    const matchesCat = categoryFilter === 'all' || issue.category === categoryFilter;
    
    let matchesPriority = true;
    if (priorityFilter === 'high') matchesPriority = (issue.priority_score || 0) >= 70;
    else if (priorityFilter === 'medium') matchesPriority = (issue.priority_score || 0) < 70 && (issue.priority_score || 0) >= 40;
    else if (priorityFilter === 'low') matchesPriority = (issue.priority_score || 0) < 40;

    let matchesConfidence = true;
    if (confidenceFilter === 'high') matchesConfidence = (issue.confidence || 0.8) >= 0.85;
    else if (confidenceFilter === 'medium') matchesConfidence = (issue.confidence || 0.8) < 0.85 && (issue.confidence || 0.8) >= 0.65;
    else if (confidenceFilter === 'low') matchesConfidence = (issue.confidence || 0.8) < 0.65;

    return matchesSearch && matchesStatus && matchesDept && matchesCat && matchesPriority && matchesConfidence;
  });

  // Calculate Metrics
  const openCases = issues.filter(i => i.status === 'pending').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const escalatedCount = issues.filter(i => i.escalated).length;
  const activeDepts = new Set(issues.map(i => i.department).filter(Boolean)).size || 4;
  const totalCost = issues.reduce((sum, i) => sum + parseCost(i.estimated_cost), 0);
  const avgSlaHours = issues.length > 0 ? Math.round(issues.reduce((sum, i) => sum + (i.sla_hours || 72), 0) / issues.length) : 72;
  const avgConfidence = issues.length > 0 ? Math.round((issues.reduce((sum, i) => sum + (i.confidence || 0.85), 0) / issues.length) * 100) : 85;

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        minHeight: 'calc(100vh - 70px)',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #070707, #0e0e0e)',
        padding: '2rem 1rem'
      }}>
        {/* Centered Glass Authentication Card */}
        <div 
          className="card"
          style={{
            maxWidth: '450px',
            width: '100%',
            padding: '3rem 2.5rem',
            background: 'rgba(12, 12, 12, 0.72)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            textAlign: 'center',
            opacity: isAuthCardVisible ? 1 : 0,
            transform: isAuthCardVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'hsl(var(--primary))',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            marginBottom: '1.5rem'
          }}>
            <Shield size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, fontFamily: 'Outfit', color: 'white', margin: '0 0 0.5rem 0' }}>
            Authority Administration Portal
          </h2>
          <p style={{ color: '#a3a3a3', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Restricted access for verified municipal authorities.
          </p>

          <form onSubmit={handleUnlockPortal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#737373', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password PIN
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#737373' }} />
                <input 
                  id="auth-password"
                  type="password" 
                  className="input-field"
                  placeholder="Enter administrator PIN"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontSize: '0.88rem' }}
                  required
                />
              </div>
            </div>

            {authError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.6rem', borderRadius: '8px', fontSize: '0.78rem' }}>
                {authError}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={authLoading}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              {authLoading ? <Loader2 size={16} className="spin" /> : 'Unlock Portal'}
            </button>

            <button 
              type="button" 
              onClick={handleDemoLogin}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
            >
              Demo Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: 'calc(100vh - 100px)', 
      background: '#070707', 
      color: '#e5e7eb', 
      fontFamily: 'Inter, sans-serif',
      padding: '1.5rem',
      gap: '1.5rem'
    }}>
      
      {/* Top Operations Header Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ShieldCheck size={26} color="hsl(var(--primary))" /> Smart City Command Console
          </h1>
          <p style={{ color: '#737373', fontSize: '0.82rem', marginTop: '0.15rem' }}>
            Real-time municipal dispatch logs, AI-driven de-duplication telemetry, and resolution proof audits.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={fetchIssuesAndEscalate}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 600 }}
          >
            <RefreshCw size={13} className={syncing ? 'spin' : ''} /> Force Synced Check
          </button>
        </div>
      </div>

      {/* Identical KPI Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.85rem' }}>
        {[
          { label: 'OPEN CASES', val: openCases, trend: '+4%', graph: 'M0,18 L10,15 L20,17 L30,5 L40,12 L50,6 L60,8', color: '#eab308' },
          { label: 'RESOLVED TODAY', val: resolvedCount, trend: '+12%', graph: 'M0,15 L10,18 L20,12 L30,14 L40,5 L50,8 L60,2', color: '#10b981' },
          { label: 'CRITICAL SLA', val: escalatedCount, trend: '-2%', graph: 'M0,5 L10,9 L20,6 L30,15 L40,12 L50,18 L60,16', color: '#ef4444' },
          { label: 'DEPTS ACTIVE', val: activeDepts, trend: 'Stable', graph: 'M0,12 L10,12 L20,12 L30,12 L40,12 L50,12 L60,12', color: '#3b82f6' },
          { label: 'BUDGET TODAY', val: `₹${totalCost.toLocaleString()}`, trend: '+8%', graph: 'M0,18 L10,12 L20,10 L30,8 L40,6 L50,4 L60,2', color: 'hsl(var(--primary))' },
          { label: 'AVG RESOLUTION', val: `${avgSlaHours} hrs`, trend: '-15%', graph: 'M0,5 L10,10 L20,8 L30,12 L40,15 L50,18 L60,20', color: '#a855f7' },
          { label: 'AI CONFIDENCE', val: `${avgConfidence}%`, trend: '+0.5%', graph: 'M0,16 L10,15 L20,14 L30,12 L40,10 L50,8 L60,5', color: 'hsl(var(--primary))' }
        ].map((kpi, idx) => (
          <div key={idx} style={{ 
            background: 'rgba(12, 12, 12, 0.72)', 
            backdropFilter: 'blur(12px)', 
            border: '1px solid rgba(255,255,255,0.06)', 
            padding: '0.85rem 1rem', 
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: '#737373', fontWeight: 800, letterSpacing: '0.05em' }}>{kpi.label}</span>
              <span style={{ fontSize: '0.62rem', color: kpi.trend.includes('-') ? '#ef4444' : '#10b981', fontWeight: 700 }}>{kpi.trend}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', fontFamily: 'Outfit' }}>{kpi.val}</span>
              <svg width="45" height="18" style={{ opacity: 0.45 }}>
                <path d={kpi.graph} fill="none" stroke={kpi.color} strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Global Search & Filters Toolbar */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        alignItems: 'center', 
        background: 'rgba(12, 12, 12, 0.45)', 
        padding: '0.75rem 1rem', 
        borderRadius: '16px', 
        border: '1px solid rgba(255,255,255,0.04)',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#737373' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search cases by ID, Landmark, Citizen, Officer, Coordinates..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '0.78rem', padding: '0.45rem 1rem 0.45rem 2.2rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.76rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem' }}
          >
            <option value="all">🔍 All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.76rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem' }}
          >
            <option value="all">📁 All Categories</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select 
            value={deptFilter} 
            onChange={(e) => setDeptFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.76rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem' }}
          >
            <option value="all">🏛️ All Departments</option>
            {Array.from(new Set(issues.map(i => i.department).filter(Boolean))).map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.76rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem' }}
          >
            <option value="all">⚡ All Priority</option>
            <option value="high">High Score (&gt;=70)</option>
            <option value="medium">Medium Score (40-69)</option>
            <option value="low">Low Score (&lt;40)</option>
          </select>

          <select 
            value={confidenceFilter} 
            onChange={(e) => setConfidenceFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.76rem', padding: '0.4rem 1.5rem 0.4rem 0.75rem' }}
          >
            <option value="all">🤖 AI Confidence</option>
            <option value="high">High (&gt;=85%)</option>
            <option value="medium">Medium (65-84%)</option>
            <option value="low">Low (&lt;65%)</option>
          </select>
        </div>
      </div>

      {/* CORE THREE-PANEL LAYOUT */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '25% 45% 30%', 
        gap: '1.25rem',
        flex: 1,
        minHeight: '520px'
      }}>
        
        {/* LEFT PANEL (25%): Incident Queue */}
        <div style={{ 
          background: 'rgba(12, 12, 12, 0.45)', 
          border: '1px solid rgba(255,255,255,0.05)', 
          borderRadius: '20px', 
          display: 'flex', 
          flexDirection: 'column',
          maxHeight: '680px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>AI INCIDENT QUEUE ({filteredList.length})</span>
            <SlidersHorizontal size={14} color="#737373" />
          </div>

          <div style={{ overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {filteredList.map(issue => {
              const isSelected = selectedIssue?.id === issue.id;
              const priorityCol = issue.priority_score >= 70 ? '#ef4444' : issue.priority_score >= 40 ? '#eab308' : '#10b981';
              return (
                <div 
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setAssignedOfficer(issue.assigned_officer || '');
                    setRepairCost(issue.estimated_cost ? String(parseCost(issue.estimated_cost)) : '');
                    setRepairNotes(issue.resolution_feedback || '');
                    setAfterImagePreview(null);
                    setVerificationFeedback(null);
                    setVerificationError(null);
                  }}
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'rgba(18, 18, 18, 0.6)',
                    border: isSelected ? '1px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.04)',
                    padding: '0.85rem',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none'
                  }}
                  className="queue-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <span className="badge" style={{ background: `${priorityCol}15`, color: priorityCol, fontSize: '0.62rem', fontWeight: 800 }}>
                      Priority {issue.priority_score || 25}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#737373' }}>
                      {getSlaRemainingHours(issue.sla_due_at, issue.status) <= 0 ? 'Overdue' : `${getSlaRemainingHours(issue.sla_due_at, issue.status)}h left`}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', marginBottom: '0.4rem', lineHeight: 1.3 }}>{issue.title}</h4>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#a3a3a3' }}>
                    <span>{issue.category}</span>
                    <span style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>AI Conf: {Math.round((issue.confidence || 0.8) * 100)}%</span>
                  </div>

                  {issue.estimated_cost && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: '#737373', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Est Budget:</span>
                      <span style={{ fontWeight: 700, color: '#f4f4f5' }}>₹{parseCost(issue.estimated_cost).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#737373', fontSize: '0.78rem' }}>No queue tickets found.</div>
            )}
          </div>
        </div>

        {/* CENTER PANEL (45%): Operations Table & Feed */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          maxHeight: '680px'
        }}>
          
          {/* Main Grid Table */}
          <div style={{ 
            background: 'rgba(12, 12, 12, 0.45)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '20px', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>MUNICIPAL OPERATIONS TRACKER</span>
              <span style={{ fontSize: '0.68rem', color: '#737373' }}>Showing {filteredList.length} of {issues.length} total entries</span>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#737373', fontSize: '0.65rem', fontWeight: 800 }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>CASE ID</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>CATEGORY</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>PRIORITY</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>DEPT</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>OFFICER</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>BUDGET</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(issue => {
                    const isSelected = selectedIssue?.id === issue.id;
                    const priorityCol = issue.priority_score >= 70 ? '#ef4444' : issue.priority_score >= 40 ? '#eab308' : '#10b981';
                    return (
                      <tr 
                        key={issue.id}
                        onClick={() => {
                          setSelectedIssue(issue);
                          setAssignedOfficer(issue.assigned_officer || '');
                          setRepairCost(issue.estimated_cost ? String(parseCost(issue.estimated_cost)) : '');
                          setRepairNotes(issue.resolution_feedback || '');
                          setAfterImagePreview(null);
                          setVerificationFeedback(null);
                          setVerificationError(null);
                        }}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.02)',
                          background: isSelected ? 'rgba(255,255,255,0.02)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        className="hover-row"
                      >
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#a3a3a3' }}>#{issue.id.substring(0, 8)}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'white' }}>{issue.category}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ color: priorityCol, fontWeight: 700 }}>{issue.priority_score || 25}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'hsl(var(--primary))' }}>{issue.department?.replace('Department', '').replace('Board', '') || 'General'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#a3a3a3' }}>{issue.assigned_officer || 'Unassigned'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>₹{parseCost(issue.estimated_cost).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge badge-${issue.status}`} style={{ fontSize: '0.62rem' }}>{issue.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Feed: Live Activity Logs */}
          <div style={{ 
            background: 'rgba(12, 12, 12, 0.72)', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '20px', 
            padding: '1rem',
            height: '140px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#737373', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>LIVE DISPATCH ACTIVITY LOGS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', overflowY: 'auto', flex: 1 }}>
              {activityLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#a3a3a3', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: log.type === 'warning' ? '#ef4444' : log.type === 'success' ? '#10b981' : 'hsl(var(--primary))' }} />
                    <span>{log.text}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#737373' }}>{log.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL (30%): Incident Inspector Panel */}
        <div style={{ 
          background: 'rgba(12, 12, 12, 0.72)', 
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.06)', 
          borderRadius: '20px', 
          padding: '1.25rem',
          display: 'flex', 
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '680px',
          overflowY: 'auto'
        }}>
          {selectedIssue ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>COMPLAINT AUDITOR</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#737373' }}>#{selectedIssue.id.substring(0, 8)}</span>
              </div>

              {/* Before/After Visual proof comparator */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: '#737373', fontWeight: 700, marginBottom: '0.25rem' }}>BEFORE FILE</span>
                  {selectedIssue.image_url ? (
                    <img src={selectedIssue.image_url} alt="Before" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ height: '90px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>No Image</div>
                  )}
                </div>

                <div>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: '0.25rem' }}>AFTER FIX</span>
                  {selectedIssue.after_image_url ? (
                    <img src={selectedIssue.after_image_url} alt="After" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--accent))' }} />
                  ) : afterImagePreview ? (
                    <div style={{ position: 'relative' }}>
                      <img src={afterImagePreview} alt="After Preview" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px' }} />
                      <button
                        onClick={handleRemoveAfterImage}
                        title="Remove this photo"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontSize: '0.6rem',
                          fontWeight: 800
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => document.getElementById('after-fix-upload')?.click()}
                      style={{ height: '90px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '0.2rem' }}
                    >
                      <Camera size={14} color="#737373" />
                      <span style={{ fontSize: '0.6rem', color: '#737373' }}>Upload Fix</span>
                    </div>
                  )}
                  <input id="after-fix-upload" type="file" accept="image/*" onChange={handleAfterImageChange} style={{ display: 'none' }} />
                </div>
              </div>

              {/* AI Verification execution alerts */}
              {verificationFeedback && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', color: 'hsl(var(--accent))', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {verificationFeedback}
                </div>
              )}
              {verificationError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {verificationError}
                </div>
              )}

              {/* AI verification triggers */}
              {afterImagePreview && !selectedIssue.after_image_url && (
                <button 
                  onClick={handleVerifyResolution}
                  disabled={verifying}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  {verifying ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Compare proof with AI
                </button>
              )}

              {/* Palantir Styled GIS Radar Canvas Map */}
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#737373', fontWeight: 700, marginBottom: '0.25rem' }}>TACTICAL COORDINATE RADAR</span>
                <div style={{ 
                  height: '110px', 
                  background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, rgba(7,7,7,0.9) 100%)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    width: '70px', 
                    height: '70px', 
                    border: '1px dashed rgba(16, 185, 129, 0.15)', 
                    borderRadius: '50%',
                    animation: 'spin 12s linear infinite' 
                  }} />
                  <MapPin size={22} color="hsl(var(--primary))" style={{ zIndex: 2, filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }} />
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'white', marginTop: '0.5rem', zIndex: 2 }}>
                    GPS: {selectedIssue.lat.toFixed(5)}, {selectedIssue.lng.toFixed(5)}
                  </span>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedIssue.lat},${selectedIssue.lng}`}
                    target="_blank" 
                    rel="noreferrer"
                    style={{ fontSize: '0.6rem', color: 'hsl(var(--primary))', marginTop: '0.2rem', textDecoration: 'underline', zIndex: 2 }}
                  >
                    Open in Full Google Maps
                  </a>
                </div>
              </div>

              {/* AI assessment info */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.72rem' }}>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#737373', fontWeight: 700, marginBottom: '0.25rem' }}>AI ROUTING MEMO</span>
                <p style={{ color: '#d1d5db', lineHeight: 1.4, margin: 0 }}>
                  {selectedIssue.official_summary || 'No summary registered.'}
                </p>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#a3a3a3', fontSize: '0.58rem' }}>
                    Confidence: {Math.round((selectedIssue.confidence || 0.85) * 100)}%
                  </span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#a3a3a3', fontSize: '0.58rem' }}>
                    SLA Duty: {selectedIssue.sla_hours || 72} hrs
                  </span>
                </div>
              </div>

              {/* Citizen description */}
              <div style={{ fontSize: '0.74rem' }}>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#737373', fontWeight: 700, marginBottom: '0.25rem' }}>CITIZEN DISPATCH MESSAGE</span>
                <p style={{ color: '#a3a3a3', lineHeight: 1.4, margin: 0 }}>{selectedIssue.description}</p>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#737373', marginTop: '0.25rem' }}>
                  Reported by: {selectedIssue.reporter_name || 'Anonymous Citizen'}
                </span>
              </div>

              {/* Form dispatch work order */}
              <form onSubmit={handleAssignOfficerAndCost} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.25rem', display: 'block' }}>
                  DISPATCH WORK ORDER
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor="inspector-officer" style={{ display: 'block', fontSize: '0.62rem', color: '#737373', marginBottom: '0.15rem' }}>OFFICER</label>
                    <input 
                      id="inspector-officer"
                      type="text" 
                      className="input-field" 
                      placeholder="Engineer name"
                      value={assignedOfficer}
                      onChange={(e) => setAssignedOfficer(e.target.value)}
                      style={{ fontSize: '0.7rem', padding: '0.35rem' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="inspector-cost" style={{ display: 'block', fontSize: '0.62rem', color: '#737373', marginBottom: '0.15rem' }}>EST REPAIR (₹)</label>
                    <input 
                      id="inspector-cost"
                      type="number" 
                      className="input-field" 
                      placeholder="Cost"
                      value={repairCost}
                      onChange={(e) => setRepairCost(e.target.value)}
                      style={{ fontSize: '0.7rem', padding: '0.35rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="inspector-notes" style={{ display: 'block', fontSize: '0.62rem', color: '#737373', marginBottom: '0.15rem' }}>REPAIR WORK NOTES</label>
                  <textarea 
                    id="inspector-notes"
                    className="input-field" 
                    placeholder="Describe repair milestones..."
                    rows={2}
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    style={{ fontSize: '0.7rem', padding: '0.35rem', resize: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.45rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', width: '100%' }}
                >
                  <Wrench size={12} /> Dispatch & Update Order
                </button>
              </form>

              {/* Quick Actions Panel */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleStatusChange(selectedIssue.id, 'in_progress')}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.72rem' }}
                  disabled={selectedIssue.status === 'resolved'}
                >
                  In Progress
                </button>
                {selectedIssue.resolution_verified ? (
                  <button 
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.72rem', opacity: 1 }}
                    disabled
                  >
                    ✓ Verified & Resolved
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (!selectedIssue.after_image_url && !afterImagePreview) {
                        alert('You must upload an after-fix photo and pass AI verification before resolving.');
                        return;
                      }
                      if (!selectedIssue.resolution_verified && !verificationFeedback) {
                        alert('AI verification is mandatory. Click "Compare proof with AI" first.');
                        return;
                      }
                      handleStatusChange(selectedIssue.id, 'resolved');
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.72rem' }}
                  >
                    Resolve
                  </button>
                )}
                <button 
                  onClick={handleDownloadReport}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', padding: 0 }}
                  title="Download Grievance Report"
                >
                  <FileText size={14} />
                </button>
              </div>
              {!selectedIssue.resolution_verified && selectedIssue.status !== 'resolved' && (
                <div style={{ fontSize: '0.62rem', color: '#eab308', background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.1)', padding: '0.4rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertTriangle size={11} /> Resolution requires uploading an after-fix photo and passing AI verification.
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#737373', fontSize: '0.78rem', marginTop: '4rem' }}>
              Select an incident from the operations tracker to load the inspector panel.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
