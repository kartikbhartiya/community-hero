'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

interface NavLinksProps {
  hasUser: boolean;
}

export default function NavLinks({ hasUser }: NavLinksProps) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Map' },
    { href: '/feed', label: 'Feed' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/scorecards', label: 'Scorecards' },
  ];

  const userLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/authority', label: 'Authority' },
  ];

  const activeLinks = hasUser ? [...links, ...userLinks] : links;

  return (
    <div className={styles.navLinksList}>
      {activeLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.link} ${isActive ? styles.activeLink : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
            {isActive && (
              <span className={styles.activeDot} />
            )}
          </Link>
        );
      })}
    </div>
  );
}
