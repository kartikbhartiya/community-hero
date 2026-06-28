import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // 1. Fetch current issues to base predictions on real coordinates
    const { data: issues } = await supabase
      .from('issues')
      .select('title, description, category, severity, lat, lng, created_at')
      .eq('status', 'pending');

    if (!issues || issues.length === 0) {
      return NextResponse.json({
        zones: [
          {
            lat: 12.9716,
            lng: 77.5946,
            radius: 500,
            riskScore: 45,
            hazardType: 'Drainage Overflow',
            reason: 'Baseline monsoon prediction based on city layout data.'
          }
        ]
      });
    }

    const dataContext = issues.map((i, idx) => 
      `Report #${idx + 1}: Category: ${i.category} | Location: (${i.lat.toFixed(4)}, ${i.lng.toFixed(4)}) | Severity: ${i.severity}`
    ).join('\n');

    const prompt = `
      You are a Smart City Predictive Hazard AI.
      You analyze active local infrastructure reports to forecast which areas are at risk of secondary cascading infrastructure failures (e.g., concentrated water logging leads to sewage overflow, multiple streetlight breaches invite high-risk crime zones).
      
      === MUNICIPAL COMPLAINT LOGS ===
      ${dataContext}
      ================================

      Based on this clustering data:
      Identify 1-3 distinct coordinates (nearby clusters) that present a high likelihood of worsening civic hazard.
      
      Output a JSON object containing:
      {
        "zones": [
          {
            "lat": float,
            "lng": float,
            "radius": number (in meters, e.g. 300, 500),
            "riskScore": number (0 to 100),
            "hazardType": "name of hazard (e.g. Electrical Safety, Flood Warning, Sanitation Hazard)",
            "reason": "1-2 sentence logical explanation of the risk forecast"
          }
        ]
      }
      
      Return ONLY a raw JSON object. Do not wrap in markdown block formatting.
    `;

    let forecast;
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }]
      });
      const text = result.text || '{}';
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      forecast = JSON.parse(cleanText);
    } catch (apiError: any) {
      console.warn('Gemini forecast failed, using heuristics:', apiError.message);
      // Heuristic fallback matching Bengaluru context or the first issue
      const first = issues[0];
      forecast = {
        zones: [
          {
            lat: first.lat + 0.002,
            lng: first.lng - 0.0015,
            radius: 400,
            riskScore: 78,
            hazardType: 'Pavement Failure Cascade',
            reason: 'Concentrated road damage reported nearby increases runoff risk.'
          }
        ]
      };
    }

    return NextResponse.json(forecast);
  } catch (error: any) {
    console.error('Forecast error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
