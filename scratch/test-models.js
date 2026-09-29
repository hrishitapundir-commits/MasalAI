const { GoogleGenAI } = require('@google/genai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY in env');
    return;
  }
  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-flash'];

  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: 'Say hello',
      });
      console.log(`SUCCESS with ${model}:`, res.text);
      return;
    } catch (err) {
      console.log(`FAILED ${model}:`, err.message || err);
    }
  }
}

test();
