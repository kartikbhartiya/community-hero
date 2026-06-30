'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Flame, CheckSquare, Sparkles } from 'lucide-react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const CAROUSEL_ITEMS = [
  {
    image: '/cracked-road.webp',
    title: 'Potholes',
    description: 'Damaged roads reduce safety, slow traffic, and increase accidents.',
    category: 'Roads & Pavement'
  },
  {
    image: '/garbage-pile.png',
    title: 'Garbage Dump',
    description: 'Litter piles degrade public hygiene and invite health hazards.',
    category: 'Waste Management'
  },
  {
    image: '/street-lamp.png',
    title: 'Broken Streetlight',
    description: 'Darkened streets reduce safety, invite crime, and lower visibility.',
    category: 'Electricity & Lighting'
  },
  {
    image: '/puddle.png',
    title: 'Open Drain',
    description: 'Uncovered sewer channels breed pests and cause pedestrian hazards.',
    category: 'Sanitation & Drainage'
  },
  {
    image: '/rusty-barrel.png',
    title: 'Water Leakage',
    description: 'Unresolved pipe leaks waste fresh water and cause street flooding.',
    category: 'Water Board (WSSB)'
  },
  {
    image: '/cracked-road.webp',
    title: 'Broken Footpath',
    description: 'Cracked walkways force pedestrians onto active roadways, risking safety.',
    category: 'Pedestrian Pathways'
  }
];

