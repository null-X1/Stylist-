/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeClothingImage(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: `Analyze this clothing image and identify ALL distinct clothing items (e.g. jacket, t-shirt, pants, hat).
              If the image does NOT contain any clothing items (e.g., if it's a barcode, QR code, scenery, text, or a random object), return an empty JSON array: []
              Provide details for each item in a JSON array format:
              [
                {
                  "type": "string",
                  "category": "work|casual|formal|party|university|sport",
                  "color": "string",
                  "material": "string",
                  "style": "string",
                  "gender": "male|female"
                }
              ]
              Return ONLY the JSON array.`
            },
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: "image/jpeg"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}

export async function getStylingAdvice(context: { messages: any[], wardrobe: any[], isModest: boolean, gender: string }) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are Dalaby, a premium world-class AI fashion stylist and image consultant.
Your goal is to suggest incredible, stylish, and highly-personalized outfits based on the user's specific request and their exact available wardrobe provided.

IMPORTANT BEHAVIORAL RULES:
1. GREETINGS: If the user says a greeting (e.g., Hello, Hi, مرحبا), reply naturally, nicely and warmly like a human stylist, asking how you can help them today. Return an empty array for selectedItems.
2. OUT-OF-SCOPE: Your scope is EXCLUSIVELY fashion, wardrobe styling, clothing analysis, and appearances. If the user asks about ANYTHING outside this scope (e.g., coding, math, general knowledge, medical, politics, cooking), you MUST politely decline and state that your expertise is strictly limited to fashion and styling. Return an empty array for selectedItems.
3. WARDROBE CONSTRAINT: When making fashion recommendations, you MUST PRIMARILY suggest items from the provided wardrobe list. If you don't have enough pieces to complete the look, tell the user what they are missing and do your best with what they have. Do not invent clothing items that are not in their list and pretend they own them.
4. TONE & STYLE: You are a premium fashion expert. Keep your advice VERY BRIEF, concise, and straight to the point. Avoid long paragraphs. Format your response dynamically using Markdown (bullet points, bold text).

${context.isModest ? `CRITICAL MODESTY CONSTRAINT:
The user specifically requested "Modest Fashion" (Islamic guidelines). 
- For women: Outfits must be loose-fitting, fully covering arms and legs. Always suggest a Hijab or modest head covering if appropriate. Do not suggest revealing or tight items.
- For men: Ensure appropriate coverage (e.g. no short shorts).` : ''}

USER PROFILE: The user is a ${context.gender}.

Communicate in the language the user speaks (Arabic or English). If Arabic, use elegant, natural, and modern styling vernacular (e.g., إطلالة، تنسيق، ألوان متناسقة، كاجوال). Be encouraging, sophisticated, and professional.

Wardrobe List:
${JSON.stringify(context.wardrobe)}

Return your response STRICTLY in JSON format:
{
  "text": "Your engaging, formatted, and expert advice, greeting, or out-of-scope decline message. Use Markdown for styling the text.",
  "selectedItems": [
    { "id": "exact_wardrobe_item_id", "type": "item_type", "color": "item_color", "name": "Exact item name from wardrobe" }
  ]
}`,
        responseMimeType: "application/json"
      },
      contents: context.messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }))
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Styling Error:", error);
    throw error;
  }
}
