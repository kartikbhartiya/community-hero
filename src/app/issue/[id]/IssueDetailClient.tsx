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
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function IssueDetailClient({ id }: { id: string }) {
  const [issue, setIssue] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    fetchIssueData();
  }, [id]);

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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authorName = user?.user_metadata?.name || 'Community Member';
      const authorEmail = user?.email || null;

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
    setIsVoting(true);

    const newUpvotes = (issue.upvotes || 0) + 1;
    
    // Priority calculation: Base points from severity + safety risk + confidence + 5 * upvotes
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

  const getSlaDetails = (slaDueAtStr: string, status: string) => {
    if (!slaDueAtStr) return { text: 'No SLA Set', color: '#737373', badgeClass: 'badge-pending', isEscalated: false };
    
    const dueDate = new Date(slaDueAtStr);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHrs = Math.ceil(diffMs / (1000 * 60 * 60));

    if (status === 'resolved') {
      return { text: 'SLA Resolved', color: 'hsl(var(--accent))', badgeClass: 'badge-resolved', isEscalated: false };
    }

    if (diffHrs < 0) {
      return { text: `Overdue by ${Math.abs(diffHrs)}h (Escalated)`, color: 'hsl(var(--destructive))', badgeClass: 'badge-high-risk', isEscalated: true };
    }

    if (diffHrs <= 24) {
      return { text: `Due in ${diffHrs}h (Urgent)`, color: 'hsl(var(--warning))', badgeClass: 'badge-pending', isEscalated: false };
    }

    return { text: `Due in ${diffHrs}h`, color: '#737373', badgeClass: 'badge-pending', isEscalated: false };
  };

  const getPriorityColor = (score: number) => {
    if (score >= 75) return 'hsl(var(--destructive))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading issue details...</div>;
  if (!issue) return <div style={{ padding: '3rem', textAlign: 'center' }}>Issue not found.</div>;

  const sla = getSlaDetails(issue.sla_due_at, issue.status);

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
      
      {/* Back button */}
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--primary))', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{issue.title}</h1>
          <span className={`badge badge-${issue.status.toLowerCase()}`}>{issue.status}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#737373', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={16} /> {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Activity size={16} /> {issue.category} • Severity: {issue.severity}
          </div>
        </div>

        {issue.image_url && (
          <img 
            src={issue.image_url} 
            alt={issue.title} 
            style={{ width: '100%', borderRadius: 'var(--radius)', maxHeight: '450px', objectFit: 'cover', marginBottom: '2rem' }} 
          />
        )}

        {/* Info Grid (Reporter & Department) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Building2 size={18} style={{ color: 'hsl(var(--primary))' }} /> SLA Routing Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
              <div>Responsible Dept: <strong>{issue.department || 'General Administration'}</strong></div>
              <div>SLA Deadline: <strong style={{ color: sla.color }}>{sla.text}</strong></div>
              <div>Estimated Resource: <strong>{issue.estimated_cost || 'Low cost / minimal'}</strong></div>
              {sla.isEscalated && (
                <div style={{ color: 'hsl(var(--destructive))', fontWeight: 600, fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertTriangle size={14} /> Escalated to department lead.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <User size={18} style={{ color: 'hsl(var(--secondary))' }} /> Reporter Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
              <div>Name: <strong>{issue.reporter_name || 'Anonymous Citizen'}</strong></div>
              <div>Contact: <strong>{issue.reporter_email || 'Not shared'}</strong></div>
              <div>Filed Date: <strong>{new Date(issue.created_at).toLocaleDateString()}</strong></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Description</h3>
          <p style={{ lineHeight: 1.6 }}>{issue.description}</p>
        </div>

        {/* AI Insight Panel */}
        {issue.official_summary && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'hsla(var(--primary), 0.05)', borderColor: 'hsla(var(--primary), 0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))', marginBottom: '0.75rem' }}>
              <Bot size={20} /> AI Routing Summary
            </h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
              <strong>Official Summary:</strong> {issue.official_summary}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span className={`badge badge-${issue.safety_risk === 'high' ? 'high-risk' : (issue.safety_risk === 'medium' ? 'pending' : 'resolved')}`}>
                Risk: {issue.safety_risk}
              </span>
              <span className="badge" style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))' }}>
                Confidence: {Math.round((issue.confidence || 0.75) * 100)}%
              </span>
              <span className="badge" style={{ 
                background: `${getPriorityColor(issue.priority_score || 0)}15`, 
                color: getPriorityColor(issue.priority_score || 0),
                fontWeight: 700
              }}>
                Priority Score: {issue.priority_score || 25}/100
              </span>
            </div>
          </div>
        )}

        {/* Indian Municipal Complaint Memo */}
        {issue.detected_label && (
          <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid hsl(var(--primary))' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <Building2 size={20} style={{ color: 'hsl(var(--primary))' }} /> Indian Municipal Complaint Memo (Draft)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#737373', marginBottom: '1rem' }}>
              This draft complaint was programmatically generated by the Agentic AI Routing system for filing with local municipal authorities (e.g. BMC/MCD/BBMP/PWD).
            </p>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace', 
              background: 'hsla(var(--foreground), 0.03)', 
              padding: '1.25rem', 
              borderRadius: 'var(--radius)',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))'
            }}>
              {issue.detected_label}
            </pre>
          </div>
        )}

        {/* Upvote */}
        {issue.status === 'pending' && (
          <button 
            onClick={handleUpvote} 
            disabled={isVoting}
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '3rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', fontSize: '1.1rem' }}
          >
            <ThumbsUp size={20} fill={issue.upvotes > 0 ? "currentColor" : "none"} />
            {isVoting ? 'Validating...' : `Upvote to Validate & Raise Priority (${issue.upvotes})`}
          </button>
        )}

        {/* Timeline */}
        <h3 style={{ marginBottom: '1.5rem' }}>Resolution Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
          {events.length === 0 ? (
            <p style={{ color: '#737373' }}>No events logged yet.</p>
          ) : (
            events.map(event => (
              <div key={event.id} className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
                <div style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', padding: '0.5rem', borderRadius: '50%', height: 'min-content' }}>
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>{event.type.replace('_', ' ')}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#737373', marginTop: '0.25rem' }}>{new Date(event.created_at).toLocaleString()}</p>
                  {event.message && <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{event.message}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comments */}
        <h3 style={{ marginBottom: '1.5rem' }}>Community Discussion</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {comments.length === 0 ? (
            <p style={{ color: '#737373', textAlign: 'center', padding: '1.5rem 0' }}>No discussions yet. Share your thoughts or validation feedback!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'hsla(var(--foreground), 0.1)', padding: '0.25rem', borderRadius: '50%' }}>
                    <User size={16} />
                  </div>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{comment.author_name}</span>
                  <span style={{ color: '#737373', fontSize: '0.8rem' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.95rem' }}>{comment.body}</p>
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
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn btn-secondary">Post</button>
        </form>
      </div>
    </div>
  );
}
