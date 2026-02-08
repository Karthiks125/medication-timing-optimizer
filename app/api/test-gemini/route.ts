import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set' },
        { status: 500 }
      );
    }

    console.log('Testing Gemini API connection...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Simple test request
    const result = await model.generateContent('Hello, can you respond with just "API working"?');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API test successful:', text);
    
    return NextResponse.json({
      success: true,
      message: 'Gemini API is working',
      response: text,
      apiKeyLength: apiKey.length
    });
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gemini API connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
