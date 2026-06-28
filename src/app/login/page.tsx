'use client';

import { useActionState, useEffect, useState, Suspense } from 'react';
import { signIn } from '@/app/actions/auth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

function LoginFormContent() {
  const [state, action, pending] = useActionState(signIn, null);
  const searchParams = useSearchParams();
  const [errorParam, setErrorParam] = useState<string | null>(null);

  useEffect(() => {
    setErrorParam(searchParams.get('error'));
  }, [searchParams]);

  return (
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
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Welcome Back</h2>
        <p style={{ color: '#737373', fontSize: '0.95rem', marginTop: '0.5rem' }}>
          Log in to manage and validate hyperlocal community issues.
        </p>
      </div>

      {errorParam && (
        <div style={{
          background: 'hsla(var(--warning), 0.1)',
          color: 'hsl(var(--warning))',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          fontSize: '0.9rem',
          border: '1px solid hsla(var(--warning), 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorParam}</span>
        </div>
      )}

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
          {pending ? <><Loader2 className="pulse" size={18} /> Logging in...</> : 'Log In'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
        <span style={{ color: '#737373' }}>Don\'t have an account? </span>
        <Link href="/signup" style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>
          Sign Up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 70px)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'linear-gradient(to bottom, hsla(var(--primary), 0.02), hsla(var(--secondary), 0.02))'
    }}>
      <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#737373' }}>Loading login form...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
