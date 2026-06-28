import Link from 'next/link';
import { ShieldAlert, PlusCircle, LogOut, User } from 'lucide-react';
import styles from './Navbar.module.css';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/app/actions/auth';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.brand}>
          <ShieldAlert className={styles.brandIcon} size={28} />
          Community Hero
        </Link>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.link}>
            Map
          </Link>
          <Link href="/feed" className={styles.link}>
            Feed
          </Link>
          {user && (
            <Link href="/dashboard" className={styles.link}>
              Dashboard
            </Link>
          )}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link href="/report" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <PlusCircle size={18} />
                Report
              </Link>
              <span style={{ fontSize: '0.85rem', color: '#737373', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <User size={14} /> {user.user_metadata?.name || user.email}
              </span>
              <form action={signOutAction} style={{ display: 'inline' }}>
                <button type="submit" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  <LogOut size={14} />
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link href="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Log In
              </Link>
              <Link href="/signup" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
