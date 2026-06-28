import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

// Initialize Supabase Client directly (using service role or anon since RLS is permissive)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], userLocation } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Fetch active issues to ground the AI's answers in real community data
    const { data: issues } = await supabase
      .from('issues')
      .select('title, description, category, severity, status, lat, lng, department, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const issuesContext = issues && issues.length > 0 
      ? issues.map((i, idx) => `[#${idx + 1}] Category: ${i.category} | Title: ${i.title} | Status: ${i.status} | Dept: ${i.department} | Severity: ${i.severity}`).join('\n')
      : 'No active issues reported in the area right now.';

    const systemPrompt = `
      You are the "Citizen AI Advisor" for the Community Hero platform, representing the Municipal Corporation's administrative assistant.
      Your goal is to help citizens resolve local complaints, explain municipal procedures, list active local hazards, and guide them on escalations.

      Ground your answers strictly in the active local issues reported in the database:
      === ACTIVE REPORTS ===
      ${issuesContext}
      ====================

      Reference these issues if the user asks about local potholes, water leaks, or garbage piles.
      If they ask about municipal procedures:
      - Public Works Department (PWD) handles roads/potholes. SLA: 24h (High) or 72h (Medium).
      - Water Supply & Sewerage Board (WSSB) handles pipe bursts/sewers. SLA: 48h.
      - DISCOM / Electricity Division handles streetlights. SLA: 24h.
      - Solid Waste Management (SWM) handles garbage piles. SLA: 12h.

      If they ask how to escalate, tell them that if reports exceed the SLA countdown, they can download the pre-filled Section 6(1) Right to Information (RTI) application draft from the issue details page to submit to the Public Information Officer (PIO).

      Keep your answers brief, action-oriented, helpful, and polite. Always output markdown format.
    `;

    const chatHistory = history.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Inject system prompt as first turn or system instruction
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to advise citizens on local civic issues and procedures.' }] },
      ...chatHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents
      });
      responseText = response.text || 'I am sorry, I could not process your query at this moment.';
    } catch (apiError: any) {
      console.warn('Gemini API call failed for chatbot:', apiError.message);
      responseText = `I apologize, but my AI connection is offline right now.
      
      Here is some offline guidance:
      * **Potholes / Road issues**: Handled by the PWD (SLA 24-72h).
      * **Garbage Dumping**: Handled by SWM & Sanitation (SLA 12h).
      * **Streetlights**: Handled by DISCOM (SLA 24h).
      
      If your issue has crossed the SLA countdown, you can download the **RTI draft** from the issue page to file with the local municipal ward office.`;
    }

    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('Error in /api/citizen-advisor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
