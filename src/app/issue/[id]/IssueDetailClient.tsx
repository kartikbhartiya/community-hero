'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  MapPin,
  ThumbsUp,
  Activity,
  User,
  ShieldAlert,
  Bot,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  ArrowLeft,
  FileDown,
  Download,
  Calendar,
  Sparkles,
  Loader2,
  ShieldCheck,
  Share2,
  Camera,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

// Lightweight markdown renderer for AI briefs (## headings, lists, **bold**)
function MarkdownLite({ text }: { text: string }) {
  const inline = (s: string, k: any) =>
    s.split('**').map((p, i) => (i % 2 === 1 ? <strong key={`${k}-${i}`}>{p}</strong> : <span key={`${k}-${i}`}>{p}</span>));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {text.split('\n').map((raw, idx) => {
        const line = raw.trim();
        if (!line) return null;
        if (line.startsWith('## ')) {
          return <h4 key={idx} style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: idx ? '0.7rem' : 0 }}>{line.slice(3)}</h4>;
        }
        const li = line.match(/^(\d+\.|[-*])\s+(.*)$/);
        if (li) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--foreground-secondary)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{/^\d/.test(li[1]) ? li[1] : '•'}</span>
              <span>{inline(li[2], idx)}</span>
            </div>
          );
        }
        return <p key={idx} style={{ fontSize: '0.86rem', color: 'var(--foreground-secondary)', lineHeight: 1.55 }}>{inline(line, idx)}</p>;
      })}
    </div>
  );
}

