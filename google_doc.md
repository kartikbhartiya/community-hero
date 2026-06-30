COMMUNITY HERO
The AI‑Agentic Civic Operations Platform
=========================================

Submission links
- Live Application (Google Cloud Run): https://community-hero-ggzn7bat6q-uc.a.run.app/
- GitHub Repository: https://github.com/kartikbhartiya/community-hero
- (This document is the Project Description — copy it into a public Google Doc.)


==================================================================
1. PROBLEM STATEMENT SELECTED
==================================================================

Building agentic, AI‑powered solutions for real‑world public good — using
Google’s AI and Cloud technologies to create measurable civic impact.

Our chosen problem: the broken lifecycle of hyperlocal civic issues.

Potholes, broken streetlights, overflowing garbage, water leaks and open drains are
the everyday hazards that most affect citizens’ safety and quality of life — and yet
they are the hardest problems to report and the easiest for systems to ignore:

• Citizens don’t know WHICH department owns a problem, or HOW to escalate it.
• Reports are unstructured, duplicated and unverifiable, so they pile up and decay.
• Authorities receive noise, not triage — no priority signal, no spatial view, and
  no proof that a “resolved” issue was actually fixed.
• Critically, there is NO accountability loop: nobody independently confirms the fix.

The result is civic apathy on one side and overwhelmed, blind administration on the
other. We set out to close that loop end‑to‑end with autonomous AI agents and
Google’s spatial + cloud platform.


==================================================================
2. SOLUTION OVERVIEW
==================================================================

Community Hero is a full civic operations platform that converts a citizen’s
10‑second photo report into a triaged, department‑routed, SLA‑tracked municipal case —
and keeps a swarm of Google Gemini agents in the loop at every single stage.

It is NOT a complaint form. It is a closed accountability lifecycle:

   Reported → AI‑Verified & Classified → Auto‑Routed to Department → Acknowledged
   → SLA Countdown → (Overdue → AI‑Escalated) → AI‑Verified Resolution
   → Citizen Rewarded with Hero Points.

The platform has two faces sharing one real‑time data spine:

• Citizen side — report in seconds (photo/video, GPS + precise reverse‑geocoded
  address, or multilingual voice), track status on a live map and feed, upvote and
  validate, follow an issue’s lifecycle timeline, escalate overdue cases, and earn a
  place on a real leaderboard.

• Authority side — a password‑gated console with a real‑time analytics dashboard
  (KPIs, trends, heatmap, SLA Watch, searchable report table), an AI case‑brief for
  every issue, and a resolution workflow where a case can ONLY be closed after an
  INDEPENDENT AI agent verifies before/after photo proof.

Every “smart” step is performed by a purpose‑built Gemini agent, grounded in the live
Supabase database — making the product genuinely agentic, not a thin chatbot wrapper.


==================================================================
3. KEY FEATURES  (every capability, grouped)
==================================================================

A. AGENTIC AI — a coordinated swarm of Gemini agents
   1.  AI Intake Agent: from a photo + description it returns category, severity,
       responsible department, an official summary, a formal complaint draft, a
       safety‑risk rating, and an estimated remediation cost — fully structured.
   2.  Duplicate‑Detection Agent: perceptual image hashing + embeddings recognise
       repeat reports of the same hazard, auto‑MERGE them, and RAISE the original’s
       priority instead of creating clutter.
   3.  Priority‑Scoring Agent: computes a 0–100 priority from severity, corroboration
       (upvotes), and risk — driving the authority queue.
   4.  AI Case Intelligence: one click generates an authority‑grade operations brief —
       Situation, Root Cause, Impact & Who’s Affected, a numbered Action Plan,
       Resources & Coordination, and Priority Justification.
   5.  AI City Pulse: an executive briefing of the WHOLE city’s civic state, generated
       live from current reports (top problem, biggest risk, SLA concern, next action).
   6.  Citizen AI Advisor: a grounded, conversational agent that answers from the live
       database AND returns action chips that actually navigate/act (report, open map,
       track escalation) — agentic, not just text.
   7.  AI Resolution Verifier: authorities upload an “after” photo; an INDEPENDENT
       Gemini vision agent compares it to the original and the case can only close if
       the AI confirms the hazard is genuinely fixed (anti‑fraud).
   8.  AI Escalation Drafting: when a case breaches SLA, an agent writes a formal,
       ready‑to‑send escalation letter the citizen can send themselves.
   9.  RTI Generator: drafts a legally‑grounded Right‑to‑Information application
       (Section 6(1)) for transparency escalation.
   10. Forecast & Dispatch‑Plan agents: predictive hotspot zones and authority planning.

B. SPATIAL INTELLIGENCE (Google Maps Platform)
   • Live operations map with markers, heatmap density, live traffic and satellite view.
   • Route Safety Scanner: enter start + destination and the system flags EVERY reported
     hazard along the route, with a clear/at‑risk verdict (Directions + hazard matching).
   • Precise geolocation with reverse‑geocoding to the exact street/area + accuracy radius.
   • Embeddable map widget for partner/government websites.

C. AUTHORITY & ANALYTICS DASHBOARD
   • 8 animated KPIs (total, pending, in‑progress, resolved, resolution rate, high‑risk,
     SLA overdue, total upvotes), 7‑day reporting trend, category/status/severity
     breakdowns, SLA Watch and escalation count, and top contributors.
   • Compact live heatmap panel (Heatmap/Pins toggle).
   • Searchable + status‑filterable All‑Reports table.
   • Real‑time sync via Supabase Realtime; CSV export.