// Decoupled, GPU hardware-accelerated Semicircular Half-Wheel Carousel component
function HalfWheelCarousel() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Angle tracking in refs to avoid 60fps React state updates
  const wheelAngleRef = useRef(180);
  const targetAngleRef = useRef(180);
  const isHoveredRef = useRef(false);
  const isDraggingRef = useRef(false);
  
  const dragStartY = useRef(0);
  const dragStartAngle = useRef(0);
  
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [spotlight, setSpotlight] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    setHasMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute active item index based on proximity to 180°
  const getActiveIndexAt = (angle: number) => {
    let bestIndex = 0;
    let minDiff = 360;
    
    CAROUSEL_ITEMS.forEach((_, index) => {
      const baseAngle = index * (360 / CAROUSEL_ITEMS.length);
      const cardAngle = (baseAngle + angle + 360) % 360;
      const diff = Math.abs(cardAngle - 180);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = index;
      }
    });
    return bestIndex;
  };

  // Continuous wheel angle interpolation (lerp) loop running on AnimationFrame
  useEffect(() => {
    if (!hasMounted) return;
    let animationFrameId: number;
    let lastTime = performance.now();
    
    // 22 seconds per full revolution anti-clockwise -> ~16.3 degrees per second
    const speed = -16.3 / 1000; 

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (!isHoveredRef.current && !isDraggingRef.current) {
        // Advance target angle continuously anti-clockwise
        targetAngleRef.current = (targetAngleRef.current + delta * speed + 360) % 360;
      }

      // Smoothly interpolate current wheel angle to target angle using spring ease lerp
      let diff = targetAngleRef.current - wheelAngleRef.current;
      while (diff < -180) diff += 360;
      while (diff > 180) diff -= 360;
      wheelAngleRef.current = (wheelAngleRef.current + diff * 0.095 + 360) % 360;

      const currentActive = getActiveIndexAt(wheelAngleRef.current);
      
      const radius = isMobile ? 185 : 430;

      // Update DOM styles of all cards directly without triggering React rerenders
      CAROUSEL_ITEMS.forEach((item, index) => {
        const cardEl = cardsRef.current[index];
        if (!cardEl) return;

        const baseAngle = index * (360 / CAROUSEL_ITEMS.length);
        const cardAngle = (baseAngle + wheelAngleRef.current + 360) % 360;
        const isVisible = cardAngle >= 85 && cardAngle <= 275;
        
        const cardDiff = Math.abs(cardAngle - 180);
        const prox = Math.max(0, 1 - cardDiff / 90);
        const isActive = index === currentActive;

        // Trigonometric mapping
        const rad = (cardAngle * Math.PI) / 180;
        const x = radius * Math.cos(rad);
        const y = radius * Math.sin(rad);

        const scale = isActive ? 1.0 : (0.58 + 0.42 * prox);
        const opacity = isVisible ? (0.15 + 0.85 * prox) : 0;
        const blur = isVisible ? Math.max(0, 3.5 * (1 - prox)) : 4;

        // Apply GPU accelerated translate3d and scale
        cardEl.style.transform = `translate3d(${x}px, ${y}px, 0px) scale(${scale})`;
        cardEl.style.opacity = opacity.toString();
        cardEl.style.zIndex = Math.round(10 + prox * 10).toString();
        cardEl.style.pointerEvents = isActive ? 'auto' : (isVisible ? 'auto' : 'none');
        
        // Update container filter (brightness only, to prevent chrome backdrop filter blur bugs)
        cardEl.style.filter = isVisible ? `brightness(${0.45 + 0.55 * prox})` : 'brightness(0.2)';

        // Update image blur filter directly
        const imgEl = cardEl.querySelector('img');
        if (imgEl) {
          imgEl.style.filter = isActive 
            ? 'grayscale(0) contrast(1.15) brightness(1)' 
            : `grayscale(1) contrast(1) brightness(0.42) blur(${blur}px)`;
        }
      });

      // Only set state (trigger React rerender) when the active card changes to update borders/badges/indicators
      setActiveIndex((prev) => {
        if (prev !== currentActive) {
          return currentActive;
        }
        return prev;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [hasMounted, isMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartY.current = e.clientY;
    dragStartAngle.current = targetAngleRef.current;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpotlight({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (!isDraggingRef.current) return;
    const deltaY = e.clientY - dragStartY.current;
    const deltaAngle = deltaY / 4.5;
    targetAngleRef.current = (dragStartAngle.current - deltaAngle + 360) % 360;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    isHoveredRef.current = false;
  };

  const handleCardClick = (index: number) => {
    const baseAngle = index * (360 / CAROUSEL_ITEMS.length);
    targetAngleRef.current = (180 - baseAngle + 360) % 360;
  };

  if (!hasMounted) {
    return (
      <div style={{
        position: 'absolute',
        right: '-15%',
        width: '650px',
        height: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} />
    );
  }

  const cardWidth = isMobile ? 160 : 290;
  const cardHeight = isMobile ? 245 : 400;
  const yOffset = isMobile ? 122 : 200;

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: isMobile ? '380px' : '550px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11
      }}
    >
      {/* Ambient green radial spotlight behind the active card */}
      <div style={{
        position: 'absolute',
        width: isMobile ? '240px' : '420px',
        height: isMobile ? '240px' : '420px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-tint) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(30px)',
        right: '-10%',
        zIndex: 1
      }} />

      {/* Carousel Wheel Wrapper (Center is on the right edge) */}
      <div 
        onMouseEnter={() => { isHoveredRef.current = true; }}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          position: 'absolute',
          right: isMobile ? '-10%' : '-16%',
          width: isMobile ? '380px' : '650px',
          height: isMobile ? '380px' : '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
      >
        {CAROUSEL_ITEMS.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div 
              key={index} 
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick(index);
              }}
              style={{
                position: 'absolute' as const,
                right: '0px',
                top: '50%',
                marginTop: `-${yOffset}px`, // center vertically
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                transformOrigin: 'center center',
                background: isActive ? 'var(--card-2)' : 'var(--card)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isActive 
                  ? 'var(--shadow-lg), var(--shadow-glow)' 
                  : 'var(--shadow-sm)',
                borderRadius: isMobile ? '16px' : '24px',
                padding: isMobile ? '1rem 0.75rem' : '1.75rem 1.5rem',
                display: 'flex',
                flexDirection: 'column' as const,
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center' as const,
                cursor: 'pointer',
                transition: 'border 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), background 0.35s var(--ease-out)'
              }}
            >
              {/* Premium Glow effect behind active card */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '-15px',
                  right: '-15px',
                  bottom: '-15px',
                  borderRadius: isMobile ? '20px' : '30px',
                  background: 'radial-gradient(circle, var(--accent-tint) 0%, transparent 75%)',
                  pointerEvents: 'none',
                  zIndex: -1
                }} />
              )}

              {/* Glowing category tag */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isActive ? 'var(--accent-tint)' : 'var(--surface-hover)',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                padding: isMobile ? '0.2rem 0.5rem' : '0.35rem 0.75rem',
                borderRadius: '100px',
                fontSize: isMobile ? '0.58rem' : '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'all 0.3s ease'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--accent)' : 'var(--muted)',
                  boxShadow: isActive ? '0 0 8px var(--accent)' : 'none',
                  display: 'inline-block'
                }} />
                {item.category}
              </div>

              {/* Image box */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: isMobile ? '80px' : '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: isMobile ? '0.5rem 0' : '1rem 0'
              }}>
                <img 
                  src={item.image} 
                  alt={item.title}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    transition: 'all 0.4s ease'
                  }}
                />
              </div>

              {/* Meta text details */}
              <div>
                <h3 style={{ 
                  fontSize: isMobile ? '0.9rem' : '1.2rem', 
                  fontWeight: 800, 
                  color: isActive ? 'var(--accent)' : 'var(--foreground)',
                  marginBottom: isMobile ? '0.35rem' : '0.5rem',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  letterSpacing: '-0.01em',
                  transition: 'color 0.35s ease'
                }}>
                  {item.title}
                </h3>
                <p style={{ 
                  fontSize: isMobile ? '0.7rem' : '0.8rem', 
                  color: 'var(--muted)',
                  lineHeight: isMobile ? 1.45 : 1.55,
                  margin: 0,
                  transition: 'color 0.35s ease'
                }}>
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicator Dot Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginTop: 'auto',
        paddingTop: isMobile ? '17rem' : '28rem', // align dots below the bulging wheel cards
        justifyContent: 'center',
        zIndex: 12
      }}>
        {CAROUSEL_ITEMS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleCardClick(idx)}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              border: 'none',
              padding: 0,
              background: idx === activeIndex ? 'var(--accent)' : 'var(--border-strong)',
              transition: 'all 0.4s ease',
              cursor: 'pointer',
              transform: idx === activeIndex ? 'scale(1.25)' : 'scale(1)'
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [spotlight, setSpotlight] = useState({ x: -1000, y: -1000 });
  const [heroActive, setHeroActive] = useState(false);

  useEffect(() => {
    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: any) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 2. GSAP Entrance Animations
    const ctx = gsap.context(() => {
      const titleWords = textContainerRef.current?.querySelectorAll('.reveal-word');
      if (titleWords) {
        gsap.fromTo(titleWords,
          { opacity: 0.1, y: 15 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }
        );
      }

      gsap.fromTo('.hero-para',
        { opacity: 0, y: 15 },
        { opacity: 0.75, y: 0, duration: 1, ease: 'power3.out', delay: 0.4 }
      );

      gsap.fromTo('.hero-btn',
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.3)', delay: 0.6 }
      );

      const cards = bentoRef.current?.querySelectorAll('.premium-card');
      if (cards) {
        gsap.fromTo(cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: bentoRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          }
        );
      }

      const statNumbers = statsRef.current?.querySelectorAll('.stat-number');
      if (statNumbers) {
        statNumbers.forEach((statNum: any) => {
          const targetVal = parseInt(statNum.getAttribute('data-target') || '0', 10);
          const obj = { value: 0 };
          gsap.to(obj, {
            value: targetVal,
            duration: 1.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: statsRef.current,
              start: 'top 90%',
            },
            onUpdate: () => {
              statNum.innerText = Math.floor(obj.value).toLocaleString() + '+';
            }
          });
        });
      }
    }, containerRef);

    return () => {
      ctx.revert();
      lenis.destroy();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setSpotlight({ x: e.clientX, y: e.clientY });
    setHeroActive(true);
  };

  const handleMouseLeave = () => {
    setHeroActive(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        position: 'relative',
        fontFamily: "'Inter', sans-serif",
        overflowX: 'hidden'
      }}
    >

      {/* Spotlight glow — only active while the cursor is within the hero */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99,
        opacity: heroActive ? 1 : 0,
        transition: 'opacity 0.3s ease',
        background: `radial-gradient(450px at ${spotlight.x}px ${spotlight.y}px, var(--accent-glow), transparent 85%)`
      }} />

      {/* Hero Section */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '7rem 1.25rem 4rem 1.25rem' : '6rem 2rem 5rem 2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle grid mesh background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.08,
          zIndex: 1,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
          alignItems: 'center',
          gap: isMobile ? '2.5rem' : '5rem',
          position: 'relative',
          zIndex: 10
        }}>
          
          {/* Left Text Column */}
          <div ref={textContainerRef} style={{ maxWidth: '580px', zIndex: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-tint)', color: 'var(--accent)', padding: '0.4rem 0.8rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
              <Sparkles size={12} /> Hyperlocal Civic Platform
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
              lineHeight: 1.05,
              fontWeight: 800,
              marginBottom: '1.5rem',
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              <span className="reveal-word">Rebuilding</span><br />
              <span className="reveal-word">Our</span>{' '}
              <span className="reveal-word" style={{ color: 'var(--accent)' }}>City</span>{' '}
              <span className="reveal-word" style={{ color: 'var(--accent)' }}>Together.</span>
            </h1>

            <p className="hero-para" style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              lineHeight: 1.6,
              color: 'var(--muted)',
              marginBottom: '2.5rem',
              maxWidth: '520px'
            }}>
              Report local hazards and broken infrastructure. Validated instantly by Gemini Vision AI, backed collectively by neighbors, and dispatched directly to municipal bodies under strict SLA countdowns.
            </p>

            <div className="hero-btn" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/report" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                File a Report <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '0.85rem 2rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                View Dashboard
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Apple-style Semicircular Carousel Showcase */}
          <HalfWheelCarousel />

        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} style={{ padding: '5rem 1.5rem', background: 'var(--background-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '3rem', textAlign: 'center' }}>
          <div>
            <h2 className="stat-number" data-target="1200" style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>0+</h2>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--muted)', marginTop: '0.35rem', fontWeight: 600 }}>Validated Reports</p>
          </div>
          <div>
            <h2 className="stat-number" data-target="380" style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>0+</h2>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--muted)', marginTop: '0.35rem', fontWeight: 600 }}>Resolved SLA Cases</p>
          </div>
          <div>
            <h2 className="stat-number" data-target="99" style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>0+</h2>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'var(--muted)', marginTop: '0.35rem', fontWeight: 600 }}>AI Analysis Accuracy</p>
          </div>
        </div>
      </section>

      {/* Live Activity Ticker (Infinite Marquee) */}
      <div className="marquee-container" style={{ background: 'var(--card-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="marquee-content">
          {[
            { text: "PWD field crew dispatched to Ward 12 for Pothole repair", color: "var(--accent)" },
            { text: "Garbage dumping issue resolved on MG Road within 12h", color: "var(--accent)" },
            { text: "AI routed active sewage leakage complaint to WSSB Division", color: "var(--accent)" },
            { text: "DISCOM crew replacing broken streetlights in Ward 7", color: "var(--accent)" },
            { text: "Horticulture Department cleared fallen tree blocking arterial road", color: "var(--accent)" },
            { text: "Citizen validated high-risk manhole repair on Residency Road", color: "var(--accent)" },
          ].map((item, idx) => (
            <div key={idx} className="marquee-item" style={{ color: 'var(--foreground)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }}></span>
              <span>{item.text}</span>
            </div>
          ))}
          {/* Duplicate list to ensure clean gapless infinite loop */}
          {[
            { text: "PWD field crew dispatched to Ward 12 for Pothole repair", color: "var(--accent)" },
            { text: "Garbage dumping issue resolved on MG Road within 12h", color: "var(--accent)" },
            { text: "AI routed active sewage leakage complaint to WSSB Division", color: "var(--accent)" },
            { text: "DISCOM crew replacing broken streetlights in Ward 7", color: "var(--accent)" },
            { text: "Horticulture Department cleared fallen tree blocking arterial road", color: "var(--accent)" },
            { text: "Citizen validated high-risk manhole repair on Residency Road", color: "var(--accent)" },
          ].map((item, idx) => (
            <div key={`dup-${idx}`} className="marquee-item" style={{ color: 'var(--foreground)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }}></span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bento Grid (Interest Section) */}
      <section ref={bentoRef} style={{ padding: '8rem 1.5rem', background: 'var(--background)' }}>
        <div className="container">
          <div style={{ marginBottom: '5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Engine Architecture</span>
            <h2 className="shimmer-text" style={{ fontSize: '2.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: '0.5rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Civic Infrastructure Engine</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '1.5rem'
          }}>
            
            <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '0.8rem', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                <Flame size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Agentic AI Routing</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Our AI agent parses complaints and auto-routes them to the correct Indian department (PWD, SWM, WSSB) with formatted official correspondence.
                </p>
              </div>
            </div>

            <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '0.8rem', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gemini Vision Check</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Strict pre-posting image analysis. Every photo is validated using Gemini Vision to filter selfies, spam, and invalid reports.
                </p>
              </div>
            </div>

            <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem', background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '0.8rem', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>SLA Enforcement</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Automated SLA countdown tracking based on severity. Delayed updates trigger automatic escalations to local municipal commissioners.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Action Footer Call-to-Action */}
      <section style={{ padding: '8rem 1.5rem', textAlign: 'center', background: 'var(--background-secondary)', borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Ready to shape your neighborhood?
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
            Create an account in seconds to begin reporting, validating, and holding local authorities accountable.
          </p>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Create Account & Get Started
          </Link>
        </div>
      </section>

      {/* Mini Footer */}
      <footer style={{ padding: '2rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--background)', fontSize: '0.85rem', color: 'var(--muted)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span>© {new Date().getFullYear()} Community Hero. Designed in Stripe/Linear style.</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/">Home</Link>
            <Link href="/feed">Feed</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
