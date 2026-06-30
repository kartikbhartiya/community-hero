import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Honest community escalation: raises the issue's priority, flags it publicly,
// and drafts a formal letter the CITIZEN can send to the relevant department.
// It does not pretend to contact any official on the user's behalf.
export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json();
    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 });
    }

    const { data: issue, error } = await supabase.from('issues').select('*').eq('id', issueId).single();
    if (error || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const prompt = `Draft a short, formal complaint-escalation LETTER that a citizen can send to the relevant local authority. Write it from the citizen's perspective (first person), addressed generically to "The Public Information Officer / concerned department, ${issue.department || 'Municipal Corporation'}".
Case: "${issue.title}" — category ${issue.category}, severity ${issue.severity}, first reported on ${new Date(issue.created_at).toDateString()}. It remains unresolved past its expected resolution window. ${issue.upvotes || 0} residents have supported this report.
Keep it under 130 words, polite but firm, requesting prompt action and a status update. No markdown headings, no placeholders like [Name].`;

    let notice = '';
    try {
      const r = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      notice = r.text || '';
    } catch {
      notice = `To the Public Information Officer / concerned department, ${issue.department || 'Municipal Corporation'},\n\nI am writing to escalate the unresolved issue "${issue.title}" (${issue.category}, ${issue.severity}), first reported on ${new Date(issue.created_at).toDateString()}. It remains unaddressed beyond its expected resolution window, and ${issue.upvotes || 0} residents have supported this report. I request prompt action and a status update at the earliest.\n\nRegards,\nA concerned resident`;
    }

    const newScore = Math.min(100, (issue.priority_score || 50) + 15);

    await supabase.from('issues').update({
      escalated: true,
      escalation_notice: notice,
      priority_score: newScore,
    }).eq('id', issueId);

    await supabase.from('issue_events').insert([{
      issue_id: issueId,
      type: 'escalated',
      message: `Community-escalated as overdue. Priority raised to ${newScore}/100.`,
    }]);

    return NextResponse.json({ notice, priority: newScore });
  } catch (error: any) {
    console.error('Error in /api/issue/escalate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
