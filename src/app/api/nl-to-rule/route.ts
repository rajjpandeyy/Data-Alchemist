import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const prompt = `
You are an expert in business rules for resource allocation. 
Given this instruction from a user, convert it to a JSON rule object matching one of these templates:
- { "type": "coRun", "tasks": ["T1", "T2"] }
- { "type": "slotRestriction", "workerGroup": "A", "minSlots": 2 }
- { "type": "loadLimit", "workerGroup": "A", "maxSlots": 3 }
- { "type": "phaseWindow", "taskId": "T1", "allowedPhases": [1,2,3] }
If the rule doesn't fit, use your best judgment to create a similar object.
User instruction: ${text}
JSON rule object:
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    const rule = match ? JSON.parse(match[0]) : null;

    return NextResponse.json({ rule });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
