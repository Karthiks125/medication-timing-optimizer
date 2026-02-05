
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      models: data.models?.map((m: any) => m.name) || [],
      fullData: data
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      details: error 
    }, { status: 500 });
  }
}
