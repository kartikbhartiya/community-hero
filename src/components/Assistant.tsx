'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot, Send, X, Sparkles, Map, FileWarning, Trophy,
  Building2, ShieldAlert, ArrowRight, Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Action { label: string; href: string; kind: string; }
interface Msg {
  role: 'user' | 'assistant';
  text: string;
  actions?: Action[];
  followUps?: string[];
}

const GREETING: Msg = {
  role: 'assistant',
  text: "Hello! I'm your **Citizen AI Advisor** 🦸. I can check active municipal reports, look up department SLAs, draft RTI escalation notices, or guide you to file a new complaint — and I can take you straight there.",
  followUps: [
    'What are the active issues in the city?',
    'What is the SLA for fixing a pothole?',
    'How do I file an RTI escalation?',
  ],
};

const STORAGE_KEY = 'ch-assistant-thread';

function ActionIcon({ kind }: { kind: string }) {
  const map: Record<string, any> = {
    report: FileWarning, map: Map, escalate: ShieldAlert,
    ranks: Trophy, scorecards: Building2,
  };
  const Ico = map[kind] || ArrowRight;
  return <Ico size={14} />;
}

// Lightweight markdown: **bold** + bullet lists + paragraphs
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const renderInline = (s: string, key: any) =>
    s.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={`${key}-${i}`}>{part}</strong> : <span key={`${key}-${i}`}>{part}</span>
    );

  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} style={{ margin: '0.3rem 0', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {bullets.map((b, i) => <li key={i}>{renderInline(b, `li-${i}`)}</li>)}
        </ul>
      );
      bullets = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const m = line.match(/^\s*[*-]\s+(.*)$/);
    if (m) { bullets.push(m[1]); return; }
    flush();
    if (line.trim()) {
      blocks.push(<p key={`p-${idx}`} style={{ margin: '0.15rem 0' }}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flush();
  return <>{blocks}</>;
}

export default function Assistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Restore thread
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {}
  }, []);

  // Persist thread
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, open, busy]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || busy) return;

    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/citizen-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: newMessages.slice(0, -1) }),
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setMessages(prev => [...prev, {
          role: 'assistant', text: data.text,
          actions: data.actions || [], followUps: data.followUps || [],
        }]);
      } else {
        throw new Error(data.error || 'Failed to fetch response');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ **Error:** ${err.message || 'Could not connect to AI advisor.'}` }]);
    } finally {
      setBusy(false);
    }
  };

  const resetThread = () => {
    setMessages([GREETING]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const lastAssistant = messages[messages.length - 1]?.role === 'assistant' ? messages[messages.length - 1] : null;

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fab aura-ring"
        style={{
          position: 'fixed', right: '1.5rem', bottom: '1.5rem', zIndex: 900,
          width: '58px', height: '58px', borderRadius: '50%', display: 'grid',
          placeItems: 'center', border: 'none', cursor: 'pointer',
          background: 'var(--accent)', color: '#ffffff', boxShadow: 'var(--shadow-md)',
          pointerEvents: 'auto', overflow: 'visible',
        }}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.4 }}
        whileHover={{ scale: 1.1, boxShadow: 'var(--shadow-glow)' }}
        whileTap={{ scale: 0.94 }}
        title="Ask Citizen AI Advisor"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={open ? 'x' : 'bot'}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline-flex' }}
          >
            {open ? <X size={22} /> : <Bot size={24} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="chat-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              position: 'fixed', right: '1.5rem', bottom: '5.6rem', zIndex: 900,
              width: 'min(410px, calc(100vw - 3rem))', height: 'min(600px, calc(100vh - 8rem))',
              display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--background-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <motion.div
                  style={{ background: 'var(--accent-tint)', color: 'var(--accent)', padding: '0.4rem', borderRadius: '10px', display: 'inline-flex' }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles size={18} />
                </motion.div>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>Citizen AI Advisor</h3>
                  <span style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="live-dot" style={{ width: '6px', height: '6px' }} /> Agentic · Online
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={resetThread} title="Clear conversation"
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem', display: 'inline-flex' }}>
                  <Eraser size={15} />
                </button>
                <button onClick={() => setOpen(false)} title="Minimize"
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem', display: 'inline-flex' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={bodyRef} style={{
              flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex',
              flexDirection: 'column', gap: '0.9rem', background: 'var(--card)',
            }}>
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  style={{ display: 'flex', flexDirection: 'column', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', gap: '0.5rem' }}
                >
                  <div style={{
                    padding: '0.7rem 0.95rem', borderRadius: '16px', fontSize: '0.86rem', lineHeight: '1.5',
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--background-secondary)',
                    color: m.role === 'user' ? '#ffffff' : 'var(--foreground)',
                    borderBottomRightRadius: m.role === 'user' ? '5px' : '16px',
                    borderBottomLeftRadius: m.role === 'assistant' ? '5px' : '16px',
                    border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <RichText text={m.text} />
                  </div>

                  {/* Agentic action chips */}
                  {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {m.actions.map((a) => (
                        <motion.button
                          key={a.href + a.kind}
                          onClick={() => { router.push(a.href); setOpen(false); }}
                          whileHover={{ scale: 1.04, y: -1 }}
                          whileTap={{ scale: 0.96 }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            background: 'var(--accent-tint)', color: 'var(--accent)',
                            border: '1px solid rgb(var(--accent-rgb) / 0.35)', borderRadius: '999px',
                            padding: '0.35rem 0.7rem', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <ActionIcon kind={a.kind} /> {a.label}
                          <ArrowRight size={12} />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', gap: '0.4rem', alignSelf: 'flex-start', padding: '0.7rem 0.95rem', background: 'var(--background-secondary)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)', animationDelay: `${d}s` }} />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Follow-up suggestion chips */}
            {!busy && lastAssistant?.followUps && lastAssistant.followUps.length > 0 && (
              <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {lastAssistant.followUps.map(s => (
                    <button key={s} onClick={() => handleSend(s)}
                      style={{
                        background: 'var(--background-secondary)', border: '1px solid var(--border)',
                        color: 'var(--foreground-secondary)', fontSize: '0.72rem', padding: '0.35rem 0.65rem',
                        borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--foreground)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--foreground-secondary)'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--background-secondary)' }}
            >
              <input
                type="text" placeholder="Ask about local civic issues..." value={input}
                onChange={(e) => setInput(e.target.value)} disabled={busy}
                style={{
                  flex: 1, padding: '0.6rem 0.9rem', borderRadius: '20px', border: '1px solid var(--border-strong)',
                  background: 'var(--card)', color: 'var(--foreground)', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
              />
              <motion.button
                type="submit" disabled={!input.trim() || busy}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: input.trim() && !busy ? 'var(--accent)' : 'var(--secondary)',
                  border: 'none', color: input.trim() && !busy ? '#ffffff' : 'var(--muted)',
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: input.trim() && !busy ? 'pointer' : 'default', transition: 'background 0.2s, color 0.2s',
                }}
              >
                <Send size={15} />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
