import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { data, rules } = await req.json();

    const prompt = `
You are an expert in scheduling and resource allocation. Analyze the following data and existing rules. Suggest up to 3 new business rules that could improve efficiency, fairness, or error prevention. Use these templates:
- { "type": "coRun", "tasks": ["T1", "T2"] }
- { "type": "slotRestriction", "workerGroup": "A", "minSlots": 2 }
- { "type": "loadLimit", "workerGroup": "A", "maxSlots": 3 }
- { "type": "phaseWindow", "taskId": "T1", "allowedPhases": [1,2,3] }

If no new rules are needed, reply with an empty array.

DATA:
${JSON.stringify(data, null, 2)}

EXISTING RULES:
${JSON.stringify(rules, null, 2)}

Your response: JSON array of rule objects only. Return ONLY the JSON array, no other text.
    `;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([prompt]);
    const content = await result.response.text();

    // Extract JSON array from the response
    const match = content.match(/\[([\s\S]*?)\]/);
    const aiRules = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ aiRules });
  } catch (err: any) {
    console.error('AI Rule Recommendations API Route Error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
