import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Agentic deep-analysis of a single civic case — produces an internal,
// authority-ready operations brief so officers understand the issue at a glance.
export async function POST(request: NextRequest) {
  try {
    const { issue } = await request.json();
    if (!issue?.title) {
      return NextResponse.json({ error: 'issue is required' }, { status: 400 });
    }

    const prompt = `You are a senior municipal operations analyst writing an internal CASE BRIEF for authorities about a civic complaint. Be specific, practical, and decisive.

COMPLAINT DATA
- Title: ${issue.title}
- Category: ${issue.category}
- Severity: ${issue.severity}
- Responsible department: ${issue.department || 'Unassigned'}
- Current status: ${issue.status}
- Reported: ${issue.created_at}
- Citizen corroboration (upvotes): ${issue.upvotes || 0}
- AI safety-risk flag: ${issue.safety_risk || 'unknown'}
- Description: ${issue.description}

Write a tight markdown brief using EXACTLY these section headings (## ...), no preamble:
## Situation
1–2 sentences in plain language: what is happening and where.
## Root Cause (likely)
The most probable underlying cause given the category + description.
## Impact & Who's Affected
Who is at risk, the consequences if ignored, and escalation potential.
## Recommended Action Plan
A numbered list of 3–4 concrete remediation steps for the department.
## Resources & Coordination
Crews/equipment likely needed and any other departments to loop in.
## Priority Justification
One line justifying the urgency.

Keep each section concise and actionable.`;

    let text = '';
    try {
      const r = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      text = r.text || '';
    } catch (e: any) {
      console.warn('analyze AI failed:', e?.message);
      text = `## Situation\nAI analysis is temporarily unavailable. From the record this is a ${issue.severity}-severity ${issue.category} case routed to ${issue.department || 'the responsible department'}.\n\n## Recommended Action Plan\n1. Dispatch an inspection crew to verify on-site conditions.\n2. Schedule remediation within the department SLA window.\n3. Update the citizen and close the case with photo proof.`;
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Error in /api/issue/analyze:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
