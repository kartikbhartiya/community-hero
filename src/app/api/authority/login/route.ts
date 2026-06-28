import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Server-side secret verification. Default fallback is 'admin123'
    const correctPassword = process.env.AUTHORITY_PORTAL_PASSWORD || 'admin123';
    
    if (password === correctPassword) {
      return NextResponse.json({ success: true, token: 'auth_portal_verified_session' });
    }
    
    return NextResponse.json(
      { success: false, error: 'Access denied. Invalid password.' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
