-- Fresh Reset SQL Schema for Supabase
-- Execute this in the Supabase SQL Editor to wipe existing data and recreate the clean schema.

-- 1. Drop existing objects in reverse order of dependency
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.issue_events CASCADE;
DROP TABLE IF EXISTS public.issues CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Create users table
CREATE TABLE public.users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hero_score INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create issues table
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'Medium',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, resolved
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reporter details
  reporter_name TEXT,
  reporter_email TEXT,
  reporter_phone TEXT,
  
  -- AI classification & assessment details
  detected_label TEXT, -- stores the complaint memo draft
  official_summary TEXT, -- stores the 1-2 sentence overview
  confidence DOUBLE PRECISION,
  safety_risk TEXT,
  tags TEXT[] DEFAULT '{}',
  language TEXT DEFAULT 'en',
  ai_verified BOOLEAN DEFAULT true,
  video_url TEXT,
  
  -- Authenticity & duplicate check
  image_sha256 TEXT,
  image_phash TEXT,
  image_reused BOOLEAN DEFAULT false,
  embedding JSONB,
  duplicate_of UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  duplicate_count INTEGER DEFAULT 0,
  
  -- SLA Routing & Departments
  department TEXT,
  department_id TEXT,
  priority_score INTEGER DEFAULT 0,
  sla_hours INTEGER DEFAULT 72,
  sla_due_at TIMESTAMP WITH TIME ZONE,
  escalated BOOLEAN DEFAULT false,
  
  -- Resolution details
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  after_image_url TEXT,
  resolution_verified BOOLEAN,
  resolution_feedback TEXT,
  estimated_cost TEXT
);

-- 4. Create issue_events table
CREATE TABLE public.issue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- created, acknowledged, resolved, escalated, duplicate_linked
  message TEXT,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_name TEXT,
  author_email TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 7. Create highly permissive policies to ensure all actions work for local development and hackathons
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on issues" ON public.issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on issue_events" ON public.issue_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON public.comments FOR ALL USING (true) WITH CHECK (true);

-- 8. Create helpful indexes
CREATE INDEX IF NOT EXISTS issues_category_status_idx ON public.issues (category, status);
CREATE INDEX IF NOT EXISTS issues_created_at_idx      ON public.issues (created_at DESC);
CREATE INDEX IF NOT EXISTS issues_geo_idx             ON public.issues (lat, lng);
CREATE INDEX IF NOT EXISTS issues_priority_idx        ON public.issues (priority_score DESC);
CREATE INDEX IF NOT EXISTS issue_events_issue_idx     ON public.issue_events (issue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_issue_idx        ON public.comments (issue_id, created_at);

-- 9. Create Storage bucket for issue images (skipped if already exists)
insert into storage.buckets (id, name, public)
values ('issue-images', 'issue-images', true)
on conflict (id) do nothing;

-- 10. Re-create storage policies for bucket (permissive)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'issue-images' );

DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'issue-images' );

DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE USING ( bucket_id = 'issue-images' );

DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING ( bucket_id = 'issue-images' );
