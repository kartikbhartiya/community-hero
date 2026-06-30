'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, ShieldAlert, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserAndFetchNotifications();
    
    // Close dropdown on click outside
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);

    // Dynamic notification polling interval
    const interval = setInterval(() => {
      if (userEmail) fetchNotifications(userEmail);
    }, 15000);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      clearInterval(interval);
    };
  }, [userEmail]);

  const getUserAndFetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
      await fetchNotifications(user.email);
    }
  };

  const fetchNotifications = async (email: string) => {
    try {
      // 1. Fetch issues reported by user
      const { data: userIssues } = await supabase
        .from('issues')
        .select('id, title')
        .eq('reporter_email', email);

      if (userIssues && userIssues.length > 0) {
        const issueIds = userIssues.map(i => i.id);
        
        // 2. Fetch events for user issues
        const { data: events, error } = await supabase
          .from('issue_events')
          .select('id, type, message, created_at, issue_id')
          .in('issue_id', issueIds)
          .order('created_at', { ascending: false })
          .limit(8);

        if (!error && events) {
          // Map matching titles
          const enriched = events.map(event => {
            const match = userIssues.find(i => i.id === event.issue_id);
            return {
              ...event,
              issueTitle: match ? match.title : 'Reported Issue'
            };
          });

          // Check against last read timestamp stored in localStorage
          const lastRead = localStorage.getItem('last_notification_read_time') || '1970-01-01T00:00:00.000Z';
          const unread = enriched.filter(e => new Date(e.created_at) > new Date(lastRead)).length;
          
          setNotifications(enriched);
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.warn('Notifications fetch error:', err);
    }
  };

  const handleToggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
    if (!dropdownOpen) {
      setUnreadCount(0);
      localStorage.setItem('last_notification_read_time', new Date().toISOString());
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'resolved':
        return <CheckCircle size={14} color="var(--accent)" />;
      case 'escalated':
        return <AlertTriangle size={14} color="var(--destructive)" />;
      case 'in_progress':
        return <Clock size={14} color="var(--warning)" />;
      default:
        return <ShieldAlert size={14} color="var(--primary)" />;
    }
  };

  if (!userEmail) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      
      {/* Bell Icon Trigger */}
      <button 
        onClick={handleToggleDropdown}
        style={{
          background: 'none',
          border: 'none',
          color: dropdownOpen ? 'var(--accent)' : 'var(--muted)',
          cursor: 'pointer',
          padding: '0.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'color 0.25s ease'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            background: 'var(--destructive)',
            borderRadius: '50%',
            border: '2px solid var(--card)'
          }} />
        )}
      </button>

      {/* Notifications Dropdown menu */}
      {dropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '2.5rem',
          right: 0,
          background: 'rgb(var(--card-rgb) / 0.95)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '280px',
          maxHeight: '360px',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          padding: '0.5rem 0'
        }}>
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Platform Activity
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem' }}>
              No recent activity log found.
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.id} style={{
                padding: '0.65rem 1rem',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.78rem',
                lineHeight: 1.4,
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                color: 'var(--foreground-secondary)'
              }}>
                <div style={{ marginTop: '0.15rem' }}>{getEventIcon(notif.type)}</div>
                <div>
                  <div style={{ color: 'var(--foreground)', fontWeight: 600 }}>{notif.issueTitle}</div>
                  <div style={{ color: 'var(--foreground-secondary)' }}>{notif.message}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
