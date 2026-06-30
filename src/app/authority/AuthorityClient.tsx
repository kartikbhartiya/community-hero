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

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'operations' | 'summary'>('operations');

  // Database lists
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Selected issue details
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [repairCost, setRepairCost] = useState<string>('');
  const [repairNotes, setRepairNotes] = useState('');

  // AI Dispatch Plan states
  const [aiPlan, setAiPlan] = useState<any | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

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

  const handleGeneratePlan = async () => {
    if (!selectedIssue) return;
    setGeneratingPlan(true);
    try {
      const res = await fetch('/api/authority/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedIssue.title,
          description: selectedIssue.description,
          category: selectedIssue.category,
          severity: selectedIssue.severity
        })
      });
      if (res.ok) {
        const plan = await res.json();
        setAiPlan(plan);
        if (plan.suggested_officer) setAssignedOfficer(plan.suggested_officer);
        if (plan.suggested_cost) setRepairCost(String(plan.suggested_cost));
        if (plan.dispatch_memo) {
          setRepairNotes(`AI DISPATCH MEMO: ${plan.dispatch_memo}\n\nMilestones:\n${plan.milestones.map((m: string) => `- ${m}`).join('\n')}\n\nMaterials Required:\n${plan.materials.map((m: string) => `- ${m}`).join('\n')}`);
        }
      }
    } catch (err) {
      console.error('Plan generation failed:', err);
    } finally {
      setGeneratingPlan(false);
    }
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
  const openCases = issues.filter(i => i.status === 'pending' || i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const escalatedCount = issues.filter(i => i.escalated).length;
  const activeDepts = new Set(issues.map(i => i.department).filter(Boolean)).size || 4;
  const totalCost = issues.reduce((sum, i) => sum + parseCost(i.estimated_cost), 0);
  const avgSlaHours = issues.length > 0 ? Math.round(issues.reduce((sum, i) => sum + (i.sla_hours || 72), 0) / issues.length) : 72;
  const avgConfidence = issues.length > 0 ? Math.round((issues.reduce((sum, i) => sum + (i.confidence || 0.85), 0) / issues.length) * 100) : 85;

  // Custom Summary Analytics Calculations
  const categoryCounts = issues.reduce((acc: any, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 6);

  const deptStats = issues.reduce((acc: any, i) => {
    const dept = i.department || 'General';
    if (!acc[dept]) acc[dept] = { total: 0, pending: 0, resolved: 0, cost: 0 };
    acc[dept].total++;
    if (i.status === 'resolved') acc[dept].resolved++;
    else acc[dept].pending++;
    acc[dept].cost += parseCost(i.estimated_cost);
    return acc;
  }, {} as Record<string, { total: number; pending: number; resolved: number; cost: number }>);

  const severityCounts = issues.reduce((acc: any, i) => {
    const sev = i.severity || 'Medium';
    acc[sev] = (acc[sev] || 0) + 1;
    return acc;
  }, { High: 0, Medium: 0, Low: 0, Critical: 0 } as Record<string, number>);

  const hotspotSummary = issues
    .filter(i => (i.duplicate_count || 0) > 0 || i.upvotes > 2)
    .sort((a, b) => ((b.duplicate_count || 0) + b.upvotes) - ((a.duplicate_count || 0) + a.upvotes))
    .slice(0, 5);

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        minHeight: 'calc(100vh - 70px)',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background)',
        padding: '2rem 1rem'
      }}>
        {/* Centered Glass Authentication Card */}
        <div 
          className="card"
          style={{
            maxWidth: '450px',
            width: '100%',
            padding: '3rem 2.5rem',
            background: 'var(--card)',
            border: '1px solid var(--border-strong)',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
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
            background: 'var(--accent-tint)',
            color: 'var(--accent)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            marginBottom: '1.5rem'
          }}>
            <Shield size={32} />
          </div>
          
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--foreground)', margin: '0 0 0.5rem 0' }}>
            Authority Administration Portal
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Restricted access for verified municipal authorities.
          </p>
 
          <form onSubmit={handleUnlockPortal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label htmlFor="auth-password" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--foreground-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password PIN
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
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
              <div style={{ background: 'rgb(var(--destructive-rgb) / 0.08)', border: '1px solid rgb(var(--destructive-rgb) / 0.15)', color: 'var(--destructive)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.78rem' }}>
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
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', border: '1px solid var(--border)', background: 'var(--background-secondary)' }}
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
      background: 'var(--background)', 
      color: 'var(--foreground)', 
      fontFamily: 'Inter, sans-serif',
      padding: '1.5rem',
      gap: '1.5rem'
    }}>
      
      {/* Top Operations Header Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ShieldCheck size={26} color="var(--accent)" /> Smart City Command Console
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
            Real-time municipal dispatch logs, AI-driven de-duplication telemetry, and resolution proof audits.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--card-2)',
            padding: '0.2rem',
            borderRadius: '99px',
            border: '1px solid var(--border)'
          }}>
            <button
              onClick={() => setActiveTab('operations')}
              style={{
                background: activeTab === 'operations' ? 'var(--nav-link-active-bg)' : 'transparent',
                color: activeTab === 'operations' ? 'var(--nav-link-active-color)' : 'var(--muted)',
                border: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '99px',
                fontSize: '0.75rem',
                fontWeight: 700,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              Operations Console
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              style={{
                background: activeTab === 'summary' ? 'var(--nav-link-active-bg)' : 'transparent',
                color: activeTab === 'summary' ? 'var(--nav-link-active-color)' : 'var(--muted)',
                border: 'none',
                padding: '0.4rem 1rem',
                borderRadius: '99px',
                fontSize: '0.75rem',
                fontWeight: 700,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              Summary Analytics
            </button>
          </div>

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
          { label: 'OPEN CASES', val: openCases, trend: '+4%', graph: 'M0,18 L10,15 L20,17 L30,5 L40,12 L50,6 L60,8', color: 'var(--warning)' },
          { label: 'RESOLVED TODAY', val: resolvedCount, trend: '+12%', graph: 'M0,15 L10,18 L20,12 L30,14 L40,5 L50,8 L60,2', color: 'var(--accent)' },
          { label: 'CRITICAL SLA', val: escalatedCount, trend: '-2%', graph: 'M0,5 L10,9 L20,6 L30,15 L40,12 L50,18 L60,16', color: 'var(--destructive)' },
          { label: 'DEPTS ACTIVE', val: activeDepts, trend: 'Stable', graph: 'M0,12 L10,12 L20,12 L30,12 L40,12 L50,12 L60,12', color: '#3b82f6' },
          { label: 'BUDGET TODAY', val: `₹${totalCost.toLocaleString()}`, trend: '+8%', graph: 'M0,18 L10,12 L20,10 L30,8 L40,6 L50,4 L60,2', color: 'var(--primary)' },
          { label: 'AVG RESOLUTION', val: `${avgSlaHours} hrs`, trend: '-15%', graph: 'M0,5 L10,10 L20,8 L30,12 L40,15 L50,18 L60,20', color: '#a855f7' },
          { label: 'AI CONFIDENCE', val: `${avgConfidence}%`, trend: '+0.5%', graph: 'M0,16 L10,15 L20,14 L30,12 L40,10 L50,8 L60,5', color: 'var(--primary)' }
        ].map((kpi, idx) => (
          <div key={idx} style={{ 
            background: 'rgb(var(--card-rgb) / 0.72)', 
            backdropFilter: 'blur(12px)', 
            border: '1px solid var(--surface-hover)', 
            padding: '0.85rem 1rem', 
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.05em' }}>{kpi.label}</span>
              <span style={{ fontSize: '0.62rem', color: kpi.trend.includes('-') ? 'var(--destructive)' : 'var(--accent)', fontWeight: 700 }}>{kpi.trend}</span>
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
        background: 'rgb(var(--card-rgb) / 0.45)', 
        padding: '0.75rem 1rem', 
        borderRadius: '16px', 
        border: '1px solid var(--surface-hover)',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
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

      {activeTab === 'operations' ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '25% 45% 30%', 
          gap: '1.25rem',
          flex: 1,
          minHeight: '520px'
        }}>
          
          {/* LEFT PANEL (25%): Incident Queue */}
          <div style={{ 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
            borderRadius: '20px', 
            display: 'flex', 
            flexDirection: 'column',
            maxHeight: '680px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '0.05em' }}>AI INCIDENT QUEUE ({filteredList.length})</span>
              <SlidersHorizontal size={14} color="var(--muted)" />
            </div>

            <div style={{ overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {filteredList.map((issue) => {
                const isSelected = selectedIssue?.id === issue.id;
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
                      setAiPlan(null);
                    }}
                    style={{
                      background: isSelected ? 'var(--accent-tint)' : 'var(--background-secondary)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`badge ${issue.status === 'resolved' ? 'badge-resolved' : issue.status === 'in_progress' ? 'badge-in_progress' : 'badge-pending'}`} style={{ fontSize: '0.58rem' }}>
                        {issue.status}
                      </span>
                      <span style={{ fontSize: '0.58rem', color: 'var(--muted)', fontWeight: 600 }}>
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                      {issue.title}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--muted)' }}>
                      <span>Category: {issue.category}</span>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Priority: {issue.priority_score || 0}</span>
                    </div>

                    {issue.estimated_cost && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Est Budget:</span>
                        <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>₹{parseCost(issue.estimated_cost).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredList.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', padding: '2rem 1rem' }}>
                  No issues match the active filter criteria.
                </div>
              )}
            </div>
          </div>

          {/* CENTER PANEL (45%): Operations Table */}
          <div style={{ 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
            borderRadius: '20px', 
            display: 'flex', 
            flexDirection: 'column',
            maxHeight: '680px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '0.05em' }}>MUNICIPAL TRACKER</span>
              <span className="badge badge-resolved" style={{ fontSize: '0.6rem' }}>
                {issues.filter(i => i.status === 'resolved').length} RESOLVED
              </span>
            </div>

            <div style={{ overflow: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--background-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontWeight: 700 }}>CASE ID</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontWeight: 700 }}>LANDMARK</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontWeight: 700 }}>DEPT</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontWeight: 700 }}>OFFICER</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontWeight: 700 }}>ESTIMATED (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--muted)', fontWeight: 700 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((issue) => {
                    const isSelected = selectedIssue?.id === issue.id;
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
                          setAiPlan(null);
                        }}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-tint)' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--foreground)' }}>#{issue.id?.substring(0, 8)}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--foreground-secondary)' }}>{issue.title}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--accent)' }}>{issue.department?.replace('Department', '').replace('Board', '') || 'General'}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--foreground-secondary)' }}>{issue.assigned_officer || 'Unassigned'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>₹{parseCost(issue.estimated_cost).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className={`badge ${issue.status === 'resolved' ? 'badge-resolved' : issue.status === 'in_progress' ? 'badge-in_progress' : 'badge-pending'}`} style={{ fontSize: '0.62rem' }}>{issue.status}</span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        No dispatch files catalogued.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT PANEL (30%): Incident Inspector */}
          <div style={{ 
            background: 'var(--card)', 
            border: '1px solid var(--border)', 
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--foreground)' }}>INCIDENT OVERVIEW</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>#{selectedIssue.id?.substring(0, 8)}</span>
                </div>

                {/* Imagery Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.50rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.25rem' }}>BEFORE FIX</span>
                    <img src={selectedIssue.image_url} alt="Before" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.25rem' }}>AFTER FIX</span>
                    {selectedIssue.after_image_url ? (
                      <img src={selectedIssue.after_image_url} alt="After" style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--accent)' }} />
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
                            background: 'rgb(var(--destructive-rgb) / 0.9)',
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
                        style={{ height: '90px', border: '2px dashed var(--border-strong)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '0.2rem', background: 'var(--card-2)' }}
                      >
                        <Camera size={14} color="var(--muted)" />
                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Upload Fix</span>
                      </div>
                    )}
                    <input id="after-fix-upload" type="file" accept="image/*" onChange={handleAfterImageChange} style={{ display: 'none' }} />
                  </div>
                </div>

                {/* Compare AI proof */}
                {afterImagePreview && !selectedIssue.after_image_url && (
                  <button 
                    onClick={handleVerifyResolution}
                    className="btn btn-primary"
                    disabled={verifying}
                    style={{ width: '100%', padding: '0.45rem', fontSize: '0.74rem' }}
                  >
                    {verifying ? <Loader2 size={12} className="spin" /> : 'Compare proof with AI'}
                  </button>
                )}

                {/* Verification result details */}
                {verificationError && (
                  <div style={{ background: 'rgb(var(--destructive-rgb) / 0.08)', border: '1px solid rgb(var(--destructive-rgb) / 0.15)', color: 'var(--destructive)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.70rem' }}>
                    {verificationError}
                  </div>
                )}
                {verificationFeedback && (
                  <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.70rem' }}>
                    <strong>AI Verification Agent verdict:</strong> {verificationFeedback}
                  </div>
                )}

                {/* Details list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Title:</span>
                    <strong style={{ color: 'var(--foreground)' }}>{selectedIssue.title}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Department:</span>
                    <strong style={{ color: 'var(--foreground)' }}>{selectedIssue.department}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--muted)' }}>Risk Rating:</span>
                    <strong style={{ color: selectedIssue.severity === 'High' || selectedIssue.severity === 'Critical' ? 'var(--destructive)' : 'var(--warning)' }}>
                      {selectedIssue.severity || 'Medium'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--muted)' }}>AI Score:</span>
                    <strong style={{ color: 'var(--foreground)' }}>{selectedIssue.priority_score || 0} / 100</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem', flexWrap: 'wrap', gap: '0.2rem' }}>
                    <span className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--muted)', fontSize: '0.58rem' }}>
                      Confidence: {Math.round((selectedIssue.confidence || 0.85) * 100)}%
                    </span>
                    <span className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--muted)', fontSize: '0.58rem' }}>
                      SLA Duty: {selectedIssue.sla_hours || 72} hrs
                    </span>
                  </div>
                </div>

                {/* Citizen description */}
                <div style={{ fontSize: '0.74rem' }}>
                  <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.25rem' }}>CITIZEN DISPATCH MESSAGE</span>
                  <p style={{ color: 'var(--foreground-secondary)', lineHeight: 1.4, margin: 0 }}>{selectedIssue.description}</p>
                  <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    Reported by: {selectedIssue.reporter_name || 'Anonymous Citizen'}
                  </span>
                </div>

                {/* AI Dispatch Copilot */}
                <div style={{ 
                  background: 'var(--accent-tint)', 
                  border: '1px solid var(--accent)', 
                  padding: '0.85rem', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sparkles size={13} /> AI DISPATCH COPILOT
                    </span>
                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      disabled={generatingPlan}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      {generatingPlan ? <Loader2 size={10} className="spin" /> : 'Generate Action Plan'}
                    </button>
                  </div>
                  {aiPlan ? (
                    <div style={{ fontSize: '0.68rem', color: 'var(--foreground)', display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid rgb(var(--accent-rgb) / 0.2)', paddingTop: '0.4rem' }}>
                      <div><strong style={{ color: 'var(--accent)' }}>Recommended Officer:</strong> {aiPlan.suggested_officer}</div>
                      <div><strong style={{ color: 'var(--accent)' }}>Suggested Budget:</strong> ₹{aiPlan.suggested_cost?.toLocaleString()}</div>
                      <div><strong style={{ color: 'var(--accent)' }}>Materials:</strong> {aiPlan.materials?.join(', ')}</div>
                      <div style={{ fontStyle: 'italic', color: 'var(--muted)', marginTop: '0.1rem' }}>"{aiPlan.dispatch_memo}"</div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
                      Analyze complaint description with AI to autofill officer, materials, budget & notes.
                    </span>
                  )}
                </div>

                {/* Form dispatch work order */}
                <form onSubmit={handleAssignOfficerAndCost} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'var(--card-2)', border: '1px solid var(--border)', padding: '0.85rem', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--foreground)', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', display: 'block' }}>
                    DISPATCH WORK ORDER
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label htmlFor="inspector-officer" style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>OFFICER</label>
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
                      <label htmlFor="inspector-cost" style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>EST REPAIR (₹)</label>
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
                    <label htmlFor="inspector-notes" style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>REPAIR WORK NOTES</label>
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
                  <div style={{ fontSize: '0.62rem', color: 'var(--warning)', background: 'rgb(var(--warning-rgb) / 0.06)', border: '1px solid rgb(var(--warning-rgb) / 0.1)', padding: '0.4rem 0.6rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertTriangle size={11} /> Resolution requires uploading an after-fix photo and passing AI verification.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem', marginTop: '4rem' }}>
                Select an incident from the operations tracker to load the inspector panel.
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ANALYTICS SUMMARY TAB */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          flex: 1
        }}>
          {/* Category Breakdown (Card) */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--foreground)' }}>INCIDENT VOLUMES BY CATEGORY</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
              {sortedCategories.map(([cat, count]: any) => {
                const pct = Math.round((count / issues.length) * 100);
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--foreground-secondary)' }}>{cat}</span>
                      <span style={{ color: 'var(--muted)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--background-secondary)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: '99px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Department Workloads (Card) */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--foreground)' }}>DEPARTMENTAL PERFORMANCE</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
              {Object.entries(deptStats).map(([dept, stat]: any) => {
                const resolvedPct = stat.total > 0 ? Math.round((stat.resolved / stat.total) * 100) : 0;
                return (
                  <div key={dept} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                      <span style={{ color: 'var(--foreground)' }}>{dept}</span>
                      <span style={{ color: 'var(--accent)' }}>{resolvedPct}% Resolved</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)' }}>
                      <span>Active Workload: {stat.pending} cases</span>
                      <span>Total Budget: ₹{stat.cost.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority & Severity Distribution (Card) */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--foreground)' }}>SEVERITY LEVEL MATRIX</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', flex: 1, alignContent: 'center', justifyContent: 'center' }}>
              {Object.entries(severityCounts).map(([sev, count]: any) => {
                let color = 'var(--muted)';
                if (sev === 'Critical') color = '#dc2626';
                else if (sev === 'High') color = 'var(--warning)';
                else if (sev === 'Medium') color = '#3b82f6';
                else if (sev === 'Low') color = 'var(--accent)';

                return (
                  <div key={sev} style={{ flex: '1 1 120px', background: 'var(--background-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>{sev}</span>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color, fontFamily: 'Outfit', marginTop: '0.2rem' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hotspots & Key Citizen Pain Points (Card) */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--foreground)' }}>CRITICAL INCIDENT HOTSPOTS & DUPLICATES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hotspotSummary.length > 0 ? hotspotSummary.map((issue) => (
                <div key={issue.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background-secondary)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--foreground)' }}>{issue.title}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Category: {issue.category} | GPS: {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge" style={{ background: 'rgb(var(--destructive-rgb) / 0.1)', color: 'var(--destructive)', fontSize: '0.62rem' }}>
                      {issue.duplicate_count || 0} Duplicates
                    </span>
                    <span className="badge" style={{ background: 'var(--accent-tint)', color: 'var(--accent)', fontSize: '0.62rem' }}>
                      {issue.upvotes} Upvotes
                    </span>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.82rem' }}>
                  No duplicate clusters detected or heavily upvoted pain points found yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
