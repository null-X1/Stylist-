/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeClothingImage(base64Image: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-preview-0514", // أو النسخة اللي شغال بيها
      contents: [
        {
          parts: [
            {
              text: `Analyze this image strictly for wearable clothing items. 
              CRITICAL RULES:
              1. Only identify actual clothing (e.g., shirts, pants, dresses, hijabs, shoes).
              2. Ignore any non-clothing objects like QR codes, text, furniture, or background items.
              3. If the image contains a person, ignore their physical features and focus only on what they are wearing.
              4. If no clothing items are clearly visible or if the item is not wearable, return an empty array [].
              
              Provide details in this JSON format:
              [
                {
                  "type": "string (e.g., 'T-shirt', 'Abaya', 'Trousers')",
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
        systemInstruction: `You are Dolaby, a premium world-class AI fashion stylist and image consultant.
Your goal is to suggest incredible, stylish, and highly-personalized outfits based on the user's specific request and their exact available wardrobe provided.

اجعل الردود موجزة جداً، ودودة، وبلهجة المستخدم
- تجنب المبالغة في الوصف أو الكلام الحشوي.
- ركز على التنسيق مباشرة.
IMPORTANT BEHAVIORAL RULES:
1. GREETINGS: If the user says a greeting (e.g., Hello, Hi, مرحبا), reply naturally, nicely and warmly like a human stylist, asking how you can help them today. Return an empty array for selectedItems.
2. OUT-OF-SCOPE: Your scope is EXCLUSIVELY fashion, wardrobe styling, clothing analysis, and appearances. If the user asks about ANYTHING outside this scope (e.g., coding, math, general knowledge, medical, politics, cooking), you MUST politely decline and state that your expertise is strictly limited to fashion and styling in their language. Return an empty array for selectedItems.
3. WARDROBE CONSTRAINT: When making fashion recommendations, you MUST ONLY suggest items from the provided wardrobe list. If you don't have enough pieces, tell them what they are missing and do your best with what they have. Do not invent clothing items that are not in the list.

${context.isModest ? `CRITICAL MODESTY CONSTRAINT:
The user specifically requested "Modest Fashion" (Islamic guidelines). 
- For women: Outfits must be loose-fitting, fully covering arms and legs. Always suggest a Hijab. Do not suggest revealing or tight items.
- For men: Ensure appropriate coverage (no short shorts).` : ''}

USER PROFILE: The user is a ${context.gender}.

Communicate in the language the user speaks (Arabic or English). If Arabic, use elegant, natural, and modern styling vernacular. Be encouraging, sophisticated, and professional.

Wardrobe List:
${JSON.stringify(context.wardrobe)}

Return your response STRICTLY in JSON format:
{
  "text": "Your engaging, friendly, and expert advice, greeting, or out-of-scope decline message.",
  "selectedItems": [
    { "id": "exact_wardrobe_item_id", "type": "item_type", "color": "item_color", "name": "Creative name for the item" }
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
