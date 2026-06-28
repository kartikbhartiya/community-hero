'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MapComponent from '@/components/MapComponent';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Flame, Users, Calendar, Activity, Database, CheckSquare } from 'lucide-react';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const tiltContainerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const bentoRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  
  // Custom cursor spotlight coordinates
  const [spotlight, setSpotlight] = useState({ x: -1000, y: -1000 });

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

    // Sync ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    // 2. Cinematic Text Reveal Animations
    const ctx = gsap.context(() => {
      // Word-by-word reveal for title
      const titleWords = textContainerRef.current?.querySelectorAll('.reveal-word');
      if (titleWords) {
        gsap.fromTo(titleWords,
          { opacity: 0.1, y: 15 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }
        );
      }

      // Paragraph fade-up
      gsap.fromTo('.hero-para',
        { opacity: 0, y: 20 },
        { opacity: 0.8, y: 0, duration: 1, ease: 'power3.out', delay: 0.5 }
      );

      // Buttons scale entry
      gsap.fromTo('.hero-btn',
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)', delay: 0.7 }
      );

      // Bento cards scroll stagger
      const cards = bentoRef.current?.querySelectorAll('.premium-card');
      if (cards) {
        gsap.fromTo(cards,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: bentoRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none'
            }
          }
        );
      }

      // Stats numbers counting animation
      const statNumbers = statsRef.current?.querySelectorAll('.stat-number');
      if (statNumbers) {
        statNumbers.forEach((statNum: any) => {
          const targetVal = parseInt(statNum.getAttribute('data-target') || '0', 10);
          const obj = { value: 0 };
          gsap.to(obj, {
            value: targetVal,
            duration: 2,
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

      // Map container parallax zoom scale
      gsap.fromTo(mapSectionRef.current,
        { scale: 0.95, borderRadius: '24px' },
        {
          scale: 1,
          borderRadius: '0px',
          scrollTrigger: {
            trigger: mapSectionRef.current,
            start: 'top 95%',
            end: 'top 20%',
            scrub: true
          }
        }
      );
    }, containerRef);

    return () => {
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  // 3D Tilt mouse hover animation for the Hero content card
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = tiltContainerRef.current;
    if (!card) return;
    
    // Spotlight updates
    setSpotlight({ x: e.clientX, y: e.clientY });

    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    // Tight limits for premium look (< 4 degrees)
    const tiltX = (y / (box.height / 2)) * -3.5;
    const tiltY = (x / (box.width / 2)) * 3.5;

    gsap.to(card, {
      transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.005, 1.005, 1.005)`,
      duration: 0.6,
      ease: 'power3.out'
    });
  };

  const handleMouseLeave = () => {
    const card = tiltContainerRef.current;
    if (!card) return;

    setSpotlight({ x: -1000, y: -1000 }); // hide spotlight

    gsap.to(card, {
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      duration: 0.6,
      ease: 'power3.out'
    });
  };

  return (
    <div 
      ref={containerRef} 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        background: 'hsl(var(--background))', 
        color: 'hsl(var(--foreground))',
        position: 'relative'
      }}
    >
      
      {/* Vercel-style cursor spotlight overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99,
        background: `radial-gradient(500px at ${spotlight.x}px ${spotlight.y}px, hsla(var(--primary), 0.05), transparent 80%)`
      }} />

      {/* Hero Section */}
      <section ref={heroRef} style={{
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '6rem 1.5rem',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden'
      }}>
        {/* Animated Map background layered under the hero */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.15,
          zIndex: -1,
          pointerEvents: 'none',
          filter: 'grayscale(100%)'
        }}>
          <MapComponent />
        </div>

        {/* 3D Tilt interactive container */}
        <div 
          ref={tiltContainerRef}
          style={{ 
            maxWidth: '1100px', 
            width: '100%',
            transition: 'transform 0.1s ease',
            padding: '3rem 2rem',
            background: 'hsla(var(--card), 0.2)',
            backdropFilter: 'blur(4px)',
            border: '1px solid hsla(var(--border), 0.2)',
            borderRadius: 'var(--radius)'
          }}
        >
          <div ref={textContainerRef}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)',
              lineHeight: 1.1,
              fontWeight: 800,
              marginBottom: '1.5rem',
              letterSpacing: '-0.03em',
              textTransform: 'uppercase'
            }}>
              <span className="reveal-word">Civic</span>{' '}
              <span className="reveal-word">Accountability.</span><br />
              <span className="reveal-word" style={{ color: 'hsl(var(--primary))' }}>Empowered</span>{' '}
              <span className="reveal-word" style={{ color: 'hsl(var(--primary))' }}>by</span>{' '}
              <span className="reveal-word" style={{ color: 'hsl(var(--primary))' }}>AI.</span>
            </h1>
          </div>

          <p className="hero-para" style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            maxWidth: '700px',
            margin: '0 auto 3rem auto',
            lineHeight: 1.6,
            color: 'hsl(var(--foreground))',
            opacity: 0.8
          }}>
            Report real-world infrastructure issues. Validated automatically by Gemini Vision, confirmed collectively by citizens, and routed instantly to Indian municipal departments.
          </p>

          <div className="hero-btn" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/report" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Report Local Issue <ArrowRight size={18} />
            </Link>
            <a href="#heatmap-section" className="btn btn-secondary" style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Explore City Map
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section (Desire Section with counting animations) */}
      <section ref={statsRef} style={{ padding: '5rem 1.5rem', background: 'hsla(var(--foreground), 0.02)', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '2rem', textAlign: 'center' }}>
          <div>
            <h2 className="stat-number" data-target="1500" style={{ fontSize: '3rem', fontWeight: 800, color: 'hsl(var(--primary))', fontFamily: 'Outfit' }}>0+</h2>
            <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: '#737373', marginTop: '0.25rem', fontWeight: 600 }}>Validated Reports</p>
          </div>
          <div>
            <h2 className="stat-number" data-target="450" style={{ fontSize: '3rem', fontWeight: 800, color: 'hsl(var(--secondary))', fontFamily: 'Outfit' }}>0+</h2>
            <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: '#737373', marginTop: '0.25rem', fontWeight: 600 }}>Resolved SLA Cases</p>
          </div>
          <div>
            <h2 className="stat-number" data-target="98" style={{ fontSize: '3rem', fontWeight: 800, color: 'hsl(var(--accent))', fontFamily: 'Outfit' }}>0+</h2>
            <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', color: '#737373', marginTop: '0.25rem', fontWeight: 600 }}>AI Success Accuracy</p>
          </div>
        </div>
      </section>

      {/* Bento Grid (Interest Section) */}
      <section ref={bentoRef} style={{ padding: '8rem 1.5rem', background: 'hsl(var(--background))' }}>
        <div className="container">
          <div style={{ marginBottom: '5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Platform Architecture</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', marginTop: '0.5rem' }}>Engineered for Civic Action</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            
            <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem' }}>
              <div style={{ background: 'hsla(var(--primary), 0.08)', color: 'hsl(var(--primary))', padding: '0.8rem', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                <Flame size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Agentic AI Routing</h3>
                <p style={{ color: '#737373', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Our AI agent parses complaints and auto-routes them to the correct Indian department (PWD, SWM, WSSB) with formatted official correspondence.
                </p>
              </div>
            </div>

            <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem' }}>
              <div style={{ background: 'hsla(var(--secondary), 0.08)', color: 'hsl(var(--secondary))', padding: '0.8rem', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Gemini Vision Check</h3>
                <p style={{ color: '#737373', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Strict pre-posting image analysis. Every photo is validated on-device using Gemini Vision to block selfies, spam, and invalid reports.
                </p>
              </div>
            </div>

            <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem' }}>
              <div style={{ background: 'hsla(var(--accent), 0.08)', color: 'hsl(var(--accent))', padding: '0.8rem', borderRadius: 'var(--radius)', width: 'fit-content' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>SLA Enforcement</h3>
                <p style={{ color: '#737373', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  Automated SLA countdown tracking based on severity. Delayed updates trigger automatic escalations to local municipal commissioners.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Heatmap Map Section (Desire Section with parallax scale animation) */}
      <section id="heatmap-section" ref={mapSectionRef} style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        borderTop: '1px solid hsl(var(--border))',
        borderBottom: '1px solid hsl(var(--border))'
      }}>
        <div style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          zIndex: 10,
          maxWidth: '360px',
          background: 'hsla(var(--card), 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid hsl(var(--border))',
          padding: '1.5rem',
          borderRadius: 'var(--radius)'
        }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '1.1rem' }}>
            <Activity size={18} style={{ color: 'hsl(var(--primary))' }} /> Interactive Heatmap
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#737373', margin: '0.5rem 0 1rem 0', lineHeight: 1.5 }}>
            Visualizing neighborhood issue density. Toggle between Heatmap density view and direct Marker list.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/report" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
              Report Issue
            </Link>
            <Link href="/dashboard" className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
              Go to Dashboard
            </Link>
          </div>
        </div>

        <MapComponent />
      </section>

      {/* Action Footer Call-to-Action */}
      <section style={{ padding: '8rem 1.5rem', textAlign: 'center', background: 'hsl(var(--card))' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Ready to shape your neighborhood?
          </h2>
          <p style={{ color: '#737373', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
            Create an account in seconds to begin reporting, validating, and holding local authorities accountable.
          </p>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }}>
            Create Account & Get Started
          </Link>
        </div>
      </section>

      {/* Mini Footer */}
      <footer style={{ padding: '2rem 1.5rem', borderTop: '1px solid hsl(var(--border))', background: 'hsla(var(--foreground), 0.02)', fontSize: '0.85rem', color: '#737373' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span>© {new Date().getFullYear()} Community Hero. Designed in Stripe/Linear style.</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/">Map</Link>
            <Link href="/feed">Feed</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
