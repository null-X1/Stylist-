import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJsonResponse(text) {
  text = text || '';
  try { return JSON.parse(text); } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]);
    const fb = text.indexOf('{'), lb = text.lastIndexOf('}');
    if (fb !== -1 && lb !== -1) return JSON.parse(text.substring(fb, lb + 1));
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { wardrobe, language, isModest, gender } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are Dalaby, a premium world-class AI fashion stylist.
Analyze the wardrobe and provide:
1. "missing_essentials": max 4 short strings of missing items based on gender${isModest ? ' and modesty guidelines' : ''}.
2. "styling_tips": exactly 2 objects with "title" and "description" (1-2 sentences) using items they OWN.
${isModest ? 'MODESTY: Suggest loose-fitting, fully covering items (Islamic guidelines).' : ''}
USER PROFILE: ${gender}.
Language: ${language === 'ar' ? 'Arabic' : 'English'}
Wardrobe: ${JSON.stringify(wardrobe)}
Return STRICTLY as JSON: { "missing_essentials": [...], "styling_tips": [{ "title": "...", "description": "..." }] }`,
        responseMimeType: "application/json"
      },
      contents: [{ role: 'user', parts: [{ text: "Analyze my wardrobe." }] }]
    });
    res.json(parseJsonResponse(response.text || '{}'));
  } catch (error) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ error: error.message });
  }
}
