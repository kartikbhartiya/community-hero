'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, AlertCircle, User, Building2, KeyRound, ArrowRight, Sparkles } from 'lucide-react';

type Mode = 'citizen' | 'authority';

const DEMO_EMAIL = 'demo@communityhero.app';
const DEMO_PASSWORD = 'demohero123';

function CitizenForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'login' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setError(searchParams.get('error')); }, [searchParams]);

  const finish = () => { router.push('/dashboard'); router.refresh(); };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('login'); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setBusy(null); return; }
    finish();
  };

  const doDemo = async () => {
    setBusy('demo'); setError(null);
    const res = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (res.error) {
      setError(
        `Demo account isn't set up yet. One-time setup: Sign Up with ${DEMO_EMAIL} / ${DEMO_PASSWORD}, confirm the verification email, then this button signs you in instantly.`
      );
      setBusy(null);
      return;
    }
    finish();
  };

  return (
    <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {error && <Banner tone="warning">{error}</Banner>}
      <Field label="Email Address" icon={<Mail size={18} />}>
        <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
          className="input-field" style={{ paddingLeft: '2.6rem' }} required />
      </Field>
      <Field label="Password" icon={<Lock size={18} />}>
        <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
          className="input-field" style={{ paddingLeft: '2.6rem' }} required />
      </Field>
      <motion.button whileTap={{ scale: 0.98 }} disabled={!!busy} type="submit"
        className="btn btn-primary" style={{ width: '100%', padding: '0.8rem 1rem', marginTop: '0.25rem' }}>
        {busy === 'login' ? <><Loader2 className="spin" size={18} /> Logging in...</> : <>Log In <ArrowRight size={16} /></>}
      </motion.button>

      {/* Hackathon demo shortcut */}
      <motion.button whileTap={{ scale: 0.98 }} disabled={!!busy} type="button" onClick={doDemo}
        className="btn btn-secondary" style={{ width: '100%', padding: '0.8rem 1rem' }}>
        {busy === 'demo' ? <><Loader2 className="spin" size={18} /> Loading demo…</> : <><Sparkles size={16} /> Try the Demo Account</>}
      </motion.button>

      <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
        <span style={{ color: 'var(--muted)' }}>Don&apos;t have an account? </span>
        <Link href="/signup" className="link-underline" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign Up</Link>
      </div>
    </form>
  );
}

function AuthorityForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'login' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = async (pwd: string, kind: 'login' | 'demo') => {
    setBusy(kind); setError(null);
    try {
      const res = await fetch('/api/authority/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('auth_portal_token', data.token);
        router.push('/authority');
        router.refresh();
      } else {
        setError(data.error || 'Access denied. Invalid password.');
        setBusy(null);
      }
    } catch (err: any) {
      setError(err.message || 'Could not reach the authority portal.');
      setBusy(null);
    }
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); login(password, 'login'); };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: 'rgb(var(--info-rgb) / 0.08)', border: '1px solid rgb(var(--info-rgb) / 0.2)', color: 'var(--info)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius)', fontSize: '0.8rem' }}>
        <Building2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>Restricted municipal console. Enter the department access key issued to your office.</span>
      </div>
      <Field label="Authority Access Key" icon={<KeyRound size={18} />}>
        <input type="password" placeholder="Department passcode" value={password}
          onChange={(e) => setPassword(e.target.value)} className="input-field"
          style={{ paddingLeft: '2.6rem' }} required autoFocus />
      </Field>
      {error && <Banner tone="destructive">{error}</Banner>}
      <motion.button whileTap={{ scale: 0.98 }} disabled={!!busy || !password} type="submit"
        className="btn btn-primary" style={{ width: '100%', padding: '0.8rem 1rem', marginTop: '0.25rem' }}>
        {busy === 'login' ? <><Loader2 className="spin" size={18} /> Verifying...</> : <>Enter Console <ArrowRight size={16} /></>}
      </motion.button>

      {/* Hackathon demo shortcut */}
      <motion.button whileTap={{ scale: 0.98 }} disabled={!!busy} type="button" onClick={() => login('admin123', 'demo')}
        className="btn btn-secondary" style={{ width: '100%', padding: '0.8rem 1rem' }}>
        {busy === 'demo' ? <><Loader2 className="spin" size={18} /> Entering…</> : <><Sparkles size={16} /> Quick Authority Login (for demo only)</>}
      </motion.button>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'inline-flex' }}>{icon}</span>
        {children}
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'warning' | 'destructive'; children: React.ReactNode }) {
  const rgb = tone === 'warning' ? 'var(--warning-rgb)' : 'var(--destructive-rgb)';
  const color = tone === 'warning' ? 'var(--warning)' : 'var(--destructive)';
  return (
    <div style={{ background: `rgb(${rgb} / 0.1)`, color, padding: '0.7rem 0.9rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', border: `1px solid rgb(${rgb} / 0.25)`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <AlertCircle size={16} style={{ flexShrink: 0 }} /> <span>{children}</span>
    </div>
  );
}

function LoginShell() {
  const [mode, setMode] = useState<Mode>('citizen');
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      style={{ maxWidth: '440px', width: '100%', padding: '2.25rem 2rem' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <motion.img src="/logo.png" alt="CommunityHero" style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '0.75rem' }}
          animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
        <h2 style={{ fontSize: '1.7rem', fontWeight: 800 }}>
          {mode === 'citizen' ? 'Welcome Back' : 'Authority Portal'}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
          {mode === 'citizen'
            ? 'Log in to report and validate hyperlocal issues.'
            : 'Secure access for municipal departments.'}
        </p>
      </div>

      {/* Mode switch */}
      <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '0.3rem', marginBottom: '1.5rem' }}>
        {(['citizen', 'authority'] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer',
            padding: '0.5rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.85rem',
            color: mode === m ? 'var(--primary-foreground)' : 'var(--muted)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', gap: '0.4rem', zIndex: 1,
          }}>
            {mode === m && (
              <motion.span layoutId="login-mode" style={{ position: 'absolute', inset: 0, background: 'var(--accent)', borderRadius: 'var(--radius-full)', zIndex: -1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
            )}
            {m === 'citizen' ? <User size={15} /> : <Building2 size={15} />}
            {m === 'citizen' ? 'Citizen' : 'Authority'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={mode}
          initial={{ opacity: 0, x: mode === 'citizen' ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: mode === 'citizen' ? 16 : -16 }}
          transition={{ duration: 0.22 }}
        >
          {mode === 'citizen' ? <CitizenForm /> : <AuthorityForm />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex', minHeight: 'calc(100dvh - 160px)', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', position: 'relative',
    }}>
      {/* ambient glow */}
      <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '420px', height: '420px', background: 'radial-gradient(circle, rgb(var(--accent-rgb) / 0.12), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}>
        <LoginShell />
      </Suspense>
    </div>
  );
}
