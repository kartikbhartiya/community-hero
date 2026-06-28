'use client';

import { useActionState, useEffect, useState } from 'react';
import { signUp } from '@/app/actions/auth';
import Link from 'next/link';
import { ShieldAlert, Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 70px)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'linear-gradient(to bottom, hsla(var(--primary), 0.02), hsla(var(--secondary), 0.02))'
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
          <p style={{ color: '#737373', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Start reporting and validating issues in your neighborhood.
          </p>
        </div>

        {state?.success ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <CheckCircle2 size={48} color="hsl(var(--accent))" style={{ margin: '0 auto 1.5rem auto' }} />
            <h3 style={{ marginBottom: '0.75rem' }}>Verify your email</h3>
            <p style={{ color: 'hsl(var(--foreground))', opacity: 0.8, fontSize: '0.95rem', lineHeight: 1.6 }}>
              {state.message}
            </p>
            <Link href="/login" className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <input type="hidden" name="origin" value={origin} />

            <div>
              <label htmlFor="name" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
                <input
                  id="name"
                  name="name"
                  type="text"
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
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
                <input
                  id="email"
                  name="email"
                  type="email"
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
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            {state?.error && (
              <div style={{
                background: 'hsla(var(--destructive), 0.1)',
                color: 'hsl(var(--destructive))',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.9rem',
                border: '1px solid hsla(var(--destructive), 0.2)'
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
            <span style={{ color: '#737373' }}>Already have an account? </span>
            <Link href="/login" style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>
              Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
