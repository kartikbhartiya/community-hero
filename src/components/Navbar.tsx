import Link from 'next/link';
import { PlusCircle, LogOut, User } from 'lucide-react';
import styles from './Navbar.module.css';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/app/actions/auth';
import NotificationBell from './NotificationBell';
import NavLinks from './NavLinks';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="nav-capsule">
      <div className={styles.container}>
        
        {/* Brand logo section */}
        <Link href="/" className={styles.brand}>
          <img 
            src="/logo.png" 
            alt="Community Hero Logo" 
            style={{ 
              height: '36px', 
              width: 'auto', 
              borderRadius: '6px',
              display: 'block'
            }} 
          />
          <span style={{ fontSize: '1.2rem', color: '#ffffff' }}>Community Hero</span>
        </Link>

        {/* Navigation links & actions */}
        <div className={styles.navLinks}>
          
          <NavLinks hasUser={!!user} />

          {user ? (
            <div className={styles.userSection}>
              
              <NotificationBell />

              <Link 
                href="/report" 
                className="btn btn-primary navbar-btn-primary" 
                style={{ 
                  padding: '0.6rem 1.4rem', 
                  borderRadius: '99px', 
                  fontSize: '0.82rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <PlusCircle size={15} />
                Report
              </Link>

              <span className={styles.username}>
                <span className={styles.avatar}>
                  <User size={13} />
                </span>
                {user.user_metadata?.name || user.email}
              </span>

              <form action={signOutAction} style={{ display: 'inline', margin: 0, padding: 0 }}>
                <button 
                  type="submit" 
                  className="btn btn-secondary navbar-btn-secondary" 
                  style={{ 
                    padding: '0.6rem 1.4rem', 
                    borderRadius: '99px', 
                    fontSize: '0.82rem', 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#d1d5db',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={13} />
                  Sign Out
                </button>
              </form>

            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <Link 
                href="/login" 
                className="btn btn-secondary navbar-btn-secondary" 
                style={{ 
                  padding: '0.6rem 1.4rem', 
                  borderRadius: '99px', 
                  fontSize: '0.82rem', 
                  fontWeight: 600,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#d1d5db',
                  cursor: 'pointer'
                }}
              >
                Log In
              </Link>
              <Link 
                href="/signup" 
                className="btn btn-primary navbar-btn-primary" 
                style={{ 
                  padding: '0.6rem 1.4rem', 
                  borderRadius: '99px', 
                  fontSize: '0.82rem', 
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
}