export default function IssueDetailClient({ id }: { id: string }) {
  const [issue, setIssue] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState('Calculating...');
  const [isOverdue, setIsOverdue] = useState(false);
  const [rtiDraft, setRtiDraft] = useState<string | null>(null);
  const [generatingRti, setGeneratingRti] = useState(false);

  // Authority resolution workflow
  const [isAuthority, setIsAuthority] = useState(false);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [ack, setAck] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Agentic AI analysis + escalation cycle
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/issue/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue }),
      });
      const d = await res.json();
      setAnalysis(d.text || 'No analysis available right now.');
    } catch {
      setAnalysis('Could not analyze this case right now. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleEscalate = async () => {
    setEscalating(true);
    try {
      const res = await fetch('/api/issue/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: issue.id }),
      });
      const d = await res.json();
      if (res.ok) {
        setIssue({ ...issue, escalated: true, escalation_notice: d.notice, priority_score: d.priority });
        fetchIssueData();
      }
    } finally {
      setEscalating(false);
    }
  };

  useEffect(() => {
    fetchIssueData();
  }, [id]);

  useEffect(() => {
    setIsAuthority(localStorage.getItem('auth_portal_token') === 'auth_portal_verified_session');
  }, []);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const data = { title: issue?.title || 'Community issue', text: `Civic issue: ${issue?.title}`, url };
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share(data); } catch { /* dismissed */ }
    } else {
      try { await navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); } catch { /* noop */ }
    }
  };

  const handleAcknowledge = async () => {
    setAck(true);
    try {
      const { error } = await supabase.from('issues')
        .update({ status: 'in_progress', acknowledged_at: new Date().toISOString() }).eq('id', issue.id);
      if (!error) {
        await supabase.from('issue_events').insert([{ issue_id: issue.id, type: 'acknowledged', message: 'Issue acknowledged by authority — work is now in progress.' }]);
        setIssue({ ...issue, status: 'in_progress', acknowledged_at: new Date().toISOString() });
        fetchIssueData();
      }
    } finally { setAck(false); }
  };

  const handleAfterImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAfterPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleVerifyResolution = async () => {
    if (!afterPreview) return;
    if (!issue.image_url) {
      setVerifyResult({ isResolved: false, quality: 'Invalid', reasoning: 'No original (before) photo exists for this report, so visual verification is not possible.' });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/verify-resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beforeImageUrl: issue.image_url, afterImageBase64: afterPreview, category: issue.category }),
      });
      const data = await res.json();
      setVerifyResult(res.ok ? data : { isResolved: false, quality: 'Invalid', reasoning: data.error || 'Verification failed.' });
    } catch (e: any) {
      setVerifyResult({ isResolved: false, quality: 'Invalid', reasoning: e.message || 'Verification failed.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!verifyResult?.isResolved) return;
    setResolving(true);
    try {
      const { error } = await supabase.from('issues').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution_verified: true,
        resolution_feedback: verifyResult.reasoning,
      }).eq('id', issue.id);
      if (!error) {
        await supabase.from('issue_events').insert([{ issue_id: issue.id, type: 'resolved', message: `Resolution AI-verified (${verifyResult.quality}). ${verifyResult.reasoning}` }]);
        setIssue({ ...issue, status: 'resolved', resolved_at: new Date().toISOString(), resolution_verified: true, resolution_feedback: verifyResult.reasoning });
        fetchIssueData();
      }
    } finally { setResolving(false); }
  };

  useEffect(() => {
    if (!issue || !issue.sla_due_at) return;

    const interval = setInterval(() => {
      const dueDate = new Date(issue.sla_due_at);
      const now = new Date();
      const diffMs = dueDate.getTime() - now.getTime();

      if (issue.status === 'resolved') {
        setTimeLeft('SLA Resolved');
        setIsOverdue(false);
        clearInterval(interval);
        return;
      }

      if (diffMs <= 0) {
        setTimeLeft('Overdue (Escalated to Commissioner)');
        setIsOverdue(true);
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      timeStr += `${hours}h ${minutes}m ${seconds}s`;
      setTimeLeft(timeStr);
      setIsOverdue(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [issue]);

  const handleGenerateRti = async () => {
    if (!issue) return;
    setGeneratingRti(true);
    try {
      const res = await fetch('/api/issue/rti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: issue.id,
          title: issue.title,
          category: issue.category,
          department: issue.department || 'Municipal Board',
          description: issue.description,
          reportedAt: new Date(issue.created_at).toLocaleDateString(),
          reporterName: issue.reporter_name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRtiDraft(data.rtiMarkdown);
      }
    } catch (err) {
      console.error('Failed to generate RTI draft:', err);
    } finally {
      setGeneratingRti(false);
    }
  };

  const fetchIssueData = async () => {
    try {
      // Fetch main issue
      const { data: issueData } = await supabase
        .from('issues')
        .select('*')
        .eq('id', id)
        .single();
        
      if (issueData) setIssue(issueData);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('issue_events')
        .select('*')
        .eq('issue_id', id)
        .order('created_at', { ascending: false });
        
      if (eventsData) setEvents(eventsData);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('issue_id', id)
        .order('created_at', { ascending: true });
        
      if (commentsData) setComments(commentsData);
    } catch (err) {
      console.error('Error fetching issue data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Honest, generic addressee for an RTI/escalation draft — no fabricated people.
  const getOfficerName = (dept: string) => `The Public Information Officer (PIO), ${dept || 'Municipal Corporation'}`;

  const downloadRtiDraft = () => {
    if (!issue) return;

    const officerName = getOfficerName(issue.department);
    const currentDate = new Date().toLocaleDateString();
    const createdDate = new Date(issue.created_at).toLocaleDateString();

    const rtiText = `FORM 'A'
Form of Application for Seeking Information under Section 6(1) of the Right to Information Act, 2005

To,
The Public Information Officer (PIO)
Office of the Municipal Commissioner,
${issue.department || 'General Administration Cell'}

1. Full Name of the Applicant: ${issue.reporter_name || 'Anonymous Citizen'}
2. Address: Community Hero Citizen Network (Digital Grievance Cell)
3. Particulars of Information required under Section 6(1):
   a. Subject matter of information: Action taken on reported civic issue ID ${issue.id}.
   b. Period to which the information relates: ${createdDate} to ${currentDate}.
   c. Description of Information required:
      - Kindly provide copies of the site inspection reports, dispatch registers, and repair logs associated with the reported infrastructure issue: "${issue.description}".
      - State the name, designation, and contact details of the official responsible for completing this repair under standard Ward SLA limits (Assigned designated officer: ${officerName}).
      - Provide details of the budget allocated and the contractor assigned (if any) for rectifying the aforementioned damage.
   d. Geographical Reference:
      - Lat/Lng Coordinates: ${issue.lat.toFixed(6)}, ${issue.lng.toFixed(6)}
      - Reported Category: ${issue.category}
      - Assigned Severity: ${issue.severity}
4. I state that the information sought does not fall within the restrictions contained in Section 8 of the RTI Act, 2005 and to the best of my knowledge it pertains to your office.
5. Mode of delivery: Digital/Post.

Date: ${currentDate}
Place: Municipal Ward Office

Signature of Applicant:
_____________________________
(${issue.reporter_name || 'Citizen Applicant'})`;

    const blob = new Blob([rtiText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RTI_Application_Draft_Issue_${issue.id.substring(0, 8)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let authorName = 'Anonymous Citizen';
      const authorEmail = user?.email || null;

      if (user?.email) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('email', user.email)
          .single();
        if (profile?.name) {
          authorName = profile.name;
        } else {
          authorName = user.user_metadata?.name || user.email.split('@')[0] || 'Anonymous Citizen';
        }
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([{
          issue_id: id,
          body: newComment,
          author_name: authorName,
          author_email: authorEmail
        }])
        .select()
        .single();

      if (!error && data) {
        setComments([...comments, data]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleUpvote = async () => {
    if (!issue || isVoting) return;

    const upvotedIssues = JSON.parse(localStorage.getItem('community_hero_upvotes') || '[]');
    if (upvotedIssues.includes(id)) {
      alert("You have already validated/upvoted this issue.");
      return;
    }

    setIsVoting(true);
    const newUpvotes = (issue.upvotes || 0) + 1;
    
    const severity = issue.severity || 'Medium';
    const safetyRisk = issue.safety_risk || 'medium';
    const confidence = issue.confidence || 0.75;

    let severityPoints = 25;
    if (severity.toLowerCase() === 'high') severityPoints = 50;
    else if (severity.toLowerCase() === 'low') severityPoints = 10;

    let riskPoints = 15;
    if (safetyRisk.toLowerCase() === 'high') riskPoints = 30;
    else if (safetyRisk.toLowerCase() === 'low') riskPoints = 5;
    else if (safetyRisk.toLowerCase() === 'none') riskPoints = 0;

    const confidencePoints = Math.round(confidence * 10);
    const newPriorityScore = Math.min(100, severityPoints + riskPoints + confidencePoints + (newUpvotes * 5));

    try {
      const { error } = await supabase
        .from('issues')
        .update({ 
          upvotes: newUpvotes,
          priority_score: newPriorityScore
        })
        .eq('id', id);
        
      if (!error) {
        upvotedIssues.push(id);
        localStorage.setItem('community_hero_upvotes', JSON.stringify(upvotedIssues));
        setIssue({ ...issue, upvotes: newUpvotes, priority_score: newPriorityScore });
        
        // Log event
        const { data: eventData } = await supabase.from('issue_events').insert([{
          issue_id: id,
          type: 'duplicate_linked',
          message: `Citizen validation. Upvotes increased to ${newUpvotes}. Smart priority updated to ${newPriorityScore}/100.`
        }]).select();

        if (eventData) {
          setEvents([eventData[0], ...events]);
        }
      }
    } catch (err) {
      console.error('Failed to register upvote:', err);
    } finally {
      setIsVoting(false);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 75) return 'var(--destructive)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--primary)';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <span>Fetching Ward Audit details...</span>
        </div>
      </div>
    );
  }
  if (!issue) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--destructive)' }}>Issue not found.</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', paddingTop: '1.5rem', paddingBottom: '6rem' }}>
      
      {/* Subtle grid mesh background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.02,
        zIndex: 1,
        pointerEvents: 'none',
        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2, maxWidth: '850px' }}>
        
        {/* Back button */}
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '2rem', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Title and Status Header */}
        <div style={{ borderBottom: '1px solid var(--surface-hover)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{issue.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge badge-${issue.status.toLowerCase()}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.7rem' }}>
                {issue.status}
              </span>
              <button onClick={handleShare} className="btn btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.75rem' }}>
                {shareCopied ? <><CheckCircle size={13} /> Copied</> : <><Share2 size={13} /> Share</>}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} color="var(--primary)" /> {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Activity size={14} color="var(--secondary)" /> {issue.category} • Severity: {issue.severity}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} color="var(--muted)" /> Filed: {new Date(issue.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Resolution verified banner (public) */}
        {issue.status === 'resolved' && issue.resolution_feedback && (
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', borderColor: 'rgb(var(--accent-rgb) / 0.35)', background: 'rgb(var(--accent-rgb) / 0.06)', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 800 }}>
              <ShieldCheck size={18} /> Resolution AI-Verified
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.4rem', lineHeight: 1.5 }}>{issue.resolution_feedback}</p>
          </div>
        )}

        {/* Issue Photo Render */}
        {issue.image_url && (
          <div style={{ position: 'relative', width: '100%', maxHeight: '420px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--surface-hover)', marginBottom: '2.5rem' }}>
            <img 
              src={issue.image_url} 
              alt={issue.title} 
              style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }} 
            />
          </div>
        )}

        {/* Primary Row: Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* SLA Ward Report Card Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card premium-card" style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <Building2 size={18} style={{ color: 'var(--accent)' }} /> SLA WARD REPORT CARD
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Responsible Division</span>
                  <strong>{issue.department || 'General Administration Cell'}</strong>
                </div>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Tracking Reference</span>
                  <strong style={{ fontFamily: 'monospace' }}>CH-{String(issue.id).slice(0, 8).toUpperCase()}</strong>
                </div>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Estimated Resource Cost</span>
                  <strong style={{ color: 'var(--accent)' }}>{issue.estimated_cost || 'Low cost utility fix'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>SLA Escalation Timer</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Clock size={16} color={isOverdue ? 'var(--destructive)' : 'var(--accent)'} />
                    <strong style={{ 
                      color: isOverdue ? 'var(--destructive)' : (issue.status === 'resolved' ? 'var(--accent)' : 'var(--foreground)'),
                      fontSize: '1.05rem',
                      fontFamily: 'monospace'
                    }}>
                      {timeLeft}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* AI RTI Application Generator */}
            {issue.status !== 'resolved' && (
              <div className="card premium-card" style={{ 
                background: 'var(--card)', 
                border: '1px solid var(--border-strong)', 
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderRadius: '16px'
              }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} /> AI RTI TRANSPARENCY ENGINES
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                  If resolving this complaint is taking too long or breaching its SLA threshold, citizens can generate an official Right to Information (RTI) query draft under Section 6(1) of the RTI Act, 2005.
                </p>

                {rtiDraft ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <textarea
                      readOnly
                      value={rtiDraft}
                      className="input-field"
                      style={{ 
                        fontSize: '0.74rem', 
                        height: '220px', 
                        resize: 'none', 
                        fontFamily: 'monospace', 
                        background: 'var(--background-secondary)',
                        color: 'var(--foreground)'
                      }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(rtiDraft);
                        alert('RTI Draft copied to clipboard!');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem', fontSize: '0.78rem' }}
                    >
                      Copy RTI Draft to Clipboard
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateRti}
                    disabled={generatingRti}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem', fontSize: '0.8rem' }}
                  >
                    {generatingRti ? <Loader2 size={12} className="spin" /> : 'Generate Legally Grounded RTI Draft'}
                  </button>
                )}
              </div>
            )}

            {/* Authority Console: acknowledge + AI-verified resolution */}
            {isAuthority && issue.status !== 'resolved' && (
              <div className="card premium-card" style={{ background: 'var(--card)', border: '1px solid rgb(var(--info-rgb) / 0.4)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={15} color="var(--info)" /> AUTHORITY CONSOLE
                </h4>

                {issue.status === 'pending' && (
                  <button onClick={handleAcknowledge} disabled={ack} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                    {ack ? <><Loader2 size={13} className="spin" /> Updating…</> : 'Acknowledge & Start Work'}
                  </button>
                )}

                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                  Upload an &quot;after&quot; photo as proof. An independent AI agent compares it to the original and must approve before the case can be closed.
                </p>

                <input ref={afterInputRef} type="file" accept="image/*" onChange={handleAfterImageSelect} style={{ display: 'none' }} />

                {afterPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={afterPreview} alt="resolution proof" style={{ width: '100%', borderRadius: '10px', maxHeight: '170px', objectFit: 'cover' }} />
                    <button onClick={() => { setAfterPreview(null); setVerifyResult(null); }} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                      <XCircle size={15} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => afterInputRef.current?.click()} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                    <Camera size={14} /> Upload Resolution Proof
                  </button>
                )}

                {afterPreview && !verifyResult && (
                  <button onClick={handleVerifyResolution} disabled={verifying} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                    {verifying ? <><Loader2 size={13} className="spin" /> AI verifying…</> : <><Sparkles size={14} /> Verify fix with AI</>}
                  </button>
                )}

                {verifyResult && (
                  <div style={{ padding: '0.85rem', borderRadius: '12px', border: `1px solid ${verifyResult.isResolved ? 'rgb(var(--accent-rgb) / 0.4)' : 'rgb(var(--destructive-rgb) / 0.4)'}`, background: verifyResult.isResolved ? 'rgb(var(--accent-rgb) / 0.08)' : 'rgb(var(--destructive-rgb) / 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: verifyResult.isResolved ? 'var(--accent)' : 'var(--destructive)' }}>
                      {verifyResult.isResolved ? <CheckCircle size={15} /> : <AlertTriangle size={15} />} AI verdict: {verifyResult.quality}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--foreground-secondary)', marginTop: '0.4rem', lineHeight: 1.45 }}>{verifyResult.reasoning}</p>
                    {verifyResult.isResolved ? (
                      <button onClick={handleMarkResolved} disabled={resolving} className="btn btn-primary" style={{ width: '100%', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                        {resolving ? <><Loader2 size={13} className="spin" /> Resolving…</> : <><CheckCircle size={14} /> Confirm &amp; Mark Resolved</>}
                      </button>
                    ) : (
                      <button onClick={() => { setAfterPreview(null); setVerifyResult(null); }} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                        Try a different photo
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Descriptions & Reporter Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="card premium-card" style={{ background: 'var(--background)', border: '1px solid var(--surface-hover)', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Description</h3>
              <p style={{ lineHeight: 1.6, color: 'var(--foreground-secondary)', fontSize: '0.95rem' }}>{issue.description}</p>
            </div>

            <div className="card premium-card" style={{ background: 'var(--background)', border: '1px solid var(--surface-hover)', padding: '1.5rem 2rem' }}>
              <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <User size={16} style={{ color: 'var(--muted)' }} /> Reporter Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                <div>Name: <strong style={{ color: 'var(--foreground)' }}>{issue.reporter_name || 'Anonymous Citizen'}</strong></div>
                <div>Contact: <strong style={{ color: 'var(--foreground)' }}>{issue.reporter_email || 'Not shared'}</strong></div>
              </div>
            </div>

          </div>
        </div>

        {/* AI Case Intelligence — agentic deep analysis */}
        <div className="glass-panel aura-ring" style={{ position: 'relative', padding: '2rem', marginBottom: '2.5rem', borderColor: 'rgb(var(--accent-rgb) / 0.2)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: analysis ? '1.25rem' : 0 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Sparkles size={20} /> AI Case Intelligence
            </h3>
            <button onClick={handleAnalyze} disabled={analyzing} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              {analyzing ? <><Loader2 size={14} className="spin" /> Analyzing case…</> : (analysis ? 'Re-run analysis' : 'Generate case brief')}
            </button>
          </div>
          {analysis ? (
            <MarkdownLite text={analysis} />
          ) : !analyzing && (
            <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.55 }}>
              Generate a deep operational brief — root cause, impact &amp; who&apos;s affected, a step-by-step remediation plan, required resources, and priority justification — giving authorities full clarity at a glance.
            </p>
          )}
        </div>

        {/* Issue Lifecycle + community escalation */}
        {(() => {
          const reported = true;
          const acknowledged = issue.status === 'in_progress' || issue.status === 'resolved' || !!issue.acknowledged_at;
          const overdueStage = isOverdue || issue.escalated;
          const escalatedStage = !!issue.escalated;
          const resolvedStage = issue.status === 'resolved';
          const stages = [
            { label: 'Reported', done: reported, color: 'var(--info)' },
            { label: 'Acknowledged', done: acknowledged, color: 'var(--info)' },
            { label: 'Overdue', done: overdueStage, color: 'var(--warning)' },
            { label: 'Escalated', done: escalatedStage, color: 'var(--destructive)' },
            { label: 'Resolved', done: resolvedStage, color: 'var(--accent)' },
          ];
          return (
            <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem', borderRadius: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1.25rem' }}>
                <Activity size={18} color="var(--info)" /> Issue Lifecycle
              </h3>

              {/* Honest progress timeline based on real status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {stages.map((s, i) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: '60px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: s.done ? s.color : 'var(--border-strong)', boxShadow: s.done ? `0 0 0 4px ${s.color}22` : 'none' }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: s.done ? 'var(--foreground)' : 'var(--muted)', textAlign: 'center' }}>{s.label}</span>
                    </div>
                    {i < stages.length - 1 && <div style={{ height: '2px', flex: 1, background: stages[i + 1].done ? s.color : 'var(--border)', minWidth: '12px' }} />}
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Community Hero is an independent civic-reporting platform — not a government system. Escalating raises this issue&apos;s public priority and drafts a formal letter <strong style={{ color: 'var(--foreground)' }}>you can send</strong> to the relevant department yourself.
              </p>

              {issue.escalation_notice && (
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--background-secondary)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Escalation letter draft (for you to send)</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--foreground-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{issue.escalation_notice}</p>
                  <button onClick={() => { navigator.clipboard.writeText(issue.escalation_notice); }} className="btn btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.76rem' }}>Copy letter</button>
                </div>
              )}

              {resolvedStage ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>✓ Resolved — no further escalation needed.</p>
              ) : !issue.escalated ? (
                <>
                  <button onClick={handleEscalate} disabled={escalating} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                    {escalating ? <><Loader2 size={14} className="spin" /> Escalating…</> : <><AlertTriangle size={14} /> Escalate &amp; draft a letter</>}
                  </button>
                  {isOverdue && (
                    <p style={{ fontSize: '0.76rem', color: 'var(--warning)', marginTop: '0.6rem' }}>⚠ This issue is past its expected resolution window.</p>
                  )}
                </>
              ) : (
                <button onClick={handleEscalate} disabled={escalating} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                  {escalating ? <><Loader2 size={14} className="spin" /> Regenerating…</> : 'Regenerate letter draft'}
                </button>
              )}
            </div>
          );
        })()}

        {/* AI Insight Panel */}
        {issue.official_summary && (
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem', background: 'rgb(var(--primary-rgb) / 0.02)', borderColor: 'rgb(var(--primary-rgb) / 0.15)', borderRadius: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>
              <Bot size={20} /> AI Municipal Routing Assessment
            </h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--foreground-secondary)', marginBottom: '1.25rem' }}>
              <strong>Official AI Summary:</strong> {issue.official_summary}
            </p>
            {issue.detected_label && (
              <details style={{ marginBottom: '1.5rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>
                  View the AI-drafted complaint memo
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--foreground-secondary)', marginTop: '0.75rem', lineHeight: 1.6, background: 'var(--background-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>{issue.detected_label}</pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${issue.safety_risk === 'high' ? 'high-risk' : (issue.safety_risk === 'medium' ? 'pending' : 'resolved')}`} style={{ borderRadius: '4px', fontSize: '0.65rem' }}>
                Safety Risk: {issue.safety_risk}
              </span>
              <span className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--muted)', border: '1px solid var(--surface-hover)', borderRadius: '4px', fontSize: '0.65rem' }}>
                Confidence Match: {Math.round((issue.confidence || 0.75) * 100)}%
              </span>
              <span className="badge" style={{ 
                background: `${getPriorityColor(issue.priority_score || 0)}15`, 
                color: getPriorityColor(issue.priority_score || 0),
                fontWeight: 800,
                borderRadius: '4px',
                fontSize: '0.65rem'
              }}>
                Priority Score: {issue.priority_score || 25}/100
              </span>
            </div>
          </div>
        )}

        {/* Advanced Indian RTI Grievance Draft Generator Box */}
        <div className="card" style={{ 
          marginBottom: '2.5rem', 
          border: '1px solid var(--surface-hover)',
          borderLeft: isOverdue ? '4px solid var(--destructive)' : '4px solid var(--primary)', 
          padding: '2.5rem 2rem', 
          background: 'var(--background)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface-hover)', color: 'var(--muted)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                <Sparkles size={10} /> RTI Act 2005 Section 6(1)
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                RTI Grievance Escalation Suite
              </h3>
            </div>
            <button 
              onClick={downloadRtiDraft} 
              className="btn btn-secondary" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.6rem 1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              <Download size={14} /> Download Official RTI (.txt)
            </button>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            If the responsible ward officers are unresponsive or the SLA timeline is breached, citizens have the legal right to file an application under the Right to Information Act. This tool auto-formats a legal draft pre-filled with the coordinates, logs, and officer details.
          </p>

          <div style={{ 
            background: 'var(--surface-hover)', 
            border: '1px solid var(--surface-hover)', 
            borderRadius: '8px', 
            padding: '1.5rem', 
            maxHeight: '220px', 
            overflowY: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            lineHeight: 1.5,
            color: '#a1a1aa'
          }}>
            <div style={{ fontWeight: 700, color: '#f4f4f5', marginBottom: '0.5rem', borderBottom: '1px solid var(--surface-hover)', paddingBottom: '0.25rem' }}>RTI PREVIEW:</div>
            FORM &apos;A&apos;<br />
            Form of Application for Seeking Information under Section 6(1) of the Right to Information Act, 2005<br /><br />
            To,<br />
            The Public Information Officer (PIO)<br />
            Office of the Municipal Commissioner,<br />
            {issue.department || 'General Administration Cell'}<br /><br />
            1. Full Name of the Applicant: {issue.reporter_name || 'Anonymous Citizen'}<br />
            2. Address: Community Hero Citizen Network (Digital Grievance Cell)<br />
            3. Particulars of Information required:<br />
            &nbsp;&nbsp;&nbsp;a. Subject: Action taken on reported civic issue ID {issue.id}.<br />
            &nbsp;&nbsp;&nbsp;b. Period: {new Date(issue.created_at).toLocaleDateString()} to {new Date().toLocaleDateString()}<br />
            &nbsp;&nbsp;&nbsp;c. Details: Kindly provide inspection logs, dispatch files, and budget allocations for reported damage: &quot;{issue.description}&quot; at ({issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}).
          </div>
        </div>

        {/* Upvote */}
        {issue.status === 'pending' && (
          <button 
            onClick={handleUpvote} 
            disabled={isVoting}
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '3.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, padding: '0.9rem' }}
          >
            <ThumbsUp size={18} fill={issue.upvotes > 0 ? "currentColor" : "none"} />
            {isVoting ? 'Validating...' : `Upvote to Validate & Raise Priority (${issue.upvotes})`}
          </button>
        )}

        {/* Timeline */}
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Resolution Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3.5rem' }}>
          {events.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No timeline milestones logged yet.</p>
          ) : (
            events.map(event => (
              <div key={event.id} className="card premium-card" style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', background: 'var(--background)', border: '1px solid var(--surface-hover)' }}>
                <div style={{ background: 'rgb(var(--primary-rgb) / 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '50%', height: 'min-content' }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', textTransform: 'capitalize', fontWeight: 700 }}>{event.type.replace('_', ' ')}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{new Date(event.created_at).toLocaleString()}</p>
                  {event.message && <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--foreground-secondary)', lineHeight: 1.4 }}>{event.message}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comments */}
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Community Discussion</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          {comments.length === 0 ? (
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0', border: '1px dashed var(--surface-hover)', borderRadius: '8px' }}>No discussions yet. Share your thoughts or validation feedback!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="card premium-card" style={{ padding: '1.25rem', background: 'var(--background)', border: '1px solid var(--surface-hover)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'var(--surface-hover)', padding: '0.35rem', borderRadius: '50%', border: '1px solid var(--surface-hover)' }}>
                    <User size={14} color="var(--muted)" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {(!comment.author_name || comment.author_name === 'Community Member' || comment.author_name === 'Community member') ? 'Anonymous Citizen' : comment.author_name}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--foreground-secondary)', lineHeight: 1.5 }}>{comment.body}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Add a comment or validation feedback..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ flex: 1, background: 'var(--background)', borderColor: 'var(--surface-hover)' }}
            required
          />
          <button type="submit" className="btn btn-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 1.5rem', fontSize: '0.85rem' }}>Post</button>
        </form>
      </div>
    </div>
  );
}
