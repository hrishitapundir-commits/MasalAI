import { GoogleGenAI } from '@google/genai';
import { LeadInputFields, LeadAiAnalysis } from '@/types/lead';

/**
 * Server-side Gemini service for Real Estate Lead Intelligence.
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
 * Analyzes real estate lead details using Gemini 2.5 Flash.
 */
export async function analyzeLeadWithGemini(lead: LeadInputFields): Promise<LeadAiAnalysis> {
  const apiKey = getGeminiApiKey();

  if (!isGeminiConfigured() || !apiKey) {
    // If no key is set yet, throw a descriptive error so the failure state and retry button can be demonstrated/handled
    throw new Error(
      'Gemini API key is not configured. Add GEMINI_API_KEY to .env.local (or Vercel environment variables) and click Retry.'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an elite real estate sales advisor and lead qualification AI.
Analyze the following incoming property lead and generate a structured JSON qualification assessment:

Lead Details:
- Full Name: ${lead.name}
- Target Location: ${lead.location}
- Property Requirement: ${lead.propertyRequirement}
- Stated Budget: ${lead.budget}
- Purchase Timeline: ${lead.timeline}
- Customer Message / Context: "${lead.customerMessage}"
${lead.email ? `- Email: ${lead.email}` : ''}
${lead.phone ? `- Phone: ${lead.phone}` : ''}

Evaluate:
1. Intent & Urgency (based on timeline, specificity of requirement, and budget realism).
2. Fit Score (0 to 100): High score for urgent timeline and realistic budget; medium for 1-3 months; lower for vague or just exploring.
3. Qualification status: "HOT" (immediate/ready), "WARM" (1-3 months, viable budget), or "COLD" (long timeline or vague).
4. Specific buyer challenges, constraints, and opportunities.
5. High-converting sales pitch angle for the real estate broker/agent.
6. 2-3 tailored discovery questions.

Return ONLY valid JSON matching this schema (do NOT wrap with markdown quotes or backticks, just raw JSON):
{
  "score": number,
  "qualification": "HOT" | "WARM" | "COLD",
  "summary": "2-3 sentences concise executive briefing on this buyer profile and transaction likelihood",
  "painPoints": ["2-3 specific property constraints or buyer hesitations derived from their message/timeline"],
  "opportunities": ["1-3 high-value signals (e.g. cash buyer, ready timeline, premium location match)"],
  "recommendedPitch": "Actionable sales recommendation and opening angle tailored to their requirement",
  "suggestedQuestions": ["2-3 targeted questions to ask on the initial call to close/schedule viewing"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 75))),
      qualification: ['HOT', 'WARM', 'COLD'].includes(parsed.qualification)
        ? parsed.qualification
        : 'WARM',
      summary: parsed.summary || 'Real estate lead evaluated successfully.',
      painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
      recommendedPitch: parsed.recommendedPitch || 'Follow up with property portfolio matches.',
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions) ? parsed.suggestedQuestions : [],
      analyzedAt: new Date().toISOString(),
      modelUsed: 'gemini-2.5-flash',
    };
  } catch (error) {
    console.error('Gemini real estate lead analysis failed:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Unknown error during AI lead analysis.'
    );
  }
}
