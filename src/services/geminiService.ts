/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJsonResponse(text: string) {
  text = text || '';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("JSON parse failed, attempting fallback...", err);
    // Remove markdown code blocks if present
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    // Attempt brute-force extraction of object or array
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    
    // Check which one appears first
    const isObject = firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);
    const isArray = firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
    
    if (isObject) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } else if (isArray) {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    }
    throw err;
  }
}

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

    return parseJsonResponse(response.text || '[]');
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}

export async function getWardrobeInsights(wardrobe: any[], language: string, isModest: boolean, gender: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are Dalaby, a premium world-class AI fashion stylist and image consultant.
Your task is to analyze the user's wardrobe and provide 2 things:
1. "missing_essentials": A list of short strings (1-4 words each) describing fundamental clothing items the user is missing based on their current wardrobe, their gender, and modesty preference (if applicable). Suggest maximum 4 items. If their wardrobe is fully complete, return an empty array or suggest very advanced complementary accessories.
2. "styling_tips": A list of objects containing a "title" and "description" (short, 1-2 sentences) giving them specific, brilliant, tailored advice on how to pair the items they CURRENTLY own. Focus on color harmony, proportions, and style mixing using their actual items. Provide exactly 2 tips.

${isModest ? `CRITICAL MODESTY CONSTRAINT:
The user specifically requested "Modest Fashion" (Islamic guidelines). 
Ensure missing items and tips align perfectly with these guidelines (e.g. suggesting loose-fitting clothes, long sleeves).` : ''}

USER PROFILE: The user is a ${gender}.

Provide the response in the following language: ${language === 'ar' ? 'Arabic' : 'English'}

Wardrobe List:
${JSON.stringify(wardrobe)}

Return your response STRICTLY in JSON format:
{
  "missing_essentials": ["string", "string"],
  "styling_tips": [
    { "title": "string", "description": "string" },
    { "title": "string", "description": "string" }
  ]
}`,
        responseMimeType: "application/json"
      },
      contents: [{ role: 'user', parts: [{ text: "Analyze my wardrobe and give me insights." }] }]
    });

    return parseJsonResponse(response.text || '{}');
  } catch (error) {
    console.error("AI Insights Error:", error);
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

    return parseJsonResponse(response.text || '{}');
  } catch (error) {
    console.error("AI Styling Error:", error);
    throw error;
  }
}
