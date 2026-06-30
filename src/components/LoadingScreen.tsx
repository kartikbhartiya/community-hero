'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setShow(false); } };
    // Minimum on-screen time for the animation to read, then dismiss once loaded.
    const min = setTimeout(() => {
      if (document.readyState === 'complete') finish();
      else window.addEventListener('load', finish, { once: true });
    }, 1500);
    // Hard cap so it can never get stuck.
    const cap = setTimeout(finish, 4000);
    return () => { clearTimeout(min); clearTimeout(cap); window.removeEventListener('load', finish); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="ch-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100000, display: 'grid', placeItems: 'center',
            background: 'var(--background)', overflow: 'hidden',
          }}
        >
          {/* ambient glow */}
          <motion.div
            animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: '680px', height: '680px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgb(var(--accent-rgb) / 0.18), transparent 60%)',
              filter: 'blur(40px)', pointerEvents: 'none',
            }}
          />
          {/* grid mesh */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }} />

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            {/* Logo with rotating conic aura ring */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 13 }}
              style={{ position: 'relative', width: '104px', height: '104px', display: 'grid', placeItems: 'center' }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: '-12px', borderRadius: '50%',
                  background: 'conic-gradient(from 0deg, transparent, var(--accent), var(--info), transparent 78%)',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))',
                }}
              />
              <motion.img
                src="/logo.png" alt="Community Hero" width={68} height={68}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 26px rgb(var(--accent-rgb) / 0.45))' }}
              />
            </motion.div>

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                Community<span style={{ color: 'var(--accent)' }}>Hero</span>
              </div>
              <div className="shimmer-text" style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '0.3rem', letterSpacing: '0.02em' }}>
                Mobilising civic intelligence…
              </div>
            </motion.div>

            {/* Progress bar */}
            <div style={{ width: '230px', height: '5px', borderRadius: '99px', background: 'var(--secondary)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: ['0%', '40%', '72%', '100%'] }}
                transition={{ duration: 1.7, ease: 'easeInOut', times: [0, 0.4, 0.75, 1] }}
                style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, var(--accent), var(--info))' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
