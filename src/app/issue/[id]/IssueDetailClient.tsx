'use client';

import { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    fetchIssueData();
  }, [id]);

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

  const getOfficerName = (dept: string) => {
    switch (dept) {
      case 'Public Works Department (PWD)':
        return 'Shri A.K. Dixit, Executive Engineer (PWD)';
      case 'Municipal Solid Waste Management (SWM) & Sanitation':
        return 'Smt. Radha Iyer, Chief Sanitation Inspector';
      case 'Water Supply & Sewerage Board (WSSB)':
        return 'Shri M. Venkatesh, Assistant Executive Engineer';
      case 'Electricity Board / DISCOM (Streetlighting Division)':
        return 'Shri R.K. Sen, Assistant Engineer (Electrical)';
      case 'Horticulture / Parks & Gardens Department':
        return 'Shri Vinay Kumar, Forest Range Officer';
      case 'Public Health & Sanitation Department':
        return 'Dr. S.K. Bose, Municipal Health Officer';
      case 'Traffic Police & Road Safety Cell':
        return 'Shri P.C. Sawant, ACP Traffic Cell';
      default:
        return 'Shri R.K. Prasad, Ward Nodal Officer';
    }
  };

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
    if (score >= 75) return 'hsl(var(--destructive))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#070707', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />
          <span>Fetching Ward Audit details...</span>
        </div>
      </div>
    );
  }
  if (!issue) return <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>Issue not found.</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#070707', color: '#f3f4f6', paddingTop: '7rem', paddingBottom: '6rem' }}>
      
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
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))', marginBottom: '2rem', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Title and Status Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{issue.title}</h1>
            <span className={`badge badge-${issue.status.toLowerCase()}`} style={{ padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.7rem' }}>
              {issue.status}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#9ca3af', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={14} color="hsl(var(--primary))" /> {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Activity size={14} color="hsl(var(--secondary))" /> {issue.category} • Severity: {issue.severity}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} color="#6b7280" /> Filed: {new Date(issue.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Issue Photo Render */}
        {issue.image_url && (
          <div style={{ position: 'relative', width: '100%', maxHeight: '420px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '2.5rem' }}>
            <img 
              src={issue.image_url} 
              alt={issue.title} 
              style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }} 
            />
          </div>
        )}

        {/* Primary Row: Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* SLA Ward Report Card */}
          <div className="card premium-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Building2 size={18} style={{ color: 'hsl(var(--primary))' }} /> SLA WARD REPORT CARD
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.6rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Responsible Division</span>
                <strong>{issue.department || 'General Administration Cell'}</strong>
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.6rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Assigned Executive Officer</span>
                <strong>{getOfficerName(issue.department)}</strong>
              </div>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.6rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Estimated Resource Cost</span>
                <strong style={{ color: 'hsl(var(--secondary))' }}>{issue.estimated_cost || 'Low cost utility fix'}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>SLA Escalation Timer</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <Clock size={16} color={isOverdue ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                  <strong style={{ 
                    color: isOverdue ? 'hsl(var(--destructive))' : (issue.status === 'resolved' ? 'hsl(var(--accent))' : '#ffffff'),
                    fontSize: '1.05rem',
                    fontFamily: 'monospace'
                  }}>
                    {timeLeft}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Descriptions & Reporter Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div className="card premium-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Description</h3>
              <p style={{ lineHeight: 1.6, color: '#d1d5db', fontSize: '0.95rem' }}>{issue.description}</p>
            </div>

            <div className="card premium-card" style={{ background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '1.5rem 2rem' }}>
              <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <User size={16} style={{ color: '#9ca3af' }} /> Reporter Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                <div>Name: <strong style={{ color: '#fff' }}>{issue.reporter_name || 'Anonymous Citizen'}</strong></div>
                <div>Contact: <strong style={{ color: '#fff' }}>{issue.reporter_email || 'Not shared'}</strong></div>
              </div>
            </div>

          </div>
        </div>

        {/* AI Insight Panel */}
        {issue.official_summary && (
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem', background: 'hsla(var(--primary), 0.02)', borderColor: 'hsla(var(--primary), 0.15)', borderRadius: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))', marginBottom: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>
              <Bot size={20} /> AI Municipal Routing Assessment
            </h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#e5e7eb', marginBottom: '1.5rem' }}>
              <strong>Official AI Summary:</strong> {issue.official_summary}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${issue.safety_risk === 'high' ? 'high-risk' : (issue.safety_risk === 'medium' ? 'pending' : 'resolved')}`} style={{ borderRadius: '4px', fontSize: '0.65rem' }}>
                Safety Risk: {issue.safety_risk}
              </span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.65rem' }}>
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
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderLeft: isOverdue ? '4px solid hsl(var(--destructive))' : '4px solid hsl(var(--primary))', 
          padding: '2.5rem 2rem', 
          background: '#0a0a0a' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', color: '#9ca3af', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
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

          <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            If the responsible ward officers are unresponsive or the SLA timeline is breached, citizens have the legal right to file an application under the Right to Information Act. This tool auto-formats a legal draft pre-filled with the coordinates, logs, and officer details.
          </p>

          <div style={{ 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px solid rgba(255, 255, 255, 0.03)', 
            borderRadius: '8px', 
            padding: '1.5rem', 
            maxHeight: '220px', 
            overflowY: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            lineHeight: 1.5,
            color: '#a1a1aa'
          }}>
            <div style={{ fontWeight: 700, color: '#f4f4f5', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.25rem' }}>RTI PREVIEW:</div>
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
            <p style={{ color: '#9ca3af' }}>No timeline milestones logged yet.</p>
          ) : (
            events.map(event => (
              <div key={event.id} className="card premium-card" style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <div style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', padding: '0.5rem', borderRadius: '50%', height: 'min-content' }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', textTransform: 'capitalize', fontWeight: 700 }}>{event.type.replace('_', ' ')}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>{new Date(event.created_at).toLocaleString()}</p>
                  {event.message && <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#d1d5db', lineHeight: 1.4 }}>{event.message}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comments */}
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Community Discussion</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem 0', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '8px' }}>No discussions yet. Share your thoughts or validation feedback!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="card premium-card" style={{ padding: '1.25rem', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <User size={14} color="#9ca3af" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {(!comment.author_name || comment.author_name === 'Community Member' || comment.author_name === 'Community member') ? 'Anonymous Citizen' : comment.author_name}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: 'auto' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.5 }}>{comment.body}</p>
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
            style={{ flex: 1, background: '#0a0a0a', borderColor: 'rgba(255,255,255,0.04)' }}
            required
          />
          <button type="submit" className="btn btn-secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 1.5rem', fontSize: '0.85rem' }}>Post</button>
        </form>
      </div>
    </div>
  );
}
