'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Award, ShieldAlert, CheckCircle, TrendingUp, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DeptScorecard {
  name: string;
  total: number;
  resolved: number;
  pending: number;
  slaCompliant: number;
  slaBreached: number;
  avgTurnaroundHours: number;
  grade: string;
  color: string;
}

export default function ScorecardsPage() {
  const [scorecards, setScorecards] = useState<DeptScorecard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateScorecards();
  }, []);

  const calculateScorecards = async () => {
    try {
      const { data: issues } = await supabase
        .from('issues')
        .select('*');

      if (!issues) return;

      const depts = [
        { name: 'Public Works Department (PWD)', color: 'hsl(142, 72%, 40%)' },
        { name: 'Municipal Solid Waste Management (SWM) & Sanitation', color: 'hsl(160, 84%, 39%)' },
        { name: 'Water Supply & Sewerage Board (WSSB)', color: '#06b6d4' },
        { name: 'Electricity Board / DISCOM (Streetlighting Division)', color: '#eab308' },
        { name: 'Horticulture / Parks & Gardens Department', color: '#84cc16' },
        { name: 'Public Health & Sanitation Department', color: '#ec4899' },
        { name: 'Traffic Police & Road Safety Cell', color: '#3b82f6' }
      ];

      const cards: DeptScorecard[] = depts.map(dept => {
        const deptIssues = issues.filter(i => i.department === dept.name);
        const total = deptIssues.length;
        if (total === 0) {
          return {
            name: dept.name,
            total: 0,
            resolved: 0,
            pending: 0,
            slaCompliant: 0,
            slaBreached: 0,
            avgTurnaroundHours: 0,
            grade: 'N/A',
            color: dept.color
          };
        }

        const resolved = deptIssues.filter(i => i.status === 'resolved').length;
        const pending = total - resolved;

        // SLA calculation
        const compliant = deptIssues.filter(i => {
          if (i.status === 'resolved') {
            return !i.escalated; // Not escalated during lifetime
          }
          // If pending, check if current time is before SLA due date
          return i.sla_due_at ? new Date(i.sla_due_at) > new Date() : true;
        }).length;

        const breached = total - compliant;
        const complianceRate = (compliant / total) * 100;
        const resolutionRate = (resolved / total) * 100;

        // Average turnaround time in hours
        let totalHrs = 0;
        let resolvedCount = 0;
        deptIssues.forEach(i => {
          if (i.status === 'resolved' && i.resolved_at) {
            const start = new Date(i.created_at);
            const end = new Date(i.resolved_at);
            const hrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHrs += hrs;
            resolvedCount++;
          }
        });
        const avgTurnaroundHours = resolvedCount > 0 ? Math.round(totalHrs / resolvedCount) : 0;

        // Assign Grade (A to D)
        let grade = 'D';
        if (complianceRate >= 90 && resolutionRate >= 80) {
          grade = 'A';
        } else if (complianceRate >= 75 && resolutionRate >= 60) {
          grade = 'B';
        } else if (complianceRate >= 50 && resolutionRate >= 40) {
          grade = 'C';
        }

        return {
          name: dept.name,
          total,
          resolved,
          pending,
          slaCompliant: compliant,
          slaBreached: breached,
          avgTurnaroundHours,
          grade,
          color: dept.color
        };
      });

      setScorecards(cards.filter(c => c.total > 0)); // only show departments with logged issues
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1rem', maxWidth: '900px' }}>
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#737373', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={32} color="hsl(var(--primary))" /> Department Accountability Scorecards
        </h1>
        <p style={{ color: '#737373', fontSize: '0.95rem', marginTop: '0.5rem' }}>
          Public transparency metrics evaluating ward-level response speeds, resolution rates, and SLA contract parameters.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#737373' }}>
          Assembling transparency metrics...
        </div>
      ) : scorecards.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#737373' }}>
          No municipal data registered yet. Log reports to begin tracking department scorecards!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {scorecards.map((card, idx) => {
            const resRate = ((card.resolved / card.total) * 100).toFixed(0);
            const complianceRate = ((card.slaCompliant / card.total) * 100).toFixed(0);

            return (
              <div key={idx} className="card" style={{
                border: '1px solid hsl(var(--border))',
                padding: '1.75rem',
                display: 'grid',
                gridTemplateColumns: '1fr 100px',
                gap: '1.5rem',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'Outfit', color: 'white', marginBottom: '1rem' }}>
                    {card.name}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Resolution Rate</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{resRate}%</span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#a3a3a3' }}>({card.resolved}/{card.total} resolved)</span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>SLA Compliance</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: card.slaBreached > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}>
                        {complianceRate}%
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#a3a3a3' }}>({card.slaBreached} breaches)</span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#737373', fontWeight: 600, textTransform: 'uppercase' }}>Avg Turnaround</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                        {card.avgTurnaroundHours > 0 ? `${card.avgTurnaroundHours}h` : 'N/A'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#a3a3a3' }}>official fix duration</span>
                    </div>
                  </div>
                </div>

                {/* Grade Badge */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'hsla(var(--foreground), 0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  width: '90px',
                  height: '90px',
                  margin: '0 auto'
                }}>
                  <span style={{ fontSize: '0.65rem', color: '#737373', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>GRADE</span>
                  <span style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    fontFamily: 'Outfit',
                    color: card.grade === 'A' ? 'hsl(var(--primary))' : (card.grade === 'B' ? 'hsl(var(--accent))' : (card.grade === 'C' ? 'hsl(var(--warning))' : '#ef4444'))
                  }}>
                    {card.grade}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
