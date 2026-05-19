import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJsonResponse(text) {
  text = text || '';
  try { return JSON.parse(text); } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]);
    const fb = text.indexOf('{'), lb = text.lastIndexOf('}');
    const fa = text.indexOf('['), la = text.lastIndexOf(']');
    if (fb !== -1 && lb !== -1 && (fa === -1 || fb < fa)) return JSON.parse(text.substring(fb, lb + 1));
    if (fa !== -1 && la !== -1) return JSON.parse(text.substring(fa, la + 1));
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64Image } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        parts: [
          {
            text: `Analyze this clothing image and identify ALL distinct clothing items.
If no clothing items, return an empty JSON array: []
Provide details in this JSON array format:
[{ "type": "string", "category": "work|casual|formal|party|university|sport", "color": "string", "material": "string", "style": "string", "gender": "male|female" }]
Return ONLY the JSON array.`
          },
          { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });
    res.json(parseJsonResponse(response.text || '[]'));
  } catch (error) {
    console.error("AI Analyze Error:", error);
    res.status(500).json({ error: error.message });
  }
}
