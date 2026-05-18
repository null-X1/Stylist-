import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const pendingApprovals: Record<string, { status: string, tierId: string }> = {};

// Initialize Telegram Bot
let bot: TelegramBot | null = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  // Listen to callback queries from inline keyboards
  bot.on("callback_query", (query) => {
    if (!query.data || !query.message) return;
    const [action, userId, tierId] = query.data.split("|");

    if (action === "accept") {
      pendingApprovals[userId] = { status: "approved", tierId };
      bot?.answerCallbackQuery(query.id, { text: "تم قبول الاشتراك وتفعيله!" });
      bot?.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id }).catch(console.error);
      bot?.sendMessage(query.message.chat.id, `✅ تم قبول اشتراك المستخدم ${userId} للباقة ${tierId}.`);
    } else if (action === "reject") {
      pendingApprovals[userId] = { status: "rejected", tierId: "" };
      bot?.answerCallbackQuery(query.id, { text: "تم رفض الاشتراك." });
      bot?.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: query.message.chat.id, message_id: query.message.message_id }).catch(console.error);
      bot?.sendMessage(query.message.chat.id, `❌ تم رفض عملية الدفع للمستخدم ${userId}.`);
    }
  });
}

// Initialize Gemini AI
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

function parseJsonResponse(text: string) {
  text = text || '';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("JSON parse failed, attempting fallback...", err);
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]);
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    const isObject = firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);
    const isArray = firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
    if (isObject) return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    else if (isArray) return JSON.parse(text.substring(firstBracket, lastBracket + 1));
    throw err;
  }
}

app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { base64Image } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
      config: { responseMimeType: "application/json" }
    });
    res.json(parseJsonResponse(response.text || '[]'));
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/insights", async (req, res) => {
  try {
    const { wardrobe, language, isModest, gender } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    res.json(parseJsonResponse(response.text || '{}'));
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/styling", async (req, res) => {
  try {
    const { context } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
      contents: context.messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }))
    });
    res.json(parseJsonResponse(response.text || '{}'));
  } catch (error: any) {
    console.error("AI Styling Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * Endpoint to submit a manual payment screenshot
 */
app.post("/api/subscription/request", async (req, res) => {
  const { userId, userEmail, tierId, senderNumber, base64Image } = req.body;

  if (!userId || !tierId || !senderNumber || !base64Image) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Register in memory
  pendingApprovals[userId] = { status: "pending", tierId };

  if (bot && process.env.TELEGRAM_CHAT_ID) {
    try {
      // Decode base64 to buffer
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const caption = `<b>طلب اشتراك جديد</b>\n\n` +
        `<b>المستخدم:</b> ${userEmail || userId}\n` +
        `<b>الباقة:</b> ${tierId}\n` +
        `<b>رقم المرسل:</b> ${senderNumber}`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ قبول", callback_data: `accept|${userId}|${tierId}` },
            { text: "❌ رفض", callback_data: `reject|${userId}|${tierId}` }
          ]
        ]
      };

      await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, buffer, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending Telegram message:", error);
      return res.status(500).json({ error: "Failed to send notification to admin." });
    }
  } else {
    // Fallback if no bot token: auto-approve for testing without telegram
    console.log("No telegram bot token. Auto-approving for preview.");
    
    // Simulate auto-approval delay
    setTimeout(() => {
      pendingApprovals[userId] = { status: "approved", tierId };
    }, 2000);
    
    return res.json({ success: true, simulated: true });
  }
});

/**
 * Polling endpoint for frontend
 */
app.get("/api/subscription/status", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const statusObj = pendingApprovals[userId];
  if (statusObj) {
    res.json(statusObj);
  } else {
    res.json({ status: "none" });
  }
});

/**
 * Clear the pending state after successfully updating client side
 */
app.post("/api/subscription/clear", (req, res) => {
  const { userId } = req.body;
  if (userId && pendingApprovals[userId]) {
    delete pendingApprovals[userId];
  }
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
