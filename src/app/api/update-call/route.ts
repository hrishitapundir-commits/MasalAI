import { NextRequest, NextResponse } from 'next/server';
import { analyzePostCallTranscript, isGeminiConfigured } from '@/lib/gemini';
import { Lead } from '@/types/lead';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead, callNotesOrTranscript, durationMinutes, loggedBy } = body as {
      lead: Lead;
      callNotesOrTranscript: string;
      durationMinutes?: number;
      loggedBy?: string;
    };

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead data is required for post-call analysis.' },
        { status: 400 }
      );
    }

    if (!callNotesOrTranscript || !callNotesOrTranscript.trim()) {
      return NextResponse.json(
        { error: 'Call notes or transcript cannot be empty.' },
        { status: 400 }
      );
    }

    const result = await analyzePostCallTranscript({
      lead,
      callNotesOrTranscript: callNotesOrTranscript.trim(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : 15,
      loggedBy: loggedBy?.trim() || 'Real Estate Advisor',
    });

    return NextResponse.json({
      success: true,
      updatedAnalysis: result.updatedAnalysis,
      callUpdate: result.callUpdate,
      previousScore: result.previousScore,
      newScore: result.newScore,
      scoreDeltaExplanation: result.scoreDeltaExplanation,
      suggestedFollowUpDate: result.suggestedFollowUpDate,
      isConfigured: isGeminiConfigured(),
    });
  } catch (error) {
    console.error('API route error in /api/update-call:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal Server Error during post-call analysis.',
        isConfigured: isGeminiConfigured(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    feature: 'Phase 7: Post-Call Intelligence & Adaptive Scoring',
    geminiConfigured: isGeminiConfigured(),
  });
}
