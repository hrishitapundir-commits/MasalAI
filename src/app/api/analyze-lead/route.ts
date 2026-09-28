import { NextRequest, NextResponse } from 'next/server';
import { analyzeLeadWithGemini, isGeminiConfigured } from '@/lib/gemini';
import { LeadInputFields } from '@/types/lead';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, location, propertyRequirement, budget, timeline, customerMessage, email, phone } =
      body as LeadInputFields;

    if (!name || !location || !propertyRequirement || !budget || !timeline) {
      return NextResponse.json(
        {
          error:
            'Missing required intake fields (Name, Location, Property requirement, Budget, Timeline).',
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeLeadWithGemini({
      name: name.trim(),
      location: location.trim(),
      propertyRequirement: propertyRequirement.trim(),
      budget: budget.trim(),
      timeline,
      customerMessage: (customerMessage || '').trim(),
      email: email?.trim(),
      phone: phone?.trim(),
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
        error: error instanceof Error ? error.message : 'Internal Server Error during AI analysis.',
        isConfigured: isGeminiConfigured(),
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
