-- Execute this in the Supabase SQL Editor.
-- This whole file is idempotent — it is safe to run on a fresh database OR on
-- top of an existing one (e.g. if the `issues` table already exists).

-- 1. Create the issues table (skipped if it already exists)
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'Medium',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, validated, resolved
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Set up row level security (RLS) for anonymous access during hackathon
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert issues (drop-then-create so re-runs don't error)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.issues;
CREATE POLICY "Allow anonymous inserts" ON public.issues
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read issues
DROP POLICY IF EXISTS "Allow anonymous reads" ON public.issues;
CREATE POLICY "Allow anonymous reads" ON public.issues
  FOR SELECT USING (true);

-- Allow anyone to update issues (e.g., for upvoting or status change)
DROP POLICY IF EXISTS "Allow anonymous updates" ON public.issues;
CREATE POLICY "Allow anonymous updates" ON public.issues
  FOR UPDATE USING (true);

-- 3. Create Storage bucket for issue images (skipped if it already exists)
insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', true)
on conflict (id) do nothing;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'issue-images' );

DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'issue-images' );

-- =====================================================================
-- MIGRATION (run if the table already exists from an earlier version)
-- =====================================================================

-- Reporter profile fields attached to each report
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS reporter_email TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS reporter_phone TEXT;

-- The admin panel can delete reports, which needs a DELETE policy
DROP POLICY IF EXISTS "Allow anonymous deletes" ON public.issues;
CREATE POLICY "Allow anonymous deletes" ON public.issues
  FOR DELETE USING (true);

-- =====================================================================
-- ADVANCED PIPELINE MIGRATION (v2) — run on top of the base schema.
-- Powers: image-reuse detection, semantic dedup, department routing,
-- priority scoring, SLA/escalation, before/after resolution proof,
-- multilingual drafts, live activity events and community discussion.
-- Every statement is idempotent so it is safe to re-run.
-- =====================================================================

-- --- AI verification + work-order fields ---
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS detected_label   TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS confidence       DOUBLE PRECISION;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS safety_risk      TEXT;      -- none | low | medium | high
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS tags             TEXT[] DEFAULT '{}';
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS language         TEXT DEFAULT 'en';
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS official_summary TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS citizen_advisory TEXT;
-- FALSE when filed via the heuristic fallback (Gemini was unavailable) → the
-- authority console flags these for manual review.
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT true;

-- --- Video-based reporting (frame is stored in image_url for thumbnails) ---
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS video_url TEXT;

-- --- Image-reuse / authenticity fingerprints ---
-- image_sha256: byte-identical re-upload detection (exact match).
-- image_phash : 64-bit perceptual dHash (hex) for near-duplicate / re-encoded
--               / cropped image detection via Hamming distance.
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS image_sha256 TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS image_phash  TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS image_reused BOOLEAN DEFAULT false;

-- --- Semantic dedup (meaning-based) ---
-- Stored as JSONB float array; cosine similarity is computed in the app over
-- nearby candidates. For large datasets, migrate to the pgvector extension
-- (CREATE EXTENSION vector; ALTER TABLE ... ADD COLUMN embedding vector(768)).
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS embedding       JSONB;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS duplicate_of    UUID REFERENCES public.issues(id) ON DELETE SET NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

-- --- Department accountability + routing ---
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS department    TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS department_id TEXT;

-- --- Priority + SLA + auto-escalation ---
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;  -- 0-100
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS sla_hours      INTEGER;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS sla_due_at     TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS escalated      BOOLEAN DEFAULT false;

-- --- Lifecycle timestamps + before/after resolution proof ---
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS acknowledged_at     TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS resolved_at         TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS after_image_url     TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS resolution_verified BOOLEAN;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS resolution_feedback TEXT;

-- Helpful indexes for the dedup / near-me / scorecard queries.
CREATE INDEX IF NOT EXISTS issues_category_status_idx ON public.issues (category, status);
CREATE INDEX IF NOT EXISTS issues_created_at_idx      ON public.issues (created_at DESC);
CREATE INDEX IF NOT EXISTS issues_sha256_idx          ON public.issues (image_sha256);
CREATE INDEX IF NOT EXISTS issues_geo_idx             ON public.issues (lat, lng);
CREATE INDEX IF NOT EXISTS issues_department_idx      ON public.issues (department_id);

-- =====================================================================
-- issue_events — append-only activity log driving live notifications
-- and the public timeline on each report.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.issue_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,   -- created | acknowledged | in_progress | resolved | escalated | duplicate_linked | fix_verified | fix_rejected
  message    TEXT,
  meta       JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS issue_events_issue_idx ON public.issue_events (issue_id, created_at DESC);

ALTER TABLE public.issue_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events read"   ON public.issue_events;
DROP POLICY IF EXISTS "events insert" ON public.issue_events;
CREATE POLICY "events read"   ON public.issue_events FOR SELECT USING (true);
CREATE POLICY "events insert" ON public.issue_events FOR INSERT WITH CHECK (true);

-- =====================================================================
-- comments — realtime community discussion threads per issue.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id     UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_name  TEXT,
  author_email TEXT,
  body         TEXT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_issue_idx ON public.comments (issue_id, created_at);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments read"   ON public.comments;
DROP POLICY IF EXISTS "comments insert" ON public.comments;
CREATE POLICY "comments read"   ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments insert" ON public.comments FOR INSERT WITH CHECK (true);

-- Storage policy so authorities can upload "after" (resolution) photos to the
-- same public bucket used for report images.
-- (Re-uses the existing issue-images bucket + policies above.)

-- =====================================================================
-- OPTIONAL RLS HARDENING (production)
-- Run this ONLY if SUPABASE_SERVICE_ROLE_KEY is configured in the app env.
-- It removes anonymous UPDATE/DELETE on issues so that status changes,
-- escalation and deletes can ONLY happen through the admin-gated server
-- routes (which use the service-role key and bypass RLS). Public report
-- INSERT and SELECT stay open. Without a service-role key, DO NOT run this —
-- the admin client falls back to the anon key and would be blocked.
-- =====================================================================
-- DROP POLICY IF EXISTS "Allow anonymous updates" ON public.issues;
-- DROP POLICY IF EXISTS "Allow anonymous deletes" ON public.issues;
-- -- (issue_events: keep INSERT open so the public timeline still logs,
-- --  or restrict to service role if all events are server-generated.)

-- =====================================================================
-- HACKATHON ADDITIONS (Gamification & AI Cost Estimation)
-- =====================================================================
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS estimated_cost TEXT;

CREATE TABLE IF NOT EXISTS public.users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hero_score INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read" ON public.users;
DROP POLICY IF EXISTS "users insert" ON public.users;
DROP POLICY IF EXISTS "users update" ON public.users;
CREATE POLICY "users read" ON public.users FOR SELECT USING (true);
CREATE POLICY "users insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users update" ON public.users FOR UPDATE USING (true);

