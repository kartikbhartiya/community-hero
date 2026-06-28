'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Star, User } from 'lucide-react';

export default function LeaderboardClient() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('hero_score', { ascending: false })
      .limit(10);
      
    if (data && data.length > 0) {
      setUsers(data);
    } else {
      // Mock data for demo purposes if table is empty
      setUsers([
        { name: 'Sarah Jenkins', hero_score: 1250, badges: ['Eco Warrior', 'First Responder'] },
        { name: 'Marcus Chen', hero_score: 980, badges: ['Neighborhood Watch'] },
        { name: 'Elena Rodriguez', hero_score: 845, badges: ['Top Reporter'] },
        { name: 'David Smith', hero_score: 620, badges: [] },
        { name: 'Anonymous Hero', hero_score: 410, badges: ['Active Citizen'] }
      ]);
    }
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy size={24} color="#FFD700" />; // Gold
    if (index === 1) return <Medal size={24} color="#C0C0C0" />; // Silver
    if (index === 2) return <Medal size={24} color="#CD7F32" />; // Bronze
    return <span style={{ fontWeight: 'bold', width: '24px', textAlign: 'center', color: '#737373' }}>{index + 1}</span>;
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading Leaderboard...</div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <Trophy size={48} color="hsl(var(--primary))" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Community Heroes</h1>
        <p style={{ color: '#737373', fontSize: '1.1rem' }}>Celebrating the citizens who make our community better.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {users.map((user, index) => (
          <div 
            key={index} 
            className="card" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1.5rem', 
              padding: '1.5rem',
              transform: index === 0 ? 'scale(1.02)' : 'none',
              border: index === 0 ? '2px solid hsl(var(--primary))' : '1px solid hsla(var(--border), 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px' }}>
              {getRankIcon(index)}
            </div>
            
            <div style={{ background: 'hsla(var(--foreground), 0.05)', padding: '1rem', borderRadius: '50%' }}>
              <User size={24} color="hsl(var(--foreground))" />
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{user.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {user.badges && user.badges.map((badge: string) => (
                  <span key={badge} className="badge" style={{ background: 'hsla(var(--accent), 0.1)', color: 'hsl(var(--accent))', fontSize: '0.75rem' }}>
                    <Star size={10} style={{ display: 'inline', marginRight: '2px' }} /> {badge}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '2rem', margin: 0, color: 'hsl(var(--primary))' }}>{user.hero_score}</h2>
              <p style={{ fontSize: '0.8rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '1px' }}>Hero Score</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
