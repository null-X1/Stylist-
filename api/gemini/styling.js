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
    const { context } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are Dalaby, a premium AI fashion stylist.
RULES:
1. GREETINGS: Reply warmly, return empty selectedItems array.
2. OUT-OF-SCOPE: Politely decline anything outside fashion/styling.
3. WARDROBE CONSTRAINT: Only suggest items from the provided wardrobe list.
4. TONE: Brief, concise, Markdown formatting.
${context.isModest ? 'MODESTY (Islamic): Loose-fitting, full coverage. Suggest hijab for women.' : ''}
USER: ${context.gender}.
Respond in the user's language (Arabic or English).
Wardrobe: ${JSON.stringify(context.wardrobe)}
Return STRICTLY as JSON: { "text": "markdown response", "selectedItems": [{ "id": "...", "type": "...", "color": "...", "name": "..." }] }`,
        responseMimeType: "application/json"
      },
      contents: context.messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }))
    });
    res.json(parseJsonResponse(response.text || '{}'));
  } catch (error) {
    console.error("AI Styling Error:", error);
    res.status(500).json({ error: error.message });
  }
}
