'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import gsap from 'gsap';
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  MapPin, 
  ThumbsUp, 
  PlusCircle, 
  Clock, 
  Building2, 
  ShieldCheck, 
  Flame,
  ArrowRight,
  Menu,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  Star
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      // 1. Get logged-in user profile info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        } else {
          const { data: newProfile } = await supabase
            .from('users')
            .upsert([{ email: user.email, name: user.user_metadata?.name || 'Community Member', hero_score: 0 }], { onConflict: 'email' })
            .select()
            .single();
          if (newProfile) setUserProfile(newProfile);
        }
      }

      // 2. Fetch issues
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

        // Trigger GSAP count-up numbers
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
    setActionLoadingId(issue.id);
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
      // 1. Update issue upvotes and priority score
      const { error } = await supabase
        .from('issues')
        .update({ 
          upvotes: newUpvotes,
          priority_score: newPriorityScore
        })
        .eq('id', issue.id);

      if (error) throw error;

      // 2. Add event to log
      await supabase.from('issue_events').insert([{
        issue_id: issue.id,
        type: 'duplicate_linked',
        message: `Community validation by ${userProfile.name}. Upvotes raised to ${newUpvotes}.`
      }]);

      // 3. Reward user with hero_score +5
      const newScore = (userProfile.hero_score || 0) + 5;
      const badges = [...(userProfile.badges || [])];
      if (newScore >= 20 && !badges.includes('Validator')) {
        badges.push('Validator');
      }
      if (newScore >= 50 && !badges.includes('Local Guardian')) {
        badges.push('Local Guardian');
      }
      if (newScore >= 100 && !badges.includes('Community Pillar')) {
        badges.push('Community Pillar');
      }

      await supabase
        .from('users')
        .update({ hero_score: newScore, badges })
        .eq('email', userProfile.email);

      setUserProfile({ ...userProfile, hero_score: newScore, badges });
      
      // Update local issue state
      const updatedIssues = issues.map(i => i.id === issue.id ? { ...i, upvotes: newUpvotes, priority_score: newPriorityScore } : i);
      setIssues(updatedIssues);
      
      // Animate stats updates
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

  if (loading && issues.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 70px)',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(var(--background))'
      }}>
        <Loader2 className="pulse" size={40} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem' }} />
        <span style={{ fontSize: '0.9rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Assembling City Data...</span>
      </div>
    );
  }

  const pendingList = issues.filter(i => i.status === 'pending');
  const resolvedList = issues.filter(i => i.status === 'resolved');
  const activeList = activeTab === 'pending' ? pendingList : resolvedList;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', overflow: 'hidden', position: 'relative', background: 'hsl(var(--background))' }}>
      
      {/* Collapsible Left Side Panel */}
      <div style={{
        width: isPanelOpen ? '440px' : '0px',
        minWidth: isPanelOpen ? '440px' : '0px',
        height: '100%',
        background: 'hsl(var(--card))',
        borderRight: isPanelOpen ? '1px solid hsl(var(--border))' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
        position: 'relative'
      }}>
        {/* User stats widget */}
        {userProfile && (
          <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', background: 'hsla(var(--primary), 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                background: 'hsla(var(--primary), 0.1)',
                color: 'hsl(var(--primary))',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                {userProfile.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'Outfit' }}>{userProfile.name}</h3>
                <span style={{ fontSize: '0.75rem', color: '#737373' }}>Hero Profile Active</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                <Star size={14} fill="gold" stroke="gold" />
                <span><strong>{userProfile.hero_score}</strong> Hero Points</span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {userProfile.badges?.slice(0, 2).map((badge: string) => (
                  <span key={badge} className="badge" style={{
                    background: 'hsla(var(--primary), 0.1)',
                    color: 'hsl(var(--primary))',
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.3rem'
                  }}>{badge}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Count Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <div style={{ border: '1px solid hsl(var(--border))', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Total Reports</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit' }}>{animatedStats.total}</span>
          </div>
          <div style={{ border: '1px solid hsl(var(--border))', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Pending Cases</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'hsl(var(--primary))' }}>{animatedStats.pending}</span>
          </div>
          <div style={{ border: '1px solid hsl(var(--border))', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Resolved Cases</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'hsl(var(--accent))' }}>{animatedStats.resolved}</span>
          </div>
          <div style={{ border: '1px solid hsl(var(--border))', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>High Risk</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit', color: 'hsl(var(--destructive))' }}>{animatedStats.highRisk}</span>
          </div>
        </div>

        {/* Tab Selectors */}
        <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border))' }}>
          <button 
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: activeTab === 'pending' ? 'hsl(var(--primary))' : '#737373',
              borderBottom: activeTab === 'pending' ? '2px solid hsl(var(--primary))' : 'none',
              cursor: 'pointer'
            }}
          >
            Pending Verification ({pendingList.length})
          </button>
          <button 
            onClick={() => setActiveTab('resolved')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: activeTab === 'resolved' ? 'hsl(var(--accent))' : '#737373',
              borderBottom: activeTab === 'resolved' ? '2px solid hsl(var(--accent))' : 'none',
              cursor: 'pointer'
            }}
          >
            Resolved Cases ({resolvedList.length})
          </button>
        </div>

        {/* Interactive List Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {activeList.map(issue => {
            const sla = getSlaDetails(issue.sla_due_at, issue.status);
            return (
              <div 
                key={issue.id} 
                className="card" 
                style={{ 
                  padding: '1.25rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  background: 'hsl(var(--card))',
                  borderRadius: 'var(--radius)',
                  border: '1px solid hsl(var(--border))'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#737373', fontWeight: 700, textTransform: 'uppercase' }}>
                      {issue.category}
                    </span>
                    
                    {issue.status === 'pending' ? (
                      <span className="badge" style={{ 
                        background: `${getPriorityColor(issue.priority_score || 0)}15`, 
                        color: getPriorityColor(issue.priority_score || 0),
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.15rem'
                      }}>
                        <Flame size={10} fill="currentColor" /> {issue.priority_score || 25}
                      </span>
                    ) : (
                      <span className="badge badge-resolved" style={{ fontSize: '0.7rem' }}>Resolved</span>
                    )}
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.3 }}>{issue.title}</h4>
                  <p style={{ color: '#737373', fontSize: '0.85rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {issue.description}
                  </p>

                  <div style={{ background: 'hsla(var(--foreground), 0.02)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <Building2 size={14} style={{ color: 'hsl(var(--primary))' }} />
                      <span>{issue.department || 'General Administration'}</span>
                    </div>
                    {issue.status === 'pending' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                        <Clock size={14} style={{ color: sla.color }} />
                        <span style={{ color: sla.color }}>{sla.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid hsla(var(--border), 0.5)' }}>
                    {issue.status === 'pending' ? (
                      <button 
                        onClick={() => handleValidateIssue(issue)}
                        disabled={actionLoadingId === issue.id}
                        className="btn"
                        style={{ 
                          background: 'hsla(var(--primary), 0.08)', 
                          color: 'hsl(var(--primary))', 
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.65rem',
                          fontWeight: 700
                        }}
                      >
                        <ThumbsUp size={12} fill={issue.upvotes > 0 ? "currentColor" : "none"} />
                        {actionLoadingId === issue.id ? '...' : `Validate (${issue.upvotes || 0})`}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#737373' }}>
                        Closed on {issue.resolved_at ? new Date(issue.resolved_at).toLocaleDateString() : 'N/A'}
                      </span>
                    )}

                    <Link href={`/issue/${issue.id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
                      File Review
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {activeList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#737373', fontSize: '0.9rem' }}>
              No reports registered under this status.
            </div>
          )}

        </div>
      </div>

      {/* Slide Handle Drawer Button */}
      <button 
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        style={{
          position: 'absolute',
          left: isPanelOpen ? '440px' : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '48px',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
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
        {isPanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Map Content occupying rest of viewport */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        
        {/* Floating Quick CTA overlay on Map */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          right: '2rem',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <Link href="/report" className="btn btn-primary" style={{ boxShadow: '0 10px 20px rgba(0,0,0,0.3)', padding: '0.75rem 1.5rem' }}>
            <PlusCircle size={18} /> File Civic Complaint
          </Link>
        </div>

        <MapComponent />
      </div>

    </div>
  );
}
