import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, severity } = await request.json();

    if (!title || !category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }

    const systemPrompt = `
      You are the "Smart City AI Dispatch Copilot".
      Your job is to analyze municipal complaints and generate a detailed tactical field dispatch and resolution plan.
      
      Respond STRICTLY in JSON format with the following keys:
      {
        "milestones": [string, string, string], // 3 specific engineering or repair steps
        "materials": [string, string],        // 2 key items or equipment needed
        "suggested_officer": string,            // Suggested officer name or designation (e.g., Ward Executive Engineer, Sanitation Inspector)
        "suggested_cost": number,               // Estimated repair cost in Indian Rupees (INR) as an integer number (e.g., 4500)
        "dispatch_memo": string                 // A professional 2-sentence instruction for the field officer
      }
    `;

    const userMessage = `
      Complaint Category: ${category}
      Severity Rating: ${severity || 'Medium'}
      Complaint Title: ${title}
      Complaint Description: ${description}
    `;

    let responseJson = {
      milestones: ["Excavate repair zone", "Apply base aggregate compacting", "Overlay finishing surface coat"],
      materials: ["Base gravel", "Surface concrete patching mix"],
      suggested_officer: "Ward Assistant Engineer",
      suggested_cost: 3500,
      dispatch_memo: "Proceed to target ward coordinates. Establish safety blockades and execute surface level restoration."
    };

    if (apiKey) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n' + userMessage }] }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text;
        if (text) {
          responseJson = JSON.parse(text);
        }
      } catch (err) {
        console.error('Gemini API call failed for AI Planner, using default plan:', err);
      }
    }

    return NextResponse.json(responseJson);
  } catch (error: any) {
    console.error('Error in /api/authority/plan:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
