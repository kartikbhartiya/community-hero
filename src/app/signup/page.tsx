'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: boolean; message?: string } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setState({ error: 'All fields are required.' }); return; }
    setPending(true); setState(null);

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) { setState({ error: error.message }); setPending(false); return; }

    // Seed the public profile row.
    await supabase.from('users').upsert([{ email, name, hero_score: 0 }], { onConflict: 'email' });

    if (data.session) {
      // Email confirmation is off → already logged in.
      router.push('/dashboard'); router.refresh();
      return;
    }
    // Email confirmation is on.
    setState({ success: true, message: 'Account created! Please check your email to verify your account before logging in.' });
    setPending(false);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 70px)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'linear-gradient(to bottom, rgb(var(--primary-rgb) / 0.02), rgb(var(--secondary-rgb) / 0.02))'
    }}>
      <div className="card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Join Community Hero</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Start reporting and validating issues in your neighborhood.
          </p>
        </div>

        {state?.success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={48} color="var(--accent)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h3 style={{ marginBottom: '0.75rem' }}>Verify your email</h3>
            <p style={{ color: 'var(--foreground)', opacity: 0.8, fontSize: '0.95rem', lineHeight: 1.6 }}>
              {state.message}
            </p>
            <Link href="/login" className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 chars)"
                  minLength={6}
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            {state?.error && (
              <div style={{
                background: 'rgb(var(--destructive-rgb) / 0.1)',
                color: 'var(--destructive)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.9rem',
                border: '1px solid rgb(var(--destructive-rgb) / 0.2)'
              }}>
                {state.error}
              </div>
            )}

            <button
              disabled={pending}
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem 1rem', marginTop: '0.5rem' }}
            >
              {pending ? <><Loader2 className="pulse" size={18} /> Creating account...</> : 'Sign Up'}
            </button>
          </form>
        )}

        {!state?.success && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--muted)' }}>Already have an account? </span>
            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
