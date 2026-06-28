import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // Protect dashboard, report, and admin routes
  const protectedRoutes = ['/dashboard', '/report', '/admin'];
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'Please log in to access this page');
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if logged-in user accesses login/signup
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
