import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, description } = await request.json();

    if (!imageBase64 && !description) {
      return NextResponse.json({ error: 'Image or description required' }, { status: 400 });
    }
    
    const prompt = `
      You are an AI assistant for a hyperlocal problem-solving app called Community Hero.
      Analyze the provided image and/or user description of a community issue.
      
      User description: "${description}"

      Based on the visual evidence and text, please extract the following:
      1. 'category': The best category from: Potholes, Water Leakage, Streetlight, Waste Management, Public Infrastructure, Noise, Other.
      2. 'severity': 'Low', 'Medium', or 'High'.
      3. 'safety_risk': 'none', 'low', 'medium', or 'high'.
      4. 'official_summary': A professional, objective 1-2 sentence summary of the issue suitable for city officials.
      5. 'department': The most likely city department responsible (e.g., 'Public Works', 'Sanitation', 'Parks & Rec', 'Water Department', 'Traffic').
      6. 'estimated_cost': A rough text estimate of repair cost or resource required (e.g., '$100-$500', 'Requires heavy machinery', 'Low cost').
      7. 'confidence': A float between 0.0 and 1.0 representing your confidence in this assessment.
      
      Return ONLY a raw JSON object with these exact keys, no markdown blocks.
    `;

    const parts: any[] = [{ text: prompt }];

    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64.split(',')[1],
          mimeType: imageBase64.split(';')[0].split(':')[1],
        }
      });
    }

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: parts
    });
    const text = result.text || '{}';
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    let analysis;
    try {
      analysis = JSON.parse(cleanText);
    } catch (e) {
      console.error('Failed to parse Gemini response:', cleanText);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Error in /api/verify-issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
