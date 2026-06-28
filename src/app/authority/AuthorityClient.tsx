'use client';

import { useState, useEffect } from 'react';
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
  Wrench
} from 'lucide-react';

export default function AuthorityClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthCardVisible, setIsAuthCardVisible] = useState(true);

  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Selected issue for Right Inspector Panel
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [repairCost, setRepairCost] = useState<number | ''>('');

  // Resolution upload states
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Live Activity Feed logs
  const [activityLogs, setActivityLogs] = useState<string[]>([
    'PWD Department dispatched repair vehicle for Station Road pothole.',
    'AI Auto-escalated water leak breach on MG Road to Level 2.',
    'Citizen validated garbage dump complaint on Ward 42.',
    'Sanitation Department resolved street waste pile report.',
    'Horticulture Department generated work order for fallen tree.'
  ]);

  useEffect(() => {
    // Check if token exists in session
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
        await runAutoEscalation(data);
      }
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
      setIssues(issues.map(issue => issue.id === id ? { ...issue, status: newStatus } : issue));
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
      if (repairCost !== '') updates.estimated_cost = Number(repairCost);

      const { error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', selectedIssue.id);

      if (error) throw error;

      alert('Work order generated and officer dispatched.');
      const updatedIssues = issues.map(i => i.id === selectedIssue.id ? { ...i, ...updates } : i);
      setIssues(updatedIssues);
      setSelectedIssue({ ...selectedIssue, ...updates });
    } catch (err: any) {
      alert(err.message || 'Error updating dispatch info.');
    }
  };

  const handleAfterImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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

  const getSlaDetailsText = (slaDueAtStr: string, status: string) => {
    if (!slaDueAtStr) return 'No SLA Set';
    const dueDate = new Date(slaDueAtStr);
    const diffHrs = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60));
    
    if (status === 'resolved') return 'Resolved';
    if (diffHrs < 0) return `Lapsed by ${Math.abs(diffHrs)}h`;
    return `${diffHrs}h remaining`;
  };

  const getPriorityColor = (score: number) => {
    if (score >= 75) return '#ef4444';
    if (score >= 50) return '#eab308';
    return '#10b981';
  };

  // Filter Issues
  const filteredList = issues.filter(issue => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (issue.title || '').toLowerCase().includes(term) ||
      (issue.category || '').toLowerCase().includes(term) ||
      (issue.department || '').toLowerCase().includes(term) ||
      String(issue.id).includes(term);

    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const matchesDept = deptFilter === 'all' || issue.department === deptFilter;
    
    let matchesPriority = true;
    if (priorityFilter === 'high') matchesPriority = (issue.priority_score || 0) >= 70;
    else if (priorityFilter === 'medium') matchesPriority = (issue.priority_score || 0) < 70 && (issue.priority_score || 0) >= 40;
    else if (priorityFilter === 'low') matchesPriority = (issue.priority_score || 0) < 40;

    return matchesSearch && matchesStatus && matchesDept && matchesPriority;
  });

  // Calculate Metrics
  const openCases = issues.filter(i => i.status === 'pending').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const escalatedCount = issues.filter(i => i.escalated).length;
  const activeDepts = new Set(issues.map(i => i.department)).size;
  const totalCost = issues.reduce((sum, i) => sum + (i.estimated_cost || 0), 0);

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
            Authority Operations Portal
          </h2>
          <p style={{ color: '#a3a3a3', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            Restricted access for verified municipal authorities.
          </p>

          <form onSubmit={handleUnlockPortal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label htmlFor="portal-password" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#737373', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Secure Access PIN
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#737373' }} />
                <input 
                  id="portal-password"
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
              {authLoading ? <Loader2 size={16} className="spin" /> : 'Unlock Operations Desk'}
            </button>

            <button 
              type="button" 
              onClick={handleDemoLogin}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
            >
              Demo Quick Entry
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', background: '#070707', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar Command Console */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 'calc(100vw - 440px)' }}>
        
        {/* Command Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, fontFamily: 'Outfit', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ShieldCheck size={28} color="hsl(var(--primary))" /> Smart City Operations Desk
            </h1>
            <p style={{ color: '#737373', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Municipal oversight, SLA auto-escalation, and AI before/after fix verification control panel.
            </p>
          </div>

          <button 
            onClick={fetchIssuesAndEscalate}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 1.25rem', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} /> Synchronize Live Database
          </button>
        </div>

        {/* Top Operational Metrics in Glass Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          <div style={{ background: 'rgba(12, 12, 12, 0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '16px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#737373', fontWeight: 700, letterSpacing: '0.03em' }}>OPEN COMPLAINTS</span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'white', display: 'block', marginTop: '0.25rem' }}>{openCases}</span>
          </div>
          <div style={{ background: 'rgba(12, 12, 12, 0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '16px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#737373', fontWeight: 700, letterSpacing: '0.03em' }}>RESOLVED TODAY</span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'hsl(var(--accent))', display: 'block', marginTop: '0.25rem' }}>{resolvedCount}</span>
          </div>
          <div style={{ background: 'rgba(12, 12, 12, 0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '16px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#737373', fontWeight: 700, letterSpacing: '0.03em' }}>SLA ESCALATED</span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{escalatedCount}</span>
          </div>
          <div style={{ background: 'rgba(12, 12, 12, 0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '16px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#737373', fontWeight: 700, letterSpacing: '0.03em' }}>ACTIVE DEPTS</span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'white', display: 'block', marginTop: '0.25rem' }}>{activeDepts}</span>
          </div>
          <div style={{ background: 'rgba(12, 12, 12, 0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '16px' }}>
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#737373', fontWeight: 700, letterSpacing: '0.03em' }}>REPAIR BUDGET IMPACT</span>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'hsl(var(--primary))', display: 'block', marginTop: '0.25rem' }}>${totalCost}</span>
          </div>
        </div>

        {/* Global Search and Filter Bar */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search operations by category, title, or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem 1rem' }}
          />

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.8rem', padding: '0.45rem 1.5rem' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)} 
            className="input-field" 
            style={{ width: 'auto', fontSize: '0.8rem', padding: '0.45rem 1.5rem' }}
          >
            <option value="all">All Priority</option>
            <option value="high">High (&gt;70)</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Live Incident Queue Grid list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#737373' }}>
            <Loader2 className="spin" size={28} style={{ margin: '0 auto 1rem auto' }} /> Loading Operations Queue...
          </div>
        ) : (
          <div style={{ background: 'rgba(12, 12, 12, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', color: '#737373', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>CASE DETAILS</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>PRIORITY</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>DEPT ROUTED</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>ASSIGNED OFFICER</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>EST BUDGET</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>SLA STATUS</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>RESOLUTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((issue) => (
                  <tr 
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssue(issue);
                      setAssignedOfficer(issue.assigned_officer || '');
                      setRepairCost(issue.estimated_cost || '');
                    }}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      background: selectedIssue?.id === issue.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                      transition: 'background 0.2s ease'
                    }}
                    className="hover-row"
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: 'white' }}>{issue.title}</div>
                      <div style={{ fontSize: '0.74rem', color: '#737373', marginTop: '0.2rem' }}>ID: {issue.id} | {issue.category}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ background: `${getPriorityColor(issue.priority_score)}15`, color: getPriorityColor(issue.priority_score), fontWeight: 700 }}>
                        {issue.priority_score || 25} Score
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>{issue.department || 'General Admin'}</td>
                    <td style={{ padding: '1rem', color: '#a3a3a3' }}>{issue.assigned_officer || 'Unassigned'}</td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>${issue.estimated_cost || '0.00'}</td>
                    <td style={{ padding: '1rem', color: getSlaDetailsText(issue.sla_due_at, issue.status).includes('Lapsed') ? '#ef4444' : '#a3a3a3' }}>
                      {getSlaDetailsText(issue.sla_due_at, issue.status)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${issue.status.toLowerCase()}`}>{issue.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredList.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#737373' }}>
                No active complaints match selected filters.
              </div>
            )}
          </div>
        )}

        {/* Analytics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
          
          {/* Department Workloads Card */}
          <div className="card" style={{ padding: '1.5rem', background: 'rgba(12, 12, 12, 0.72)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <BarChart3 size={15} /> Department Workload Ratios
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {['Water Supply & Sewage', 'Electricity Board', 'Public Works (PWD)', 'Sanitation Dept'].map((dept, idx) => {
                const count = issues.filter(i => i.department?.includes(dept) || (idx === 3 && !i.department)).length;
                const pct = issues.length > 0 ? Math.round((count / issues.length) * 100) : 0;
                return (
                  <div key={dept}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '0.25rem' }}>
                      <span>{dept}</span>
                      <span style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>{count} cases ({pct}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'hsl(var(--primary))' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live System Activity Feed */}
          <div className="card" style={{ padding: '1.5rem', background: 'rgba(12, 12, 12, 0.72)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <TrendingUp size={15} /> Live Operational Log Stream
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
              {activityLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem', color: '#a3a3a3', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <ChevronRight size={12} color="hsl(var(--primary))" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Floating Incident Detail Inspector (Right Drawer) */}
      {selectedIssue && (
        <div style={{
          width: '440px',
          minWidth: '440px',
          background: 'rgba(10, 10, 10, 0.85)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          overflowY: 'auto'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>MUNICIPAL AUDIT DETAIL</span>
            <button 
              onClick={() => setSelectedIssue(null)}
              style={{ background: 'none', border: 'none', color: '#a3a3a3', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>

          {/* Before/After proof comparator */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#737373', fontWeight: 600, marginBottom: '0.35rem' }}>BEFORE</span>
              {selectedIssue.image_url ? (
                <img src={selectedIssue.image_url} alt="Before" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px' }} />
              ) : (
                <div style={{ height: '110px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>No proof</div>
              )}
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.65rem', color: 'hsl(var(--accent))', fontWeight: 600, marginBottom: '0.35rem' }}>AFTER FIX (PROOF)</span>
              {selectedIssue.after_image_url ? (
                <img src={selectedIssue.after_image_url} alt="After" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px', border: '1px solid hsl(var(--accent))' }} />
              ) : afterImagePreview ? (
                <img src={afterImagePreview} alt="After Preview" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px' }} />
              ) : (
                <div 
                  onClick={() => document.getElementById('after-proof-upload')?.click()}
                  style={{ height: '110px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '0.2rem' }}
                >
                  <Camera size={18} color="#737373" />
                  <span style={{ fontSize: '0.65rem', color: '#737373' }}>Upload Fix</span>
                </div>
              )}
              <input 
                id="after-proof-upload" 
                type="file" 
                accept="image/*" 
                onChange={handleAfterImageChange} 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

          {/* AI resolution response alerts */}
          {verificationFeedback && (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)', color: 'hsl(var(--accent))', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem' }}>
              {verificationFeedback}
            </div>
          )}

          {verificationError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem' }}>
              {verificationError}
            </div>
          )}

          {/* Action triggers */}
          {afterImagePreview && !selectedIssue.after_image_url && (
            <button 
              onClick={handleVerifyResolution}
              disabled={verifying}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            >
              {verifying ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Run AI Resolution Comparison
            </button>
          )}

          {/* Details */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: '0 0 0.5rem 0' }}>{selectedIssue.title}</h4>
            <p style={{ fontSize: '0.8rem', color: '#a3a3a3', lineHeight: 1.5, margin: 0 }}>
              {selectedIssue.description}
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#737373' }}>AI Category:</span>
              <span style={{ fontWeight: 700 }}>{selectedIssue.category}</span>
            </div>
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#737373' }}>Report Confidence:</span>
              <span style={{ fontWeight: 700 }}>{Math.round((selectedIssue.confidence || 0.8) * 100)}%</span>
            </div>
            {selectedIssue.official_summary && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: '#737373', marginBottom: '0.25rem' }}>AI EXPLICIT SUMMARY</span>
                <p style={{ fontSize: '0.74rem', color: '#a3a3a3', margin: 0, lineHeight: 1.4 }}>{selectedIssue.official_summary}</p>
              </div>
            )}
          </div>

          {/* Dispatches & Budget Work order generator form */}
          <form onSubmit={handleAssignOfficerAndCost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem', display: 'block' }}>
              WORK ORDER & DISPATCH
            </span>

            <div>
              <label htmlFor="assign-officer" style={{ display: 'block', fontSize: '0.72rem', color: '#737373', fontWeight: 600, marginBottom: '0.35rem' }}>ASSIGNED OFFICER / TEAM</label>
              <input 
                id="assign-officer"
                type="text" 
                className="input-field" 
                placeholder="E.g., PWD Team B"
                value={assignedOfficer}
                onChange={(e) => setAssignedOfficer(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              />
            </div>

            <div>
              <label htmlFor="repair-cost" style={{ display: 'block', fontSize: '0.72rem', color: '#737373', fontWeight: 600, marginBottom: '0.35rem' }}>ESTIMATED REPAIR BUDGET ($)</label>
              <input 
                id="repair-cost"
                type="number" 
                className="input-field" 
                placeholder="E.g., 2500"
                value={repairCost}
                onChange={(e) => setRepairCost(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            >
              <Wrench size={13} /> Update Dispatch Details
            </button>
          </form>

          {/* Quick status overrides */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => handleStatusChange(selectedIssue.id, 'in_progress')}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem' }}
            >
              Set In Progress
            </button>
            <button 
              onClick={() => handleStatusChange(selectedIssue.id, 'resolved')}
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem' }}
            >
              Mark Resolved
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
