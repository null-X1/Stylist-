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
      bot?.sendMessage(query.message.chat.id, `✅ تم قبول اشتراك المستخدم ${userId} للباقة ${tierId}.`);
    } else if (action === "reject") {
      pendingApprovals[userId] = { status: "rejected", tierId: "" };
      bot?.answerCallbackQuery(query.id, { text: "تم رفض الاشتراك." });
      bot?.sendMessage(query.message.chat.id, `❌ تم رفض عملية الدفع للمستخدم ${userId}.`);
    }
  });
}

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
