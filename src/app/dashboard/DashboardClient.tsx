'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion } from 'framer-motion';
import MapComponent from '@/components/MapComponent';
import {
  Activity, AlertTriangle, CheckCircle, Clock, FileSpreadsheet, Layers,
  Flame, TrendingUp, Users, ThumbsUp, ArrowRight, Trophy, Radio, MapPin, Gauge,
  Sparkles, BarChart3, Loader2, Search
} from 'lucide-react';

// ---------- helpers ----------
function Count({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString()}{suffix}</>;
}

function PulseText({ text }: { text: string }) {
  const inline = (s: string, k: any) =>
    s.split('**').map((p, i) => (i % 2 === 1 ? <strong key={`${k}-${i}`}>{p}</strong> : <span key={`${k}-${i}`}>{p}</span>));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {text.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
        const m = line.match(/^[*-]\s+(.*)$/);
        return m
          ? <div key={i} style={{ display: 'flex', gap: '0.5rem' }}><span style={{ color: 'var(--accent)' }}>▸</span><span>{inline(m[1], i)}</span></div>
          : <p key={i}>{inline(line, i)}</p>;
      })}
    </div>
  );
}

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function categoryEmoji(category: string) {
  const c = (category || '').toLowerCase();
  if (c.includes('pothole') || c.includes('road')) return '🕳️';
  if (c.includes('light') || c.includes('street')) return '💡';
  if (c.includes('garbage') || c.includes('waste')) return '🚮';
  if (c.includes('water') || c.includes('leak') || c.includes('drain')) return '💧';
  if (c.includes('tree') || c.includes('block')) return '🌳';
  return '🚧';
}

const statusMeta: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--warning)' },
  in_progress: { label: 'In Progress', color: 'var(--info)' },
  resolved: { label: 'Resolved', color: 'var(--accent)' },
};

