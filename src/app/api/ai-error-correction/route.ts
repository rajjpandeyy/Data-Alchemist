import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { row, col, value, message, rowData, entityType } = await req.json();

    // Debug: Log the received payload
    console.log('AI Error Correction API called with:', { row, col, value, message, rowData, entityType });

    const prompt = `
You are a data correction assistant. A user has the following error in their ${entityType} data:
Row: ${JSON.stringify(rowData, null, 2)}
Column: ${col}
Current Value: ${value}
Error: ${message}
Suggest a corrected value for this cell (just the value, no explanation). If the value should be empty, reply with "".
    `;

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // or 'gemini-2.5-flash' if available

    const result = await model.generateContent([prompt]);
    const suggestion = await result.response.text();

    // Remove surrounding quotes if present
    const cleanedSuggestion = suggestion.trim().replace(/^"|"$/g, '');

    return NextResponse.json({ suggestion: cleanedSuggestion });
  } catch (err: any) {
    console.error('AI Error Correction API Route Error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

