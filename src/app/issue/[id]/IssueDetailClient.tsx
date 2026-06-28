'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, ThumbsUp, Activity, User, ShieldAlert, Bot } from 'lucide-react';

export default function IssueDetailClient({ id }: { id: string }) {
  const [issue, setIssue] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssueData();
  }, [id]);

  const fetchIssueData = async () => {
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

    setLoading(false);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment) return;

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        issue_id: id,
        body: newComment,
        author_name: 'Community Member'
      }])
      .select()
      .single();

    if (!error && data) {
      setComments([...comments, data]);
      setNewComment('');
    }
  };

  const handleUpvote = async () => {
    if (!issue) return;
    const { error } = await supabase
      .from('issues')
      .update({ upvotes: issue.upvotes + 1 })
      .eq('id', id);
      
    if (!error) {
      setIssue({ ...issue, upvotes: issue.upvotes + 1 });
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading issue details...</div>;
  if (!issue) return <div style={{ padding: '3rem', textAlign: 'center' }}>Issue not found.</div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem', display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', maxWidth: '800px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
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
            style={{ width: '100%', borderRadius: 'var(--radius)', maxHeight: '400px', objectFit: 'cover', marginBottom: '2rem' }} 
          />
        )}

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Description</h3>
          <p style={{ lineHeight: 1.6 }}>{issue.description}</p>
        </div>

        {/* AI Insight Panel */}
        {issue.detected_label && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'hsla(var(--primary), 0.05)', borderColor: 'hsla(var(--primary), 0.2)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))', marginBottom: '0.75rem' }}>
              <Bot size={20} /> AI Analysis
            </h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
              <strong>Official Summary:</strong> {issue.detected_label}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <span className={`badge badge-${issue.safety_risk === 'high' ? 'high-risk' : (issue.safety_risk === 'medium' ? 'pending' : 'resolved')}`}>
                Risk: {issue.safety_risk}
              </span>
              <span className="badge" style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))' }}>
                Confidence: {Math.round(issue.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Upvote */}
        <button 
          onClick={handleUpvote} 
          className="btn btn-primary" 
          style={{ width: '100%', marginBottom: '3rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', fontSize: '1.1rem' }}
        >
          <ThumbsUp size={20} />
          Upvote to Raise Priority ({issue.upvotes})
        </button>

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
          {comments.map(comment => (
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
          ))}
        </div>

        <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-secondary">Post</button>
        </form>
      </div>
    </div>
  );
}
