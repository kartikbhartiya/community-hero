'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { MapPin, ThumbsUp, MessageSquare, Clock } from 'lucide-react';

export default function FeedClient() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('issues')
      .select('*, comments(count)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setIssues(data);
    }
    setLoading(false);
  };

  const handleUpvote = async (id: string, currentUpvotes: number) => {
    const upvotedIssues = JSON.parse(localStorage.getItem('community_hero_upvotes') || '[]');
    if (upvotedIssues.includes(id)) {
      alert("You have already validated/upvoted this issue.");
      return;
    }

    const { error } = await supabase
      .from('issues')
      .update({ upvotes: currentUpvotes + 1 })
      .eq('id', id);
      
    if (!error) {
      upvotedIssues.push(id);
      localStorage.setItem('community_hero_upvotes', JSON.stringify(upvotedIssues));
      setIssues(issues.map(issue => 
        issue.id === id ? { ...issue, upvotes: currentUpvotes + 1 } : issue
      ));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading community issues...</div>;
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Community Issue Feed</h2>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {issues.map(issue => (
          <div key={issue.id} className="card">
            {issue.image_url && (
              <div style={{ width: '100%', height: '180px', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1rem' }}>
                <img src={issue.image_url} alt={issue.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{issue.title}</h3>
              <span className={`badge badge-${issue.status.toLowerCase()}`}>{issue.status}</span>
            </div>
            
            <p style={{ color: 'hsl(var(--foreground))', opacity: 0.8, fontSize: '0.9rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {issue.description}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#737373', marginBottom: '1rem' }}>
              <MapPin size={14} />
              <span>{issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}</span>
              <span style={{ margin: '0 0.5rem' }}>•</span>
              <Clock size={14} />
              <span>{new Date(issue.created_at).toLocaleDateString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid hsla(var(--border), 0.5)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => handleUpvote(issue.id, issue.upvotes)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontWeight: 500 }}
                >
                  <ThumbsUp size={16} />
                  {issue.upvotes}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#737373', fontSize: '0.9rem' }}>
                  <MessageSquare size={16} />
                  {issue.comments?.[0]?.count || 0}
                </div>
              </div>
              
              <Link href={`/issue/${issue.id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                View Full
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {issues.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#737373' }}>
          No issues reported yet. Be the first to report an issue in your community!
        </div>
      )}
    </div>
  );
}
