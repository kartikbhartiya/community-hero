'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LogOut,
  User,
  Map,
  Home,
  LayoutDashboard,
  Trophy,
  Building2,
  FileSpreadsheet,
  Rss,
  PlusCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

const LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/feed', label: 'Feed', icon: Rss },
  { href: '/report', label: 'Report', icon: PlusCircle },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/scorecards', label: 'Scorecard', icon: FileSpreadsheet },
];

function ActiveBg() {
  return (
    <motion.span
      layoutId="nav-active"
      className="nav-active-bg"
      style={{ position: 'absolute', inset: 0, borderRadius: '99px', zIndex: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
    />
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthority, setIsAuthority] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const token = localStorage.getItem('auth_portal_token');
    if (token === 'auth_portal_verified_session') setIsAuthority(true);

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('auth_portal_token');
      setIsAuthority(currentToken === 'auth_portal_verified_session');
    }, 2000);

    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('auth_portal_token');
    setIsAuthority(false);
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const links = [...LINKS];
  if (isAuthority) links.push({ href: '/authority', label: 'Authority', icon: Building2 });

  return (
    <nav className="navbar">
      <motion.div
        className={`navpill ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -28, opacity: 0, filter: 'blur(6px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9 }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Logo */}
        <Link href="/" className="navpill-logo">
          <motion.span
            className="logo-badge"
            style={{ background: 'transparent', boxShadow: 'none', padding: 0, overflow: 'hidden' }}
            whileHover={{ rotate: -8, scale: 1.1 }}
            whileTap={{ scale: 0.92, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          >
            <motion.img
              src="/logo.png"
              alt="CommunityHero"
              style={{ width: '30px', height: '30px', objectFit: 'contain' }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.span>
          <span className="hide-sm" style={{ fontWeight: 800 }}>
            Community<span style={{ color: 'var(--accent)' }}>Hero</span>
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          {links.map((link, idx) => {
            const active = isActive(link.href);
            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                style={{ position: 'relative' }}
                onMouseEnter={() => setHovered(link.href)}
              >
                <Link
                  href={link.href}
                  className={`navpill-link ${active ? 'active' : ''}`}
                  style={{ position: 'relative' }}
                >
                  {active && <ActiveBg />}
                  {/* Hover halo (only when not active) */}
                  {!active && hovered === link.href && (
                    <motion.span
                      layoutId="nav-hover"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '99px',
                        background: 'var(--surface-hover)',
                        zIndex: 0,
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <motion.span
                    className="ico"
                    style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', zIndex: 2 }}
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.12 }}
                    transition={{ duration: 0.4 }}
                  >
                    <link.icon size={16} />
                  </motion.span>
                  <span className="label" style={{ position: 'relative', zIndex: 2 }}>{link.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <NotificationBell />
        <ThemeToggle />

        {/* Auth status / actions */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Link href="/dashboard" className="navpill-link hide-sm" title="My profile & dashboard" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
              <span className="ico" style={{ display: 'grid', placeItems: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>
                {(user.user_metadata?.name || user.email || 'U').charAt(0).toUpperCase()}
              </span>
              <span className="label" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.user_metadata?.name || user.email?.split('@')[0]}
              </span>
            </Link>
            <motion.button
              onClick={handleSignOut}
              className="navpill-link"
              title="Sign Out"
              style={{ color: 'var(--destructive)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="ico"><LogOut size={16} /></span>
              <span className="label">Exit</span>
            </motion.button>
          </div>
        ) : isAuthority ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Link href="/authority" className="navpill-link hide-sm" title="Authority console" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
              <span className="ico" style={{ display: 'grid', placeItems: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--info)', color: '#fff' }}>
                <Building2 size={13} />
              </span>
              <span className="label">Authority</span>
            </Link>
            <motion.button
              onClick={handleSignOut}
              className="navpill-link"
              title="Sign Out of Authority"
              style={{ color: 'var(--destructive)' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="ico"><LogOut size={16} /></span>
              <span className="label">Exit</span>
            </motion.button>
          </div>
        ) : (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link href="/login" className="navpill-link">
              <span className="ico"><User size={16} /></span>
              <span className="label">Sign In</span>
            </Link>
          </motion.div>
        )}
      </motion.div>
    </nav>
  );
}
