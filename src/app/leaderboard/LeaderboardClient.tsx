'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Star, User, Sparkles, Shield, Crown } from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardClient() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // 1. Prefer the curated users table when it actually has scores.
      const { data: profiles } = await supabase
        .from('users')
        .select('*')
        .order('hero_score', { ascending: false })
        .limit(10);

      if (profiles && profiles.some((u: any) => (u.hero_score || 0) > 0)) {
        setUsers(profiles.filter((u: any) => (u.hero_score || 0) > 0));
        return;
      }

      // 2. Otherwise derive a REAL leaderboard from actual reported issues.
      const { data: issues } = await supabase
        .from('issues')
        .select('reporter_name, reporter_email, upvotes, status');

      if (issues && issues.length > 0) {
        const map = new Map<string, any>();
        issues.forEach((i: any) => {
          const key = (i.reporter_email || i.reporter_name || 'anonymous').toLowerCase();
          const name = i.reporter_name
            || (i.reporter_email ? i.reporter_email.split('@')[0] : 'Anonymous Citizen');
          const e = map.get(key) || { name, hero_score: 0, reports: 0, resolved: 0, upvotes: 0 };
          e.name = name;
          e.reports += 1;
          e.upvotes += i.upvotes || 0;
          if (i.status === 'resolved') e.resolved += 1;
          // Civic points: 50 / report, 10 / upvote received, 100 / resolved issue
          e.hero_score += 50 + (i.upvotes || 0) * 10 + (i.status === 'resolved' ? 100 : 0);
          map.set(key, e);
        });

        const ranked = Array.from(map.values())
          .map((e) => ({
            ...e,
            badges: [
              e.reports >= 5 ? 'Ward Leader' : null,
              e.resolved >= 1 ? 'Issue Resolver' : null,
              e.upvotes >= 10 ? 'Community Voice' : null,
              e.reports >= 1 && e.reports < 5 ? 'Active Neighbor' : null,
            ].filter(Boolean) as string[],
          }))
          .sort((a, b) => b.hero_score - a.hero_score)
          .slice(0, 10);

        setUsers(ranked);
      } else {
        setUsers([]);
      }
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Card hover interactive lighting reflection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const card = document.getElementById(id);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
          <span>Analyzing Civic Standings...</span>
        </div>
      </div>
    );
  }

  // Top 3 Podium spots
  const topThree = users.slice(0, 3);
  // Rest of rankings
  const restUsers = users.slice(3);

  return (
    <div 
      ref={containerRef}
      style={{ 
        minHeight: '100vh', 
        background: 'var(--background)', 
        color: 'var(--foreground)',
        paddingTop: '2rem',
        paddingBottom: '6rem',
        position: 'relative'
      }}
    >
      {/* Subtle grid mesh background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.03,
        zIndex: 1,
        pointerEvents: 'none',
        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2, maxWidth: '1000px' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgb(var(--primary-rgb) / 0.1)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            <Sparkles size={12} /> Live Standings
          </div>
          
          <h1 className="shimmer-text" style={{ 
            fontSize: 'clamp(2rem, 4vw, 3rem)', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '-0.03em',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: '0.75rem'
          }}>
            Community Heroes
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Celebrating citizens taking ownership of our municipal issues. Report, validate, and earn civic points.
          </p>
        </div>

        {/* Empty state — no real activity yet */}
        {users.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--muted)', maxWidth: '520px', margin: '0 auto' }}>
            <Trophy size={40} style={{ opacity: 0.35, marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--foreground)' }}>No heroes yet</h3>
            <p style={{ marginBottom: '1.5rem' }}>Be the first to climb the ranks — report a civic issue and start earning civic points.</p>
            <Link href="/report" className="btn btn-primary">Report an issue</Link>
          </div>
        )}

        {/* Podium Layout for Top 3 */}
        {users.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem',
          alignItems: 'end'
        }}>
          
          {/* Podium Spot 2 (Left) */}
          {topThree[1] && (
            <div 
              id="podium-2"
              onMouseMove={(e) => handleMouseMove(e, 'podium-2')}
              className="premium-card" 
              style={{
                background: 'var(--background)',
                border: '1px solid rgba(192, 192, 192, 0.15)',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                order: 1
              }}
            >
              <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 1rem auto' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(192, 192, 192, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(192, 192, 192, 0.3)' }}>
                  <User size={32} color="#C0C0C0" />
                </div>
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#C0C0C0', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</div>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '0.5rem' }}>{topThree[1].name}</h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#C0C0C0', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem' }}>{topThree[1].hero_score} <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>PTS</span></div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {topThree[1].badges?.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--muted)', border: '1px solid var(--surface-hover)', fontSize: '0.7rem' }}>{badge}</span>
                ))}
              </div>
            </div>
          )}

          {/* Podium Spot 1 (Center - Crowned) */}
          {topThree[0] && (
            <div 
              id="podium-1"
              onMouseMove={(e) => handleMouseMove(e, 'podium-1')}
              className="premium-card" 
              style={{
                background: 'linear-gradient(to bottom, #0d0d0d, #090909)',
                border: '1px solid rgb(var(--primary-rgb) / 0.35)',
                borderRadius: '20px',
                padding: '3rem 2rem 2.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 20px 40px -15px rgb(var(--accent-rgb) / 0.15)',
                transform: 'scale(1.05)',
                zIndex: 5,
                order: 0
              }}
            >
              <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 1rem auto' }}>
                <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', color: 'var(--primary)' }}>
                  <Crown size={32} style={{ filter: 'drop-shadow(0 2px 8px rgb(var(--primary-rgb) / 0.5))' }} />
                </div>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgb(var(--primary-rgb) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)' }}>
                  <User size={40} color="var(--primary)" />
                </div>
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>1</div>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '0.5rem' }}>{topThree[0].name}</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem', letterSpacing: '-0.02em' }}>{topThree[0].hero_score} <span style={{ fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 500 }}>PTS</span></div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {topThree[0].badges?.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'rgb(var(--primary-rgb) / 0.1)', color: 'var(--primary)', border: '1px solid rgb(var(--primary-rgb) / 0.2)', fontSize: '0.7rem' }}>{badge}</span>
                ))}
              </div>
            </div>
          )}

          {/* Podium Spot 3 (Right) */}
          {topThree[2] && (
            <div 
              id="podium-3"
              onMouseMove={(e) => handleMouseMove(e, 'podium-3')}
              className="premium-card" 
              style={{
                background: 'var(--background)',
                border: '1px solid rgba(205, 127, 50, 0.15)',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                order: 2
              }}
            >
              <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 1rem auto' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(205, 127, 50, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(205, 127, 50, 0.3)' }}>
                  <User size={32} color="#CD7F32" />
                </div>
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#CD7F32', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</div>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '0.5rem' }}>{topThree[2].name}</h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#CD7F32', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem' }}>{topThree[2].hero_score} <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>PTS</span></div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {topThree[2].badges?.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'var(--surface-hover)', color: 'var(--muted)', border: '1px solid var(--surface-hover)', fontSize: '0.7rem' }}>{badge}</span>
                ))}
              </div>
            </div>
          )}

        </div>
        )}

        {/* List for rankings 4+ */}
        {restUsers.length > 0 && (
          <div style={{ background: 'var(--background)', border: '1px solid var(--surface-hover)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 2rem', background: 'var(--surface-hover)', borderBottom: '1px solid var(--surface-hover)', display: 'grid', gridTemplateColumns: '80px 1fr 120px', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span>Rank</span>
              <span>Citizen</span>
              <span style={{ textAlign: 'right' }}>Score</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {restUsers.map((user, index) => {
                const globalIndex = index + 3;
                const idStr = `leaderboard-item-${globalIndex}`;
                return (
                  <div 
                    key={user.id || globalIndex} 
                    id={idStr}
                    onMouseMove={(e) => handleMouseMove(e, idStr)}
                    className="premium-card"
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '80px 1fr 120px', 
                      alignItems: 'center', 
                      padding: '1.25rem 2rem',
                      borderBottom: globalIndex === users.length - 1 ? 'none' : '1px solid var(--surface-hover)',
                      background: 'transparent'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#4b5563', fontSize: '0.95rem' }}>#{globalIndex + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-hover)' }}>
                        <User size={16} color="var(--muted)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</div>
                        {user.badges && user.badges.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                            {user.badges.slice(0, 2).map((badge: string) => (
                              <span key={badge} style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.8 }}>• {badge}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem' }}>
                      {user.hero_score} <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 500 }}>PTS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
