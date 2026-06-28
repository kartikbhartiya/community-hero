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
      You are an advanced Agentic AI Municipal Routing & Validation Agent representing the Indian Municipal Corporation Administration system.
      Your role is to analyze a community complaint (image and/or description) and perform three critical steps:
      1. Validate if this is a genuine real-world civic infrastructure issue (e.g., pothole, broken streetlight, garbage dump, flooding, pipe burst). Selfie photos, faces, pets, memes, food, or unrelated contents MUST be flagged as invalid.
      2. Correctly route the issue under the Indian Municipal System.
      3. Draft a formal administrative complaint memo to the Ward Officer/Executive Engineer responsible.

      User description of the issue: "${description}"

      Based on the visual evidence and text, please output a JSON object containing:
      1. 'isValidCivicIssue': A boolean. Return true if this is a genuine civic infrastructure or public safety issue. Return false if it is a selfie, a face, a meme, an abstract/unrelated photo, or general spam.
      2. 'invalidityReason': A string. If 'isValidCivicIssue' is false, explain why clearly and politely (e.g., 'The uploaded image appears to be a selfie. Please upload a clear photo of the infrastructure issue.').
      3. 'category': The best category from: Potholes, Water Supply, Waste Management, Electricity, Greenery, Public Health, Traffic, Other.
      4. 'severity': 'Low', 'Medium', or 'High'.
      5. 'safety_risk': 'none', 'low', 'medium', or 'high'.
      6. 'official_summary': A professional, objective 1-2 sentence summary of the issue.
      7. 'department': The specific Indian Municipal Department responsible. Choose strictly from:
         - 'Public Works Department (PWD)' (for potholes, road damage, pavement repairs)
         - 'Municipal Solid Waste Management (SWM) & Sanitation' (for garbage dump, street cleaning, litter)
         - 'Water Supply & Sewerage Board (WSSB)' (for water leaks, sewage blockages, open manholes)
         - 'Electricity Board / DISCOM (Streetlighting Division)' (for streetlights, hanging live wires)
         - 'Horticulture / Parks & Gardens Department' (for fallen trees, park maintenance)
         - 'Public Health & Sanitation Department' (for stray animal hazard, stagnant breeding water)
         - 'Traffic Police & Road Safety Cell' (for encroachments, non-working traffic lights, illegal parking)
      8. 'estimated_cost': A rough text estimate of repair cost in Indian Rupees (INR) or resources required (e.g. '₹5,000 - '₹15,000', 'Requires PWD patch work crew', 'Low cost utility fix').
      9. 'confidence': A float between 0.0 and 1.0 representing your confidence in this routing.
      10. 'complaint_draft': A formal complaint draft written in Indian administrative memo style. 
          - Address it to: 'The Ward Officer / Executive Engineer, Municipal Corporation'
          - Include a formal Subject ('Sub: Urgent rectification of [Issue Type] at Ward level...')
          - Write a polite, demanding letter citing public safety, referencing citizen reports, and demanding action under SLA time limits.
      
      Return ONLY a raw JSON object with these exact keys. Do not wrap in markdown block formatting.
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

    // Call Gemini Model
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
      
      // Fallback AI output to satisfy schema if parsing fails
      analysis = {
        isValidCivicIssue: true,
        invalidityReason: '',
        category: 'Other',
        severity: 'Medium',
        safety_risk: 'medium',
        official_summary: description || 'Citizen reported community issue.',
        department: 'Public Works Department (PWD)',
        estimated_cost: '₹5,000',
        confidence: 0.5,
        complaint_draft: `To,\nThe Ward Officer,\nMunicipal Corporation\n\nSubject: Request for inspection of reported issue.\n\nDear Sir/Madam,\nThis is to report an issue: "${description}". Kindly initiate inspection.\n\nYours faithfully,\nCommunity Hero Citizen`
      };
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Error in /api/verify-issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
