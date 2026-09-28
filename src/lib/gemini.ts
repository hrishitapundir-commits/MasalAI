import { GoogleGenAI } from '@google/genai';
import { LeadInputFields, LeadAiAnalysis } from '@/types/lead';

/**
 * Server-side Gemini service.
 * Keeps GEMINI_API_KEY strictly on the server and never exposes it to client browsers.
 */

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

export function isGeminiConfigured(): boolean {
  const key = getGeminiApiKey();
  return Boolean(key && key.trim().length > 0 && !key.includes('your_gemini_api_key'));
}

/**
 * Analyzes lead information using Gemini.
 * Prompt engineered to return structured lead qualification insights.
 */
export async function analyzeLeadWithGemini(lead: LeadInputFields): Promise<LeadAiAnalysis> {
  const apiKey = getGeminiApiKey();

  if (!isGeminiConfigured() || !apiKey) {
    // Graceful fallback for local development before key is configured
    return {
      score: 75,
      qualification: 'WARM',
      summary: `Lead intake recorded for ${lead.name} at ${lead.company}. (Simulated preview: GEMINI_API_KEY is not yet configured. Please add your free key in .env.local to enable live AI qualification).`,
      painPoints: [
        'Awaiting live Gemini API evaluation for detailed pain point extraction',
        'Inferred requirement: ' + (lead.notes || 'General inquiry'),
      ],
      opportunities: [
        'Potential stakeholder: ' + lead.role,
        'Domain fit at ' + lead.company,
      ],
      recommendedPitch: `Reach out to ${lead.name} (${lead.role}) referencing their request: "${lead.notes || 'Inquiry'}".`,
      suggestedQuestions: [
        `What is the primary timeline for ${lead.company}?`,
        `Who else will be involved in the evaluation?`,
      ],
      analyzedAt: new Date().toISOString(),
      modelUsed: 'mock-preview (Set GEMINI_API_KEY in .env.local)',
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert B2B sales development AI assistant.
Analyze the following incoming lead details and provide a structured JSON qualification assessment:

Lead Details:
- Name: ${lead.name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Company: ${lead.company}
- Role / Title: ${lead.role}
- Inquiry / Notes: ${lead.notes}

Return ONLY valid JSON matching this schema (no markdown fences, just pure JSON):
{
  "score": number (0 to 100 integer indicating sales fit),
  "qualification": "HOT" | "WARM" | "COLD",
  "summary": "2-3 sentence executive briefing about this prospect's intent and fit",
  "painPoints": ["list of 2-3 specific business challenges or pain points deduced from the notes and role"],
  "opportunities": ["list of 1-3 business opportunities or growth signals"],
  "recommendedPitch": "concise, tailored value proposition or angle for the sales rep to pitch",
  "suggestedQuestions": ["2-3 specific high-impact discovery questions for the next call"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    // Clean potential markdown wrap
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 70)),
      qualification: ['HOT', 'WARM', 'COLD'].includes(parsed.qualification)
        ? parsed.qualification
        : 'WARM',
      summary: parsed.summary || 'Lead analyzed successfully.',
      painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      recommendedPitch: parsed.recommendedPitch || 'Follow up with lead.',
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
      analyzedAt: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash',
    };
  } catch (error) {
    console.error('Gemini API analysis failed:', error);
    throw new Error(
      `Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
