import { NextRequest, NextResponse } from 'next/server';
import { chatWithLeadContext, isGeminiConfigured, formatGeminiErrorMessage } from '@/lib/gemini';
import { Lead } from '@/types/lead';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead, userMessage } = body as { lead: Lead; userMessage: string };

    if (!lead || !userMessage || !userMessage.trim()) {
      return NextResponse.json(
        { error: 'Lead context and userMessage are required.' },
        { status: 400 }
      );
    }

    const result = await chatWithLeadContext({
      lead,
      userMessage: userMessage.trim(),
    });

    return NextResponse.json({
      success: true,
      reply: result.reply,
      updatedSuggestedResponse: result.updatedSuggestedResponse,
      isConfigured: isGeminiConfigured(),
    });
  } catch (error) {
    console.error('API route error in /api/chat-lead:', error);
    const friendlyError = formatGeminiErrorMessage(
      error,
      'Internal Server Error during conversational copilot interaction.'
    );
    return NextResponse.json(
      {
        error: friendlyError,
        isConfigured: isGeminiConfigured(),
      },
      { status: 500 }
    );
  }
}
