import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { data: issues, error } = await supabase
      .from('issues')
      .select('status, safety_risk');

    if (error) throw error;

    const total = issues?.length || 0;
    const resolved = issues?.filter(i => i.status === 'resolved').length || 0;
    const pending = total - resolved;
    const highRisk = issues?.filter(i => i.safety_risk === 'high').length || 0;

    const stats = {
      totalReports: total,
      resolvedReports: resolved,
      pendingReports: pending,
      highRiskReports: highRisk,
      resolutionPercentage: total > 0 ? Math.round((resolved / total) * 100) : 0
    };

    const response = NextResponse.json(stats);
    
    // Enable CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  const response = NextResponse.json({});
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
