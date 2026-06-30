import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Posting requires login; everything else (home, map, feed, dashboard, issue…) is public.
const PROTECTED_ROUTES = ['/report'];
const AUTH_ROUTES = ['/login', '/signup'];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((r) => path.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => path.startsWith(r));

  // CRITICAL: only talk to Supabase for routes that need an auth decision.
  // Doing getUser() on every request makes a network call that can hang the
  // whole site if Supabase is slow/unreachable — and it's pointless for public pages.
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  let user = null;
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    // Never let an auth hiccup block the page — fail open to the requested route.
    user = null;
  }

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'Please log in to report an issue');
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Only run the middleware where an auth decision is actually needed.
    '/report/:path*',
    '/login',
    '/signup',
  ],
};
