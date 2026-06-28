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
      2. 'invalidityReason': A string. If 'isValidCivicIssue' is false, explain why clearly and politely.
      3. 'category': The best category from: Potholes, Water Supply, Waste Management, Electricity, Greenery, Public Health, Traffic, Other.
      4. 'severity': IMPORTANT - Assess this accurately based on impact:
         - 'High' = Active danger to life, limb, or property (open manholes, live wires, major road collapses, flooding blocking traffic, large fallen trees on roads). These MUST be marked High.
         - 'Medium' = Significant inconvenience or minor safety risk (moderate potholes, broken streetlights, garbage accumulation, water supply issues, minor road damage).
         - 'Low' = Cosmetic or minor issues (faded road markings, minor cracks, overgrown hedges, dim lighting, small litter).
         Do NOT default everything to 'Medium'. A dangerous pothole on a highway is 'High'. A small crack on a side lane is 'Low'. Be decisive.
      5. 'safety_risk': 'none', 'low', 'medium', or 'high'. Match this to actual physical danger visible in the image or described in the text.
      6. 'official_summary': A professional, objective 1-2 sentence summary of the issue.
      7. 'location_landmark': A string detailing the estimated nearby landmark, area name, or context (e.g., 'Near Brigade Road Metro, Bangalore') based on description or visual clues in the image.
      8. 'department': The specific Indian Municipal Department responsible. Choose strictly from:
         - 'Public Works Department (PWD)' (for potholes, road damage, pavement repairs)
         - 'Municipal Solid Waste Management (SWM) & Sanitation' (for garbage dump, street cleaning, litter)
         - 'Water Supply & Sewerage Board (WSSB)' (for water leaks, sewage blockages, open manholes)
         - 'Electricity Board / DISCOM (Streetlighting Division)' (for streetlights, hanging live wires)
         - 'Horticulture / Parks & Gardens Department' (for fallen trees, park maintenance)
         - 'Public Health & Sanitation Department' (for stray animal hazard, stagnant breeding water)
         - 'Traffic Police & Road Safety Cell' (for encroachments, non-working traffic lights, illegal parking)
      9. 'estimated_cost': A rough text estimate of repair cost in Indian Rupees (INR) (e.g. '₹5,000', '₹25,000').
      10. 'estimated_cost_numeric': An integer of the estimated cost in INR without currency symbols (e.g. 5000, 25000). Use your best judgment.
      11. 'confidence': A float between 0.0 and 1.0 representing your confidence in this routing.
      12. 'priority_score': An integer from 0 to 100 representing overall urgency. Consider severity, safety risk, affected population, and infrastructure criticality together. Examples:
          - Open manhole on busy road = 92
          - Large pothole causing accidents = 85
          - Overflowing garbage near school = 75
          - Broken streetlight on main road = 65
          - Minor crack on side lane = 20
          - Faded road marking = 12
          Be accurate and spread the full range. Do NOT cluster everything around 50.
      13. 'complaint_draft': A formal complaint draft written in Indian administrative memo style. 
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

    let analysis: any;
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: parts
      });
      const text = result.text || '{}';
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanText);
      analysis.ai_verified = true;
    } catch (apiError: any) {
      console.warn('Gemini API call failed. Falling back to simulated verification:', apiError.message);
      
      analysis = {
        isValidCivicIssue: true,
        invalidityReason: '',
        category: 'Other',
        severity: 'Medium',
        safety_risk: 'medium',
        official_summary: description || 'Citizen reported community issue.',
        department: 'Public Works Department (PWD)',
        estimated_cost: '₹7,500',
        estimated_cost_numeric: 7500,
        confidence: 0.85,
        priority_score: 55,
        ai_verified: false,
        location_landmark: 'Near Municipal Center, Bangalore',
        complaint_draft: `To,\nThe Ward Officer / Executive Engineer,\nMunicipal Corporation\n\nSubject: Request for inspection of reported issue.\n\nDear Sir/Madam,\nThis is to report a neighborhood issue: "${description}". Kindly initiate inspection.\n\nYours faithfully,\nCommunity Hero Citizen`
      };
    }

    // 2. Perform Semantic Duplicate Detection
    if (analysis.isValidCivicIssue && analysis.category) {
      const { data: candidates } = await supabase
        .from('issues')
        .select('id, title, description')
        .eq('category', analysis.category)
        .eq('status', 'pending')
        .limit(15);

      if (candidates && candidates.length > 0) {
        const matchPrompt = `
          You are a Database Semantic De-duplication Agent.
          Your job is to compare a new civic complaint with a list of existing active reports of the same category and determine if the new complaint is a duplicate (referring to the exact same physical issue in the same neighborhood).
          
          New report description: "${description}"
          
          Existing active reports:
          ${candidates.map(c => `ID: ${c.id} | Title: ${c.title} | Description: ${c.description}`).join('\n')}
          
          Determine if the new report is describing the exact same problem as one of the existing active reports.
          Return a JSON object with:
          1. 'isDuplicate': boolean
          2. 'duplicateOf': the matching issue's ID string (or null if not duplicate)
          
          Return ONLY the raw JSON object. Do not wrap in markdown block formatting.
        `;

        try {
          const matchResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ text: matchPrompt }]
          });
          const matchText = matchResult.text || '{}';
          const cleanMatchText = matchText.replace(/```json\n?|\n?```/g, '').trim();
          const matchAnalysis = JSON.parse(cleanMatchText);
          
          if (matchAnalysis.isDuplicate && matchAnalysis.duplicateOf) {
            analysis.duplicate_of = matchAnalysis.duplicateOf;
            analysis.is_duplicate = true;
          }
        } catch (err) {
          console.warn('Semantic duplicate matching failed:', err);
        }
      }
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Core error in /api/verify-issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
