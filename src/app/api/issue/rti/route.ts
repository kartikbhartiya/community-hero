import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKey });

export async function POST(request: NextRequest) {
  try {
    const { title, category, department, description, reportedAt, id, reporterName } = await request.json();

    const systemPrompt = `
      You are the "Civic Transparency AI Legal Advisor".
      Your job is to draft a formal, legally grounded Right to Information (RTI) application under Section 6(1) of the Right to Information Act, 2005 (India).
      
      Generate a professionally formatted text draft that a citizen can copy-paste and submit.
      
      Include:
      1. Formal header addressing the Public Information Officer (PIO) of the appropriate department.
      2. Citation of Section 6(1) of the RTI Act, 2005.
      3. Specific details of the grievance:
         - Unique case ID: ${id}
         - Date of initial report: ${reportedAt}
         - Category: ${category}
         - Summary of complaint: ${title} - ${description}
         - Department responsible: ${department || 'Municipal Administration'}
      4. A series of 5 highly specific, legally binding queries asking for:
         - Daily progress reports of actions taken by officers.
         - The names, designations, and contact numbers of officers responsible for executing the repair.
         - Estimated date of completion and reasons for delay.
         - Details of budget sanctioned, contract awarded, and contractor names.
         - Inspections conducted by department engineers and copy of inspection reports.
      5. standard declaration under Section 6(2) stating that the applicant is a citizen of India and is not required to give reasons for seeking information.
      6. Closing sign-off.
      
      Output ONLY the clean, markdown-formatted text. Do not wrap in a JSON structure. Just return pure text/markdown.
    `;

    let rtiText = `
### FORM 'A'
#### Form of Application for seeking information under Section 6(1) of the Right to Information Act, 2005

To,
The Public Information Officer (PIO),
${department || 'Municipal Administration Department'},
City Municipal Corporation Office.

**1. Name of the Applicant:** ${reporterName || 'Resident / Citizen Applicant'}
**2. Nationality:** Indian
**3. Details of Information Sought:**
Concerning the unresolved civic grievance reported on the Community Hero platform:
* **Unique Grievance ID:** ${id}
* **Grievance Title:** ${title}
* **Category:** ${category}
* **Reported On:** ${reportedAt}

**4. Particulars of Information required under Section 6(1) of the RTI Act, 2005:**
1. Please provide the certified copy of the action taken report (ATR) on the above-mentioned grievance ID since it was reported.
2. Provide the names and designations of the junior engineers, ward officers, and contractor responsible for the maintenance and resolution of this issue.
3. If no work has been done, please state the official reasons for the delay recorded in file-notings or ward logbooks.
4. Please provide details of the budget allocated for this ward category in the current financial year and the amount spent on repairs so far.
5. Provide the target completion date and copies of any communications between the Ward Office and the Central Department regarding this specific location.

**5. Declaration:**
I state that the information sought does not fall within the restrictions contained in Section 8 and 9 of the RTI Act, 2005, and to the best of my knowledge it pertains to your office. I am a citizen of India.

Date: ${new Date().toLocaleDateString()}
Place: City Municipal Ward
    `;

    if (apiKey) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] }
          ]
        });

        if (response.text) {
          rtiText = response.text;
        }
      } catch (err) {
        console.error('Gemini API call failed for RTI Generator, using default draft:', err);
      }
    }

    return NextResponse.json({ rtiMarkdown: rtiText });
  } catch (error: any) {
    console.error('Error in /api/issue/rti:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
