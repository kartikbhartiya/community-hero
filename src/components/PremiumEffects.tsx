'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Global UI helper, mounted once in the root layout.
 * Toggles the `route-home` body class so full-bleed routes (landing, map, embed)
 * drop the navbar top-padding while every other page keeps it.
 * (The premium card glow is pure CSS; no JS scroll-reveal — it caused content to hide.)
 */
export default function PremiumEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const fullBleed = pathname === '/' || pathname.startsWith('/map') || pathname.startsWith('/embed');
    document.body.classList.toggle('route-home', fullBleed);
  }, [pathname]);

  return null;
}
