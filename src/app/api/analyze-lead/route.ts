import { NextRequest, NextResponse } from 'next/server';
import { analyzeLeadWithGemini, isGeminiConfigured } from '@/lib/gemini';
import { LeadInputFields } from '@/types/lead';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, role, notes } = body as LeadInputFields;

    if (!name || !company) {
      return NextResponse.json(
        { error: 'Name and Company are required fields.' },
        { status: 400 }
      );
    }

    const analysis = await analyzeLeadWithGemini({
      name: name || '',
      email: email || '',
      phone: phone || '',
      company: company || '',
      role: role || '',
      notes: notes || '',
    });

    return NextResponse.json({
      success: true,
      analysis,
      isConfigured: isGeminiConfigured(),
    });
  } catch (error) {
    console.error('API route error in /api/analyze-lead:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    geminiConfigured: isGeminiConfigured(),
    instructions:
      'Set GEMINI_API_KEY in .env.local or your deployment environment variables.',
  });
}
