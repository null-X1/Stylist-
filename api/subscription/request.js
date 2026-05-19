import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, userEmail, tierId, senderNumber, base64Image } = req.body;

  if (!userId || !tierId || !senderNumber || !base64Image) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Save pending approval to Firestore
  await db.collection('pendingApprovals').doc(userId).set({
    status: "pending",
    tierId,
    createdAt: new Date()
  });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // Auto-approve fallback (dev only)
    setTimeout(async () => {
      await db.collection('pendingApprovals').doc(userId).set({ status: "approved", tierId });
    }, 2000);
    return res.json({ success: true, simulated: true });
  }

  try {
    // Convert base64 to buffer and send photo to Telegram
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const caption = `<b>طلب اشتراك جديد</b>\n\n<b>المستخدم:</b> ${userEmail || userId}\n<b>الباقة:</b> ${tierId}\n<b>رقم المرسل:</b> ${senderNumber}`;

    const reply_markup = JSON.stringify({
      inline_keyboard: [[
        { text: "✅ قبول", callback_data: `accept|${userId}|${tierId}` },
        { text: "❌ رفض", callback_data: `reject|${userId}` }
      ]]
    });

    // Use Telegram sendPhoto via multipart form (no node-telegram-bot-api needed)
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    formData.append('reply_markup', reply_markup);
    formData.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'receipt.jpg');

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) throw new Error(tgData.description);

    return res.json({ success: true });
  } catch (error) {
    console.error("Telegram Error:", error);
    return res.status(500).json({ error: "Failed to send Telegram notification: " + error.message });
  }
}
