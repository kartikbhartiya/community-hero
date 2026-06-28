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
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('hero_score', { ascending: false })
        .limit(10);
        
      if (data && data.length > 0) {
        setUsers(data);
      } else {
        // Fallback demo mock data structured like real Indian citizen heroes
        setUsers([
          { name: 'Sarah Jenkins', hero_score: 1250, badges: ['Ward Leader', 'Pothole Buster'] },
          { name: 'Aarav Mehta', hero_score: 980, badges: ['Sanitation Warden'] },
          { name: 'Elena Rodriguez', hero_score: 845, badges: ['First Responder'] },
          { name: 'Rohan Sharma', hero_score: 620, badges: ['Active Neighbor'] },
          { name: 'Priya Patel', hero_score: 510, badges: ['Utility Watch'] },
          { name: 'Karan Malhotra', hero_score: 420, badges: ['Green Guard'] },
          { name: 'Ananya Sen', hero_score: 310, badges: [] }
        ]);
      }
    } catch (e) {
      console.error(e);
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
      <div style={{ minHeight: '100vh', background: '#070707', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />
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
        background: '#070707', 
        color: '#f3f4f6',
        paddingTop: '8rem',
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
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
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Celebrating citizens taking ownership of our municipal issues. Report, validate, and earn civic points.
          </p>
        </div>

        {/* Podium Layout for Top 3 */}
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
                background: '#0a0a0a',
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
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#C0C0C0', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem' }}>{topThree[1].hero_score} <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>PTS</span></div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {topThree[1].badges?.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>{badge}</span>
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
                border: '1px solid hsla(var(--primary), 0.35)',
                borderRadius: '20px',
                padding: '3rem 2rem 2.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 20px 40px -15px rgba(16, 185, 129, 0.15)',
                transform: 'scale(1.05)',
                zIndex: 5,
                order: 0
              }}
            >
              <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 1rem auto' }}>
                <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', color: 'hsl(var(--primary))' }}>
                  <Crown size={32} style={{ filter: 'drop-shadow(0 2px 8px hsla(var(--primary), 0.5))' }} />
                </div>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsla(var(--primary), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid hsl(var(--primary))' }}>
                  <User size={40} color="hsl(var(--primary))" />
                </div>
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'hsl(var(--primary))', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>1</div>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '0.5rem' }}>{topThree[0].name}</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'hsl(var(--primary))', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem', letterSpacing: '-0.02em' }}>{topThree[0].hero_score} <span style={{ fontSize: '0.95rem', color: '#9ca3af', fontWeight: 500 }}>PTS</span></div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {topThree[0].badges?.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', border: '1px solid hsla(var(--primary), 0.2)', fontSize: '0.7rem' }}>{badge}</span>
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
                background: '#0a0a0a',
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
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#CD7F32', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '1rem' }}>{topThree[2].hero_score} <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>PTS</span></div>
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {topThree[2].badges?.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'rgba(255,255,255,0.03)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>{badge}</span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* List for rankings 4+ */}
        {restUsers.length > 0 && (
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 2rem', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', display: 'grid', gridTemplateColumns: '80px 1fr 120px', color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
                      borderBottom: globalIndex === users.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.02)',
                      background: 'transparent'
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#4b5563', fontSize: '0.95rem' }}>#{globalIndex + 1}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <User size={16} color="#9ca3af" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</div>
                        {user.badges && user.badges.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                            {user.badges.slice(0, 2).map((badge: string) => (
                              <span key={badge} style={{ fontSize: '0.65rem', color: '#9ca3af', opacity: 0.8 }}>• {badge}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 800, color: 'hsl(var(--primary))', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem' }}>
                      {user.hero_score} <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500 }}>PTS</span>
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
