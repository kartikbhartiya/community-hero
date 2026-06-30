<div align="center">

# 🦸 Community Hero

### The AI‑Agentic Civic Operations Platform

**Report. Verify. Route. Resolve. — an end‑to‑end accountability loop powered by Google Gemini.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gemini](https://img.shields.io/badge/Google-Gemini%202.5-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 📖 Overview

**Community Hero** turns a citizen's 10‑second photo report into a fully‑triaged,
department‑routed, SLA‑tracked municipal case — and keeps an autonomous AI agent in the
loop at every stage. It is not a form that emails a complaint; it is a **civic operations
platform** with a real accountability lifecycle: *Reported → AI‑verified → Routed →
Acknowledged → (Overdue → Escalated) → AI‑verified Resolution → Citizen rewarded.*

The system is built around a swarm of **Gemini‑powered agents** that classify hazards,
detect duplicates, draft legal escalations, verify before/after proof, and brief
authorities — backed by **Google Maps Platform** for spatial intelligence and deployed on
**Google Cloud Run**.

---

## 🔗 Submission Links

| Resource | Link |
|---|---|
| 🌐 **Live Application** (Google Cloud Run) | `https://<your-service>.run.app` |
| 💻 **GitHub Repository** | `https://github.com/<you>/community-hero` |
| 📄 **Project Description (Google Doc)** | `https://docs.google.com/document/d/1pE6vXboC_46J4rwnH-xi0ofYNluTDj1woAajPrv5aI0/edit?usp=sharing` |

---

## 🎯 The Problem

Local civic issues — potholes, broken streetlights, overflowing garbage, water leaks,
open drains — are the everyday hazards that most affect quality of life, yet they are the
**hardest to report and the easiest for systems to ignore**:

- Citizens don't know *which department* owns a problem or *how to escalate* it.
- Reports are unstructured, duplicated, and unverifiable — so they rot in inboxes.
- Authorities have **no triage, no priority signal, and no proof of resolution**.
- There is **zero accountability loop** — nobody confirms the fix actually happened.

**Community Hero closes that loop with autonomous AI agents and spatial intelligence.**

---

## ✨ Key Features

### 🤖 Agentic AI (Google Gemini 2.5 Flash)
- **AI Intake Agent** — from a photo + description, generates: category, severity,
  responsible department, an official summary, a formal complaint draft, a safety‑risk
  rating, and an estimated remediation cost.
- **Duplicate‑Detection Agent** — image hashing + embeddings detect repeat reports,
  auto‑merge them, and **escalate priority** instead of creating clutter.
- **AI Case Intelligence** — one click produces an authority‑grade operations brief:
  *root cause · impact & who's affected · step‑by‑step action plan · resources to dispatch
  · priority justification.*
- **AI City Pulse** — an executive briefing of the whole city's civic situation generated
  live from real reports (top risks, SLA concerns, recommended action).
- **Citizen AI Advisor** — a grounded, *agentic* assistant that answers questions from the
  live database and renders **action chips that actually navigate/act** (report, open map,
  track escalation).
- **AI Resolution Verifier** — authorities upload an "after" photo; an **independent agent
  compares before/after** and a case can only close if the AI confirms the fix.
- **AI Escalation Drafting** — generates a formal, ready‑to‑send escalation letter when a
  case breaches its SLA.
- **RTI Generator** — drafts a legally‑grounded Right‑to‑Information application
  (Section 6(1)) for transparency escalation.

### 🗺️ Spatial Intelligence (Google Maps Platform)
- **Live Operations Map** — markers, **heatmap density**, live traffic, satellite view.
- **Route Safety Scanner** — plan a route and the system **flags every reported hazard
  along the path** with a clear/at‑risk verdict.
- **Precise geolocation** with reverse‑geocoding to the exact area and an accuracy radius.
- **Embeddable map widget** for partner/government sites.

### 📊 Authority & Analytics Dashboard
- Real‑time analytics: **8 animated KPIs**, 7‑day reporting trend, category/status/severity
  breakdowns, **SLA Watch**, top contributors, and a compact heatmap panel.
- **Searchable, filterable All‑Reports table** with live status filters.
- **Supabase Realtime** sync — new reports stream in live.
- **CSV export** for offline analysis.

### 🏛️ Authority Console & Workflow
- Separate, password‑gated **Authority Portal**.
- **Acknowledge → Work‑in‑progress → AI‑verified Resolve** workflow with full event timeline.
- Department **scorecards** and SLA performance.

### 🏆 Civic Engagement & Gamification
- **Hero Points + badges** earned for reporting and resolving — a real, self‑populating
  **leaderboard** derived from genuine activity (no mock data).
- **Issue lifecycle timeline**, community **upvotes/validation**, threaded **comments**,
  **share** (native Web Share), and live **notifications**.

### 📱 Citizen Reporting Superpowers
- **Multilingual voice dictation** (Web Speech, 7 Indian languages).
- **Offline‑first** report queue that auto‑syncs on reconnect.
- **Installable PWA** (manifest + service worker).
- Photo/video evidence via Cloudinary.

### 🎨 Product Experience
- Polished light/dark theming on a **unified design‑token system**.
- Premium motion (Framer Motion + GSAP + Lenis smooth scroll), scroll‑reveal, and a
  cursor‑tracked hero spotlight.
- **Mobile‑optimized** and **accessible** (reduced‑motion + visible focus states).
- **SEO‑ready**: metadata, Open Graph/Twitter cards, `robots.txt`, `sitemap.xml`.

---

## 🧠 How the Agentic Loop Works

```
  Citizen          Gemini Agents                 Authorities          Citizen
  ───────          ─────────────                 ───────────          ───────
  📸 Report  ──▶  🧠 Classify + Route        ──▶  📋 Case Brief   ──▶  🔔 Notified
                  🧠 Duplicate check              ✅ Acknowledge
   ⬆ upvote       🧠 Priority score               🔧 Fix + upload      🏆 Hero Points
                  ⏱ SLA timer ──▶ 🧠 Escalate ──▶  🧠 Verify proof  ──▶ ✔ Verified
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                      Next.js 16 App (Cloud Run)                      │
│                                                                      │
│  Client (React 19)            Server (Route Handlers + Middleware)   │
│  • Map / Feed / Dashboard     • /api/verify-issue   (Gemini)        │
│  • Report (voice/offline/GPS) • /api/issue/analyze  (Gemini)        │
│  • Authority console          • /api/issue/escalate (Gemini)        │
│  • Citizen AI Advisor         • /api/verify-resolution (Gemini)     │
│                               • /api/citizen-advisor (Gemini)       │
│                               • /api/forecast / authority/plan      │
└───────────────┬───────────────────────────┬────────────────────────┘
                │                            │
     ┌──────────▼─────────┐      ┌───────────▼───────────┐
     │  Google Gemini API │      │  Google Maps Platform │
     │  (gemini-2.5-flash)│      │  JS · Heatmap · Routes │
     └────────────────────┘      └───────────────────────┘
                │
     ┌──────────▼───────────────────────────────────────┐
     │  Supabase: Postgres · Auth · Realtime · Storage   │
     │  Cloudinary: media   ·   Web Speech: voice intake │
     └───────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Route Handlers, Middleware), React 19, TypeScript |
| **AI** | **Google Gemini 2.5 Flash** via `@google/genai`; keys from **Google AI Studio** |
| **Maps** | **Google Maps Platform** (`@react-google-maps/api`) — Maps JS, Visualization/Heatmap, Directions, Traffic, Geocoding |
| **Data** | **Supabase** — Postgres, Auth (SSR cookies), Realtime, Storage, Row‑Level Security |
| **Media** | Cloudinary |
| **Motion/UX** | Framer Motion, GSAP + ScrollTrigger, Lenis, lucide‑react |
| **Hosting** | **Google Cloud Run** (Docker) · **Cloud Build** · **Artifact Registry** |
| **PWA/SEO** | Service Worker, Web App Manifest, dynamic `robots.txt` + `sitemap.xml` |

---

## ☁️ Google Technologies Utilized

- **Google Gemini API (gemini‑2.5‑flash)** — the reasoning engine behind every agent:
  classification, duplicate analysis, case briefs, resolution verification, escalation
  drafting, and the conversational advisor.
- **Google AI Studio** — Gemini API key provisioning and prompt iteration.
- **Google Maps Platform** — Maps JavaScript API, **Heatmap** (Visualization library),
  **Directions** (route hazard scanning), **Traffic** layer, and **Geocoding**.
- **Google Cloud Run** — serverless, autoscaling container hosting of the full app.
- **Google Cloud Build** — containerized CI build pipeline (`cloudbuild.yaml`).
- **Google Artifact Registry** — Docker image registry.

---

## 🚀 Getting Started (Local)

```bash
# 1. Install
npm install

# 2. Configure environment — create .env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
GEMINI_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
AUTHORITY_PORTAL_PASSWORD=admin123

# 3. Database — run schema_update.sql in the Supabase SQL editor (idempotent, non‑destructive)

# 4. Run
npm run dev   # http://localhost:3000
```

> **Authority console:** `/login → Authority` tab → enter `AUTHORITY_PORTAL_PASSWORD`.
> **Demo account:** one‑time create `demo@communityhero.app` / `demohero123`, confirm the
> email, then the **"Try the Demo Account"** button signs judges in instantly.

---

## ☁️ Deploy to Google Cloud Run

Everything is automated. From the project root, in the PowerShell where you ran
`gcloud auth login`:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

The script reads your `.env`, enables the required APIs, builds the container via
**Cloud Build** (baking the public keys), pushes to **Artifact Registry**, deploys to
**Cloud Run**, and sets the server‑side secrets — then prints your live URL.
Full walkthrough in **`DEPLOY.md`**.

---

## 🗃️ Data Model (Supabase)

| Table | Purpose |
|---|---|
| `issues` | Reports + AI fields (category, severity, department, SLA, priority, duplicate links, resolution + verification, escalation) |
| `issue_events` | Immutable lifecycle timeline (created, acknowledged, escalated, resolved…) |
| `comments` | Citizen discussion per issue |
| `users` | Profiles, `hero_score`, badges |

RLS enabled; storage bucket `issue-images` for evidence. Schema in `schema_update.sql`.

---

## 📁 Notable Endpoints

| Route | Agent / Purpose |
|---|---|
| `POST /api/verify-issue` | Classify, route, draft, risk‑rate, dedupe |
| `POST /api/issue/analyze` | AI Case Intelligence brief |
| `POST /api/issue/escalate` | Generate escalation + raise priority |
| `POST /api/verify-resolution` | Before/after AI proof verification |
| `POST /api/citizen-advisor` | Grounded agentic assistant + actions |
| `POST /api/forecast` · `/api/authority/plan` | Predictive zones & dispatch planning |
| `GET  /api/public/issues` · `/api/public/stats` | Open civic data API |

---

## 🧭 Roadmap

- Predictive maintenance heat‑forecasting from historical density.
- WhatsApp / SMS intake via webhook.
- Multi‑tenant municipality workspaces.
- Push notifications (VAPID) and OG share images.

---

<div align="center">

**Built for impact. Powered by Google Gemini & Google Cloud.**

</div>
