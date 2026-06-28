'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertTriangle, TrendingUp, ShieldAlert, BarChart3, PieChart } from 'lucide-react';

export default function DashboardClient() {
  const [metrics, setMetrics] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    highRisk: 0,
    categories: [] as { name: string, count: number }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { data: issues } = await supabase
      .from('issues')
      .select('*');

    if (issues) {
      const total = issues.length;
      const resolved = issues.filter(i => i.status === 'resolved').length;
      const pending = issues.filter(i => i.status === 'pending').length;
      const highRisk = issues.filter(i => i.safety_risk === 'high').length;

      const categoryMap = issues.reduce((acc: any, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {});

      const categories = Object.entries(categoryMap)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setMetrics({ total, resolved, pending, highRisk, categories });
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading dashboard...</div>;

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BarChart3 size={28} color="hsl(var(--primary))"/> Impact Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'hsla(var(--primary), 0.1)', color: 'hsl(var(--primary))', padding: '1rem', borderRadius: '50%' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', color: '#737373', fontWeight: 500 }}>Total Reports</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{metrics.total}</h2>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'hsla(var(--accent), 0.1)', color: 'hsl(var(--accent))', padding: '1rem', borderRadius: '50%' }}>
            <CheckCircle size={32} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', color: '#737373', fontWeight: 500 }}>Resolved</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{metrics.resolved}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'hsla(var(--warning), 0.1)', color: 'hsl(var(--warning))', padding: '1rem', borderRadius: '50%' }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', color: '#737373', fontWeight: 500 }}>Pending Action</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{metrics.pending}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'hsla(var(--destructive), 0.1)', color: 'hsl(var(--destructive))', padding: '1rem', borderRadius: '50%' }}>
            <ShieldAlert size={32} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', color: '#737373', fontWeight: 500 }}>High Risk Issues</p>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>{metrics.highRisk}</h2>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={20} /> Top Issue Categories
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {metrics.categories.length === 0 ? (
              <p style={{ color: '#737373' }}>No data available.</p>
            ) : (
              metrics.categories.map((cat, index) => (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 500 }}>{cat.name}</span>
                    <span>{cat.count}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'hsla(var(--border), 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${(cat.count / metrics.total) * 100}%`,
                        background: 'hsl(var(--primary))',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
