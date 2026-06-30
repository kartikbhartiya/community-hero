import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be provided.');
}

// Cookie-based browser client so the session is shared across client components,
// server actions and the middleware (single source of truth for auth).
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