export default function DashboardClient() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [live, setLive] = useState(false);
  const [pulse, setPulse] = useState<string | null>(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');

  const generatePulse = async () => {
    setPulseLoading(true);
    try {
      const res = await fetch('/api/citizen-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Act as a city operations analyst. Based on the active reports, give a concise executive briefing as exactly 4 short markdown bullet points: (1) the top problem category, (2) the most urgent safety risk, (3) any SLA/overdue concern, (4) one recommended action for authorities. Keep each bullet under 18 words.',
        }),
      });
      const data = await res.json();
      setPulse(data.text || 'No briefing available right now.');
    } catch {
      setPulse('Could not generate the briefing right now. Please try again.');
    } finally {
      setPulseLoading(false);
    }
  };

  const fetchIssues = async () => {
    const { data } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
    if (data) setIssues(data);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: p } = await supabase.from('users').select('*').eq('email', user.email).single();
        if (p) setProfile(p);
      }
      await fetchIssues();
      setLoading(false);
    })();

    // Advanced: live realtime sync (no-op if realtime isn't enabled on the table)
    const ch = supabase
      .channel('dash-issues-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        setLive(true);
        fetchIssues();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ---------- vitals ----------
  const v = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter(i => i.status === 'pending').length;
    const inProgress = issues.filter(i => i.status === 'in_progress').length;
    const resolved = issues.filter(i => i.status === 'resolved').length;
    const highRisk = issues.filter(i => (i.safety_risk || '').toLowerCase() === 'high').length;
    const upvotes = issues.reduce((a, i) => a + (i.upvotes || 0), 0);
    const now = Date.now();
    const overdue = issues.filter(i => i.status !== 'resolved' && i.sla_due_at && new Date(i.sla_due_at).getTime() < now).length;
    const escalated = issues.filter(i => i.escalated).length;
    const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;

    const resolvedWithTimes = issues.filter(i => i.status === 'resolved' && i.resolved_at && i.created_at);
    const avgHours = resolvedWithTimes.length
      ? Math.round(resolvedWithTimes.reduce((a, i) => a + (new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 3.6e6, 0) / resolvedWithTimes.length)
      : 0;

    const reporters = new Set(issues.map(i => (i.reporter_email || i.reporter_name || '').toLowerCase()).filter(Boolean));

    const byCategory = Object.entries(
      issues.reduce((acc: Record<string, number>, i) => {
        const k = i.category || 'Other';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const bySeverity = {
      high: issues.filter(i => (i.severity || '').toLowerCase() === 'high').length,
      medium: issues.filter(i => (i.severity || '').toLowerCase() === 'medium').length,
      low: issues.filter(i => !['high', 'medium'].includes((i.severity || '').toLowerCase())).length,
    };

    // top contributors (real, from reports)
    const map = new Map<string, any>();
    issues.forEach(i => {
      const key = (i.reporter_email || i.reporter_name || 'anonymous').toLowerCase();
      const name = i.reporter_name || (i.reporter_email ? i.reporter_email.split('@')[0] : 'Anonymous');
      const e = map.get(key) || { name, reports: 0, score: 0 };
      e.reports += 1;
      e.score += 50 + (i.upvotes || 0) * 10 + (i.status === 'resolved' ? 100 : 0);
      e.name = name;
      map.set(key, e);
    });
    const contributors = Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 5);

    // 7-day reporting trend (real, from created_at)
    const trend: { label: string; count: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - d);
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const count = issues.filter(i => {
        const t = new Date(i.created_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).length;
      trend.push({ label: day.toLocaleDateString(undefined, { weekday: 'short' }), count });
    }

    return { total, pending, inProgress, resolved, highRisk, upvotes, overdue, escalated, resolutionRate, avgHours, reporters: reporters.size, byCategory, bySeverity, contributors, trend };
  }, [issues]);

  const exportCsv = () => {
    if (!issues.length) return;
    const headers = ['ID', 'Title', 'Category', 'Severity', 'Status', 'Upvotes', 'Department', 'Priority', 'Lat', 'Lng', 'Created'];
    const rows = issues.map(i => [i.id, `"${(i.title || '').replace(/"/g, '""')}"`, i.category, i.severity, i.status, i.upvotes, i.department, i.priority_score, i.lat, i.lng, i.created_at]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `community_hero_reports_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 1.5rem 5rem' }}>
        <div className="kpi-grid" style={{ marginBottom: '1.1rem' }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '96px' }} />)}
        </div>
        <div className="dash-grid">
          <div className="skeleton" style={{ height: '320px' }} />
          <div className="skeleton" style={{ height: '320px' }} />
        </div>
      </div>
    );
  }

  const maxCat = Math.max(1, ...v.byCategory.map(c => c[1] as number));
  const maxTrend = Math.max(1, ...v.trend.map(t => t.count));

  const reportRows = issues.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      return [i.title, i.category, i.reporter_name, i.department].some(f => (f || '').toLowerCase().includes(q));
    }
    return true;
  });

  const kpis = [
    { icon: Activity, label: 'Total Reports', value: v.total, color: 'var(--info)' },
    { icon: Clock, label: 'Pending', value: v.pending, color: 'var(--warning)' },
    { icon: Gauge, label: 'In Progress', value: v.inProgress, color: 'var(--info)' },
    { icon: CheckCircle, label: 'Resolved', value: v.resolved, color: 'var(--accent)' },
    { icon: TrendingUp, label: 'Resolution Rate', value: v.resolutionRate, suffix: '%', color: 'var(--accent)' },
    { icon: Flame, label: 'High Risk', value: v.highRisk, color: 'var(--destructive)' },
    { icon: AlertTriangle, label: 'SLA Overdue', value: v.overdue, color: 'var(--destructive)' },
    { icon: ThumbsUp, label: 'Total Upvotes', value: v.upvotes, color: 'var(--accent)' },
  ];

  return (
    <div className="container" style={{ padding: '1.5rem 1.5rem 5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: live ? 'var(--accent)' : 'var(--muted)', marginBottom: '0.5rem' }}>
            <span className={live ? 'live-dot' : ''} style={{ width: '7px', height: '7px', borderRadius: '50%', background: live ? 'var(--accent)' : 'var(--muted)', display: 'inline-block' }} />
            {live ? 'Live · Realtime synced' : 'Operations Overview'}
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800 }}>
            {profile?.name ? `Welcome, ${profile.name}` : 'Community Operations'}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Live civic intelligence across all reported issues · avg resolution {v.avgHours || '—'}h · {v.reporters} citizens engaged
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportCsv} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <Link href="/report" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
            <MapPin size={15} /> New Report
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid" style={{ marginBottom: '1.4rem' }}>
        {kpis.map((k, idx) => (
          <motion.div
            key={k.label}
            className="card premium-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, type: 'spring', stiffness: 300, damping: 26 }}
            style={{ padding: '1rem 1.1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              <k.icon size={15} color={k.color} /> {k.label}
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', color: k.color }}>
              <Count value={k.value} suffix={k.suffix} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI City Pulse — executive briefing */}
      <div className="card premium-card aura-ring" style={{ marginBottom: '1.4rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: pulse ? '1rem' : 0 }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={16} color="var(--accent)" /> AI City Pulse — Executive Briefing
          </h3>
          <button onClick={generatePulse} disabled={pulseLoading} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
            {pulseLoading ? <><Loader2 className="spin" size={14} /> Analyzing…</> : (pulse ? 'Regenerate' : 'Generate briefing')}
          </button>
        </div>
        {pulse ? (
          <div style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--foreground-secondary)' }}><PulseText text={pulse} /></div>
        ) : !pulseLoading && (
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Generate a live AI summary of the city&apos;s civic situation — top risks, SLA concerns, and a recommended action — grounded in current reports.
          </p>
        )}
      </div>

      {/* Main grid */}
      <div className="dash-grid">
        {/* LEFT */}
        <div className="dash-col">
          {/* 7-day trend */}
          <div className="card premium-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart3 size={16} color="var(--info)" /> Reports — Last 7 Days
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '130px', marginTop: '1rem' }}>
              {v.trend.map((t, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: t.count ? 'var(--accent)' : 'var(--muted)' }}>{t.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(t.count / maxTrend) * 90}px` }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%', maxWidth: '34px', minHeight: '4px', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg, var(--accent), var(--info))' }}
                  />
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="card premium-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} color="var(--accent)" /> Issues by Category
            </h3>
            {v.byCategory.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No data yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {v.byCategory.map(([cat, n]) => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                      <span>{categoryEmoji(cat)} {cat}</span>
                      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{n as number}</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '99px', background: 'var(--surface-hover)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((n as number) / maxCat) * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, var(--accent), var(--info))' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status + severity */}
          <div className="card premium-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={16} color="var(--info)" /> Status & Severity
            </h3>
            {/* status bar */}
            <div style={{ display: 'flex', height: '14px', borderRadius: '99px', overflow: 'hidden', marginBottom: '0.75rem', background: 'var(--surface-hover)' }}>
              {(['pending', 'in_progress', 'resolved'] as const).map(s => {
                const count = s === 'pending' ? v.pending : s === 'in_progress' ? v.inProgress : v.resolved;
                const pct = v.total ? (count / v.total) * 100 : 0;
                return <div key={s} title={`${statusMeta[s].label}: ${count}`} style={{ width: `${pct}%`, background: statusMeta[s].color, transition: 'width 0.6s var(--ease-out)' }} />;
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {(['pending', 'in_progress', 'resolved'] as const).map(s => {
                const count = s === 'pending' ? v.pending : s === 'in_progress' ? v.inProgress : v.resolved;
                return (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--foreground-secondary)' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: statusMeta[s].color }} /> {statusMeta[s].label} · {count}
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {([['High', v.bySeverity.high, 'var(--destructive)'], ['Medium', v.bySeverity.medium, 'var(--warning)'], ['Low', v.bySeverity.low, 'var(--info)']] as const).map(([label, n, c]) => (
                <div key={label} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '0.7rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c }}>{n}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent reports */}
          <div className="card premium-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} color="var(--warning)" /> Recent Reports
            </h3>
            {issues.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No reports yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {issues.slice(0, 6).map(i => (
                  <Link key={i.id} href={`/issue/${i.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '1.2rem' }}>{categoryEmoji(i.category)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{i.department || i.category} · {timeAgo(i.created_at)}</div>
                    </div>
                    <span className={`badge badge-${i.status === 'resolved' ? 'resolved' : i.safety_risk === 'high' ? 'high-risk' : 'pending'}`}>{(statusMeta[i.status]?.label || i.status)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="dash-col">
          {/* Heatmap panel (smaller) */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={15} color="var(--accent)" /> Issue Map
              </h3>
              <button
                onClick={() => setShowHeatmap(s => !s)}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              >
                <Layers size={12} /> {showHeatmap ? 'Heatmap' : 'Pins'}
              </button>
            </div>
            <div style={{ height: '300px', position: 'relative' }}>
              <MapComponent externalIssues={issues} forceHeatmap={showHeatmap} />
            </div>
          </div>

          {/* Top contributors */}
          <div className="card premium-card">
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={16} color="var(--warning)" /> Top Contributors
            </h3>
            {v.contributors.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No contributors yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {v.contributors.map((c, idx) => (
                  <div key={c.name + idx} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: idx === 0 ? 'var(--warning)' : 'var(--surface-hover)', color: idx === 0 ? '#000' : 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: '0.72rem', fontWeight: 800 }}>{idx + 1}</span>
                    <Users size={15} color="var(--muted)" />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>{c.score} pts</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/leaderboard" className="link-underline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
              Full leaderboard <ArrowRight size={13} />
            </Link>
          </div>

          {/* SLA / risk alert */}
          <div className="card premium-card" style={{ borderColor: v.overdue > 0 ? 'rgb(var(--destructive-rgb) / 0.4)' : 'var(--border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Radio size={16} color="var(--destructive)" /> SLA Watch
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--foreground-secondary)', lineHeight: 1.5 }}>
              {v.overdue > 0
                ? <><strong style={{ color: 'var(--destructive)' }}>{v.overdue}</strong> {v.overdue === 1 ? 'case has' : 'cases have'} breached their SLA window and should be escalated.</>
                : 'All active cases are within their SLA windows. 🎯'}
            </p>
            {v.escalated > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={13} color="var(--warning)" /> <strong style={{ color: 'var(--warning)' }}>{v.escalated}</strong> currently in the escalation cycle.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* All Reports — searchable + filterable table */}
      <div className="card premium-card" style={{ marginTop: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileSpreadsheet size={16} color="var(--accent)" /> All Reports ({reportRows.length})
          </h3>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, category, reporter…" className="input-field" style={{ paddingLeft: '2.1rem', fontSize: '0.82rem', minWidth: '220px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'in_progress', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${statusFilter === s ? 'var(--accent)' : 'var(--border)'}`,
              background: statusFilter === s ? 'rgb(var(--accent-rgb) / 0.12)' : 'transparent',
              color: statusFilter === s ? 'var(--accent)' : 'var(--foreground-secondary)',
            }}>{s === 'all' ? 'All' : (statusMeta[s]?.label || s)}</button>
          ))}
        </div>

        {reportRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
            No reports match. <Link href="/report" style={{ color: 'var(--accent)', fontWeight: 600 }}>Report an issue →</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Issue</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Category</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Reporter</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Status</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Priority</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map(i => (
                  <tr key={i.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.7rem 0.6rem', fontWeight: 600, maxWidth: '240px' }}>
                      <span style={{ marginRight: '0.4rem' }}>{categoryEmoji(i.category)}</span>{i.title}
                    </td>
                    <td style={{ padding: '0.7rem 0.6rem', color: 'var(--foreground-secondary)', whiteSpace: 'nowrap' }}>{i.category}</td>
                    <td style={{ padding: '0.7rem 0.6rem', color: 'var(--foreground-secondary)', whiteSpace: 'nowrap' }}>{i.reporter_name || '—'}</td>
                    <td style={{ padding: '0.7rem 0.6rem' }}>
                      <span className={`badge badge-${i.status === 'resolved' ? 'resolved' : i.safety_risk === 'high' ? 'high-risk' : 'pending'}`}>{statusMeta[i.status]?.label || i.status}</span>
                    </td>
                    <td style={{ padding: '0.7rem 0.6rem', fontWeight: 700, color: (i.priority_score || 0) >= 70 ? 'var(--destructive)' : 'var(--foreground-secondary)' }}>{i.priority_score || 0}</td>
                    <td style={{ padding: '0.7rem 0.6rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{timeAgo(i.created_at)}</td>
                    <td style={{ padding: '0.7rem 0.6rem' }}><Link href={`/issue/${i.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
