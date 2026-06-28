'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, CheckCircle, AlertTriangle, Clock, MapPin, Building, DollarSign } from 'lucide-react';

export default function AdminClient() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setIssues(data);
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('issues')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setIssues(issues.map(issue => issue.id === id ? { ...issue, status: newStatus } : issue));
      
      // Log official event
      await supabase.from('issue_events').insert([{
        issue_id: id,
        type: newStatus,
        message: `Official status updated to ${newStatus}.`
      }]);
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Admin Panel...</div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield size={28} color="hsl(var(--primary))"/> City Authority Dashboard
      </h1>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {issues.map(issue => (
          <div key={issue.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{issue.title}</h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#737373', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14}/> {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--primary))' }}>
                    <Building size={14}/> {issue.department || 'Unassigned'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--destructive))' }}>
                    <AlertTriangle size={14}/> Risk: {issue.safety_risk || 'Unknown'}
                  </span>
                  {issue.estimated_cost && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--accent))' }}>
                      <DollarSign size={14}/> {issue.estimated_cost}
                    </span>
                  )}
                </div>
              </div>
              <span className={`badge badge-${issue.status.toLowerCase()}`}>{issue.status}</span>
            </div>

            <div style={{ background: 'hsla(var(--foreground), 0.03)', padding: '1rem', borderRadius: 'var(--radius)' }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><strong>AI Summary:</strong> {issue.detected_label || issue.description}</p>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, marginRight: '0.5rem' }}>Update Status:</span>
                <select 
                  className="input-field" 
                  style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
                  value={issue.status}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
