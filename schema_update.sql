-- ===================================================================
-- Community Hero — Idempotent Schema (run AFTER pulling these changes)
-- SAFE: this NEVER drops tables or data. Re-runnable any number of times.
-- Paste the whole file into the Supabase SQL Editor and run once.
-- ===================================================================

-- 1. USERS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  email      TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT 'Citizen',
  hero_score INTEGER DEFAULT 0,
  badges     TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ISSUES ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'General',
  severity    TEXT DEFAULT 'Medium',
  lat         DOUBLE PRECISION NOT NULL DEFAULT 0,
  lng         DOUBLE PRECISION NOT NULL DEFAULT 0,
  image_url   TEXT,
  status      TEXT DEFAULT 'pending',
  upvotes     INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Additive columns (safe if they already exist) --------------------
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS reporter_name        TEXT,
  ADD COLUMN IF NOT EXISTS reporter_email       TEXT,
  ADD COLUMN IF NOT EXISTS reporter_phone       TEXT,
  ADD COLUMN IF NOT EXISTS detected_label       TEXT,
  ADD COLUMN IF NOT EXISTS official_summary     TEXT,
  ADD COLUMN IF NOT EXISTS confidence           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS safety_risk          TEXT,
  ADD COLUMN IF NOT EXISTS tags                 TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language             TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS ai_verified          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_url            TEXT,
  ADD COLUMN IF NOT EXISTS image_sha256         TEXT,
  ADD COLUMN IF NOT EXISTS image_phash          TEXT,
  ADD COLUMN IF NOT EXISTS image_reused         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS embedding            JSONB,
  ADD COLUMN IF NOT EXISTS duplicate_of         UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS department           TEXT,
  ADD COLUMN IF NOT EXISTS department_id        TEXT,
  ADD COLUMN IF NOT EXISTS assigned_officer     TEXT,
  ADD COLUMN IF NOT EXISTS priority_score       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_hours            INTEGER DEFAULT 72,
  ADD COLUMN IF NOT EXISTS sla_due_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_level     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_notice    TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS after_image_url      TEXT,
  ADD COLUMN IF NOT EXISTS resolution_verified  BOOLEAN,
  ADD COLUMN IF NOT EXISTS resolution_feedback  TEXT,
  ADD COLUMN IF NOT EXISTS estimated_cost       TEXT;

-- 3. ISSUE EVENTS (timeline / notifications feed) -------------------
CREATE TABLE IF NOT EXISTS public.issue_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id   UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT,
  meta       JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COMMENTS -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id     UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_name  TEXT,
  author_email TEXT,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ROW LEVEL SECURITY (permissive for hackathon / demo) ----------
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on users"        ON public.users;
DROP POLICY IF EXISTS "Allow all on issues"       ON public.issues;
DROP POLICY IF EXISTS "Allow all on issue_events" ON public.issue_events;
DROP POLICY IF EXISTS "Allow all on comments"     ON public.comments;

CREATE POLICY "Allow all on users"        ON public.users        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on issues"       ON public.issues       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on issue_events" ON public.issue_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments"     ON public.comments     FOR ALL USING (true) WITH CHECK (true);

-- 6. INDEXES --------------------------------------------------------
CREATE INDEX IF NOT EXISTS issues_category_status_idx ON public.issues (category, status);
CREATE INDEX IF NOT EXISTS issues_created_at_idx      ON public.issues (created_at DESC);
CREATE INDEX IF NOT EXISTS issues_geo_idx             ON public.issues (lat, lng);
CREATE INDEX IF NOT EXISTS issues_priority_idx        ON public.issues (priority_score DESC);
CREATE INDEX IF NOT EXISTS issue_events_issue_idx     ON public.issue_events (issue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_issue_idx         ON public.comments (issue_id, created_at);

-- 7. STORAGE BUCKET for issue images -------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-images', 'issue-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'issue-images' );
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'issue-images' );
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE USING ( bucket_id = 'issue-images' );
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING ( bucket_id = 'issue-images' );

-- Done. The Citizen AI Advisor (agentic) reads public.issues live and
-- needs no extra tables — its actions are derived server-side.
-- ===================================================================
