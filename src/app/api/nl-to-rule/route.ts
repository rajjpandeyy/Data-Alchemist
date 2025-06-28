import { NextRequest, NextResponse } from 'next/server';
// 1. Import the GoogleGenerativeAI client instead of OpenAI
import { GoogleGenerativeAI } from '@google/generative-ai';

// 2. Initialize the Gemini client using the correct environment variable
const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    // The prompt is great, we can keep it exactly as is.
    const prompt = `
You are an expert in business rules for resource allocation. 
Given this instruction from a user, convert it to a JSON rule object matching one of these templates:
- { "type": "coRun", "tasks": ["T1", "T2"] }
- { "type": "slotRestriction", "workerGroup": "A", "minSlots": 2 }
- { "type": "loadLimit", "workerGroup": "A", "maxSlots": 3 }
- { "type": "phaseWindow", "taskId": "T1", "allowedPhases": [1,2,3] }
If the rule doesn't fit, use your best judgment to create a similar object.
The output MUST be only the JSON object, with no other text or markdown formatting.
User instruction: ${text}
JSON rule object:
    `;

    // 3. Select the Gemini model to use
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      // This tells the model to only output JSON, which is more reliable
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // 4. Generate the content using the Gemini SDK
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    // 5. Parse the JSON response
    // The Gemini response text should already be a clean JSON string because of responseMimeType
    const rule = JSON.parse(content);

    return NextResponse.json({ rule });
  } catch (err: any) {
    console.error('Error generating rule with Gemini:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
