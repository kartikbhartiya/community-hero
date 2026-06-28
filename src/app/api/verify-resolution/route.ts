import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(request: NextRequest) {
  try {
    const { beforeImageUrl, afterImageBase64, category } = await request.json();

    if (!beforeImageUrl || !afterImageBase64) {
      return NextResponse.json({ error: 'Before image URL and After image proof are required' }, { status: 400 });
    }

    const prompt = `
      You are an independent AI Municipal Verification Agent.
      Your task is to review two images representing a civic complaint before and after a claimed official resolution.
      Category of complaint: "${category}"

      Image 1 (Before): This is the original photo of the infrastructure damage/hazard.
      Image 2 (After): This is the photograph uploaded by the municipal department claiming they resolved/cleaned the issue.

      Evaluate the comparison and return a JSON object with:
      1. 'isResolved': A boolean. Return true ONLY if there is clear visual proof that the original hazard shown in Image 1 has been cleared, fixed, repaired, or removed in Image 2. If it is still present, or if Image 2 is black/unrelated/spam, return false.
      2. 'quality': 'Excellent', 'Satisfactory', 'Poor', or 'Invalid'.
      3. 'reasoning': A 1-2 sentence detailed reason explaining what you observed in the before vs after images (e.g., 'The pothole in Image 1 has been filled with concrete and smoothed over in Image 2.', 'The garbage pile has been completely cleared, and the street corner is empty.').

      Return ONLY the raw JSON object. Do not wrap in markdown block formatting.
    `;

    // Retrieve before image as buffer or parts
    const beforeRes = await fetch(beforeImageUrl);
    if (!beforeRes.ok) {
      throw new Error(`Failed to fetch before image: status ${beforeRes.status}`);
    }
    const beforeBuffer = await beforeRes.arrayBuffer();
    const beforeBase64 = Buffer.from(beforeBuffer).toString('base64');

    const parts = [
      { text: prompt },
      {
        inlineData: {
          data: beforeBase64,
          mimeType: 'image/jpeg'
        }
      },
      {
        inlineData: {
          data: afterImageBase64.split(',')[1],
          mimeType: afterImageBase64.split(';')[0].split(':')[1]
        }
      }
    ];

    let verification;
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: parts
      });
      const text = result.text || '{}';
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      verification = JSON.parse(cleanText);
    } catch (apiError: any) {
      console.warn('Gemini API call failed for resolution check:', apiError.message);
      
      // Fallback must NOT auto-approve — return failure so authority must retry
      verification = {
        isResolved: false,
        quality: 'Invalid',
        reasoning: 'AI verification service is temporarily unavailable. Please retry the comparison. Resolution cannot be approved without AI verification.'
      };
    }

    return NextResponse.json(verification);
  } catch (error: any) {
    console.error('Error in verify-resolution:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
