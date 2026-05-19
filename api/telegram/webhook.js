import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function answerCallbackQuery(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function removeInlineKeyboard(chatId, messageId) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { callback_query } = req.body;

  if (callback_query) {
    const { id, data, message } = callback_query;
    if (!data || !message) return res.json({ ok: true });

    const parts = data.split('|');
    const action = parts[0];
    const userId = parts[1];
    const tierId = parts[2];

    if (action === 'accept') {
      await db.collection('pendingApprovals').doc(userId).set({ status: 'approved', tierId });
      await answerCallbackQuery(id, 'تم قبول الاشتراك وتفعيله!');
      await removeInlineKeyboard(message.chat.id, message.message_id);
      await sendMessage(message.chat.id, `✅ تم قبول اشتراك المستخدم ${userId} للباقة ${tierId}.`);
    } else if (action === 'reject') {
      await db.collection('pendingApprovals').doc(userId).set({ status: 'rejected', tierId: '' });
      await answerCallbackQuery(id, 'تم رفض الاشتراك.');
      await removeInlineKeyboard(message.chat.id, message.message_id);
      await sendMessage(message.chat.id, `❌ تم رفض عملية الدفع للمستخدم ${userId}.`);
    }
  }

  res.json({ ok: true });
}