D. AUTHORITY CONSOLE & WORKFLOW
   • Separate, password‑gated portal (distinct from citizen accounts).
   • Acknowledge → Work‑in‑progress → AI‑verified Resolve, with a full event timeline.
   • Department scorecards and SLA performance views.

E. CIVIC ENGAGEMENT & GAMIFICATION
   • Hero Points + badges earned for real reporting/resolution activity.
   • A self‑populating leaderboard derived from genuine reports (no mock data).
   • Issue lifecycle timeline, upvotes/validation, threaded comments, native share,
     and live notifications.

F. CITIZEN REPORTING SUPERPOWERS
   • Multilingual voice dictation (Web Speech, 7 Indian languages).
   • Offline‑first report queue that auto‑syncs on reconnect.
   • Installable PWA (manifest + service worker).
   • Photo/video evidence via Cloudinary.

G. PRODUCT EXPERIENCE & DESIGN
   • Polished light/dark theming on a unified design‑token system.
   • Premium motion (Framer Motion, GSAP, Lenis smooth scroll), scroll reveal, and a
     cursor‑tracked hero spotlight.
   • Fully mobile‑optimized and accessible (reduced‑motion, visible focus states).
   • SEO‑ready: metadata, Open Graph/Twitter cards, robots.txt and sitemap.xml.


==================================================================
4. TECHNOLOGIES USED
==================================================================

• Framework: Next.js 16 (App Router, Server Route Handlers, Middleware), React 19,
  TypeScript 5.9 — one codebase serving the UI, the agent APIs and auth.
• AI SDK: @google/genai calling Google Gemini 2.5 Flash (vision + text + reasoning).
• Maps: @react-google-maps/api over Google Maps Platform.
• Data & Auth: Supabase — PostgreSQL, cookie‑based SSR Auth, Realtime, Storage, and
  Row‑Level Security.
• Media: Cloudinary for image/video evidence.
• UX/Motion: Framer Motion, GSAP + ScrollTrigger, Lenis, lucide‑react.
• Voice: Web Speech API (multilingual dictation).
• Delivery: Docker, Google Cloud Build, Google Artifact Registry, Google Cloud Run.
• PWA/SEO: Service Worker, Web App Manifest, dynamic robots/sitemap.

Engineering quality: strict TypeScript (clean type‑check), a single unified design‑token
theme system, idempotent non‑destructive database migrations, scoped middleware for
performance, graceful AI fallbacks (the product never hard‑fails if an API is briefly
unavailable), and a one‑command automated Cloud Run deploy.


==================================================================
5. GOOGLE TECHNOLOGIES UTILIZED
==================================================================

Community Hero is deeply and natively built on Google’s stack — Google technology powers
the intelligence, the maps, the build and the hosting:

• GOOGLE GEMINI API (gemini‑2.5‑flash) — the reasoning core of the entire platform. Every
  agent (intake/classification, duplicate analysis, priority scoring, case intelligence,
  city pulse, the citizen advisor, before/after resolution verification, escalation and
  RTI drafting) is a Gemini call grounded in live data. This is where the “agentic depth”
  lives.

• GOOGLE AI STUDIO — used to provision and manage the Gemini API key and to iterate on the
  structured prompts that drive each agent.

• GOOGLE MAPS PLATFORM — the spatial backbone:
    – Maps JavaScript API (interactive operations map),
    – Visualization / Heatmap library (issue‑density heatmaps),
    – Directions API (route planning for the Route Safety Scanner),
    – Traffic layer, and
    – Geocoding (precise reverse‑geocoded report locations).

• GOOGLE CLOUD RUN — serverless, autoscaling container hosting of the full Next.js app
  (UI + agent APIs in one deployable unit), exposed as the public submission URL.

• GOOGLE CLOUD BUILD — the containerized CI build pipeline (cloudbuild.yaml) that bakes
  public config, builds the image and deploys to Cloud Run in one step.

• GOOGLE ARTIFACT REGISTRY — stores the built Docker images that Cloud Run runs.


==================================================================
WHY COMMUNITY HERO WINS — mapped to the evaluation matrix
==================================================================

• Problem Solving & Impact (20%): solves a real, universal civic problem and closes the
  one gap nobody else does — INDEPENDENT, AI‑verified proof of resolution — turning
  apathy and blind administration into a measurable, accountable loop.

• Agentic Depth (20%): not one chatbot but a COORDINATED SWARM of ~10 specialised Gemini
  agents that classify, route, score, deduplicate, brief, verify, escalate and advise —
  each grounded in live data and able to take real actions (merge issues, raise priority,
  close cases, navigate the UI).

• Innovation & Creativity (20%): AI before/after resolution verification, a Route Safety
  Scanner that scores a journey against live hazards, AI City Pulse executive briefings,
  duplicate‑merge‑with‑priority‑boost, and an honest community escalation ladder.

• Usage of Google Technologies (15%): Gemini + AI Studio + Maps Platform (4 APIs) +
  Cloud Run + Cloud Build + Artifact Registry — Google tech powers intelligence, maps,
  build and hosting, end to end.

• Product Experience & Design (10%): a premium, animated, fully responsive, themeable,
  accessible, SEO‑ready product that feels like a shipped SaaS, not a hackathon demo.

• Technical Implementation (10%): Next.js 16 + React 19 + strict TypeScript, SSR auth,
  Realtime, RLS, idempotent migrations, graceful fallbacks, and automated Cloud Run CI/CD.

• Completeness & Usability (5%): a complete, working end‑to‑end loop — report, triage,
  route, track, escalate, resolve, verify, reward — plus a one‑click demo account and a
  one‑command deploy, live on Google Cloud.

Built for impact. Powered by Google Gemini & Google Cloud.
