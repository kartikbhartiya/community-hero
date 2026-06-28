import Link from 'next/link';
import { Map, LayoutDashboard, PlusCircle, ShieldAlert } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
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
          <Link href="/dashboard" className={styles.link}>
            Dashboard
          </Link>
          <Link href="/report" className="btn btn-primary" style={{ marginLeft: '0.5rem' }}>
            <PlusCircle size={18} />
            Report Issue
          </Link>
        </div>
      </div>
    </nav>
  );
}
