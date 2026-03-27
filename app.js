// استيراد React والمكتبات الأخرى
import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, updateProfile } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import { Home, Shirt, PlusCircle, Sparkles, LogOut, Trash2, Loader2, CheckCircle, Bookmark, X, Palette, Moon, Sun, UserCircle, UploadCloud, DownloadCloud, Image as ImageIcon, Upload, Droplets, Edit3, ImageOff, Copy, Check, AlertCircle, Heart, RefreshCw, Send } from 'https://esm.sh/lucide-react@0.344.0';

// ==========================================
// 🔴 إعدادات Firebase و Gemini 🔴
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCUWo6X8HCoflJz_szXNZ7vmzOEGFyXeFk",
  authDomain: "stylist-b314d.firebaseapp.com",
  projectId: "stylist-b314d",
  storageBucket: "stylist-b314d.firebasestorage.app",
  messagingSenderId: "167886790732",
  appId: "1:167886790732:web:a0411741ad66ec71ff54e9",
  measurementId: "G-882W8GKJC6"
};
const GEMINI_API_KEY = "AIzaSyB3N4PW5mpQgK6nYeZdA4NavqzrviZpXEI";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'anaqa-app';

// ==========================================
// السياقات (يجب تعريفها قبل استخدامها)
// ==========================================
const ToastContext = createContext();
const ConfirmContext = createContext();

// ==========================================
// دوال مساعدة
// ==========================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const fetchWithRetry = async (url, options, retries = 3) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(delay);
      delay *= 2;
    }
  }
};

const extractJSON = (text) => {
  if (!text) return null;
  try {
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = cleanText.search(/[\{\[]/);
    const endIdx = cleanText.search(/[\}\]][^}\]]*$/);
    if (startIdx !== -1 && endIdx !== -1) cleanText = cleanText.substring(startIdx, endIdx + 1);
    return JSON.parse(cleanText);
  } catch (e) { return null; }
};

const copyToClipboard = (text, showToast) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.select();
  try { document.execCommand('copy'); showToast?.('تم النسخ ✅', 'success'); }
  catch (err) { showToast?.('فشل النسخ', 'error'); }
  document.body.removeChild(textArea);
};

const processImage = (file, maxWidth = 600, removeBg = false) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        if (removeBg) {
          try {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const r = data[0], g = data[1], b = data[2];
            const threshold = 40;
            for (let i = 0; i < data.length; i += 4) {
              if (Math.abs(data[i] - r) < threshold && Math.abs(data[i+1] - g) < threshold && Math.abs(data[i+2] - b) < threshold) {
                data[i+3] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          } catch (e) { console.error("BG Removal failed", e); }
        }
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};

// ==========================================
// خدمات الذكاء الاصطناعي (Gemini)
// ==========================================
const analyzeImageWithAI = async (base64Image) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const base64Data = base64Image.split(',')[1];
  const prompt = `You are a STRICT fashion analyzer. Does it contain CLEAR clothing items? If not, return []. Extract: [{"type":"...","color":"#HEXCODE","season":"all|summer|winter","targetGender":"male|female|unisex"}]`;
  const payload = {
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: base64Image.startsWith('data:image/png') ? "image/png" : "image/jpeg", data: base64Data } }] }],
    generationConfig: { responseMimeType: "application/json" }
  };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    let result = extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
    if (!result) return [];
    return Array.isArray(result) ? result.filter(i=>i.type) : [result];
  } catch (error) { return null; }
};

const suggestOutfitWithAI = async (clothes, chatHistory, profile) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const cleanWardrobe = clothes.filter(c => !c.inLaundry && (c.targetGender === 'unisex' || c.targetGender === profile.gender || !c.targetGender));
  const wardrobeData = cleanWardrobe.map(c => ({ id: c.id, type: c.type, color: c.color, season: c.season }));
  const systemPrompt = `You are a professional fashion stylist. Available Wardrobe: ${JSON.stringify(wardrobeData)} Gender: ${profile.gender === 'female' ? "Female" : "Male"} Return JSON: { "outfit": { "topId": "id or null", "bottomId": "id or null", "shoesId": "id or null", "accessoryId": "id or null" }, "aiMessage": "Short reason", "quickReplies": ["تغيير الحذاء", "لون مختلف"] }`;
  const contents = chatHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.role === 'user' ? msg.text : JSON.stringify(msg.outfit || msg.text) }] }));
  const payload = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents, generationConfig: { responseMimeType: "application/json" } };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) { return null; }
};

const analyzeWardrobeGapsWithAI = async (clothes, profile) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const cleanWardrobe = clothes.filter(c => !c.inLaundry).map(c => ({ type: c.type, color: c.color, season: c.season }));
  const prompt = `Analyze wardrobe gaps. Gender: ${profile.gender === 'female' ? 'Female' : 'Male'}. Suggest 3 missing versatile items. Respond JSON: { "summary": "Arabic summary", "suggestions": [{ "item": "Arabic name", "colorHex": "#hex", "reason": "Arabic reason" }] }`;
  const payload = { contents: [{ parts: [{ text: prompt + " Wardrobe: " + JSON.stringify(cleanWardrobe) }] }], generationConfig: { responseMimeType: "application/json" } };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) { return null; }
};

const generateCaptionWithAI = async (outfitDesc) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const prompt = `Write trendy Instagram caption in Arabic for: ${outfitDesc}. Include emojis, hashtags. Return JSON: { "caption": "caption text" }`;
  const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
  try {
    const data = await fetchWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) { return null; }
};

// ==========================================
// الثوابت والمكونات المشتركة
// ==========================================
const ITEM_TYPES = {
  top: [{ val: 'tshirt', label: 'تيشيرت' }, { val: 'shirt', label: 'قميص' }, { val: 'blouse', label: 'بلوزة' }, { val: 'sweater', label: 'بلوفر' }, { val: 'hoodie', label: 'هودي' }, { val: 'jacket', label: 'جاكيت' }, { val: 'coat', label: 'معطف' }, { val: 'vest', label: 'فيست' }],
  bottom: [{ val: 'pants', label: 'بنطال' }, { val: 'jeans', label: 'جينز' }, { val: 'shorts', label: 'شورت' }, { val: 'skirt', label: 'تنورة' }],
  full: [{ val: 'dress', label: 'فستان' }, { val: 'abaya', label: 'عباءة' }, { val: 'suit', label: 'بدلة' }],
  shoes: [{ val: 'sneakers', label: 'رياضي' }, { val: 'shoes', label: 'كلاسيك' }, { val: 'boots', label: 'بوت' }, { val: 'sandals', label: 'صندل' }],
  accessories: [{ val: 'hijab', label: 'حجاب' }, { val: 'scarf', label: 'وشاح' }, { val: 'tie', label: 'ربطة عنق' }]
};
const ALL_TYPES_FLAT = Object.values(ITEM_TYPES).flat().reduce((acc, curr) => ({...acc, [curr.val]: curr.label}), {});
const translateType = (type) => ALL_TYPES_FLAT[type] || type;
const QUICK_COLORS = ['#ffffff', '#000000', '#9ca3af', '#1e3a8a', '#b91c1c', '#f59e0b', '#166534', '#fdf6e3', '#ec4899', '#8b5cf6'];

// مكون شعار دولابي الجديد
const DolabyLogo = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M128 48C108 48 96 62 96 80C96 95 106 105 116 112C125 118 128 128 128 138V152M128 152L40 208H216L128 152Z" stroke="url(#logo-grad)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M200 64C200 64 204 84 224 84C204 84 200 104 200 104C200 104 196 84 176 84C196 84 200 64 200 64Z" fill="#FBBF24"/>
    <path d="M64 100C64 100 66 112 78 112C66 112 64 124 64 124C64 124 62 112 50 112C62 112 64 100 64 100Z" fill="#FCD34D"/>
    <defs>
      <linearGradient id="logo-grad" x1="40" y1="48" x2="216" y2="208" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1"/>
        <stop offset="1" stopColor="#A855F7"/>
      </linearGradient>
    </defs>
  </svg>
);


const LiveAvatar = ({ items }) => {
  const top = items.top || items.full;
  const bottom = items.bottom;
  const shoes = items.shoes;
  const acc = items.accessories;
  return (
    <svg viewBox="0 0 200 350" className="w-full h-full drop-shadow-md">
      <g id="mannequin" fill="var(--skin-color, #cbd5e1)">
        <circle cx="100" cy="40" r="22" />
        <rect x="92" y="55" width="16" height="20" />
        <path d="M70 70 Q100 65 130 70 L120 180 L80 180 Z" />
        <path d="M70 70 L45 150 L60 150 L85 80 Z" />
        <path d="M130 70 L155 150 L140 150 L115 80 Z" />
        <path d="M80 180 L72 300 L93 300 L98 180 Z" />
        <path d="M120 180 L128 300 L107 300 L102 180 Z" />
        <path d="M72 300 L93 300 L93 315 L62 315 Z" />
        <path d="M128 300 L107 300 L107 315 L138 315 Z" />
      </g>
      {bottom && (
        <g fill={bottom.color}>
          {['pants', 'jeans'].includes(bottom.type) && <path d="M78 178 L68 305 L95 305 L100 178 L105 305 L132 305 L122 178 Z" />}
          {bottom.type === 'shorts' && <path d="M78 178 L72 240 L97 240 L100 178 L103 240 L128 240 L122 178 Z" />}
          {bottom.type === 'skirt' && <path d="M80 178 L55 260 L145 260 L120 178 Z" />}
        </g>
      )}
      {top && (
        <g fill={top.color}>
          {['tshirt', 'shirt', 'blouse'].includes(top.type) && <path d="M65 68 Q100 78 135 68 L150 120 L130 125 L122 185 L78 185 L70 125 L50 120 Z" />}
          {['sweater', 'hoodie', 'jacket', 'coat'].includes(top.type) && <path d="M55 65 Q100 75 145 65 L165 155 L140 160 L125 195 L75 195 L60 160 L35 155 Z" />}
          {['dress', 'abaya', 'suit'].includes(top.type) && <path d="M65 68 Q100 75 135 68 L145 110 L135 115 L150 280 L50 280 L65 115 L55 110 Z" />}
        </g>
      )}
      {acc && (
        <g fill={acc.color}>
          {acc.type === 'hijab' && <path d="M75 15 Q100 -5 125 15 L130 60 Q100 80 70 60 Z" />}
          {acc.type === 'tie' && <path d="M95 70 L105 70 L102 120 L100 125 L98 120 Z" />}
        </g>
      )}
      {shoes && (
        <g fill={shoes.color}>
          <path d="M68 302 L95 302 L95 318 L55 318 Q55 302 68 302 Z" />
          <path d="M132 302 L105 302 L105 318 L145 318 Q145 302 132 302 Z" />
          {shoes.type === 'sneakers' && <g fill="#ffffff" opacity="0.8"><rect x="58" y="312" width="35" height="6" rx="2" /><rect x="107" y="312" width="35" height="6" rx="2" /></g>}
        </g>
      )}
    </svg>
  );
};

const OutfitCard = ({ outfit, clothes }) => {
  if (!outfit) return null;
  const top = clothes.find(c => c.id === outfit.topId);
  const bottom = clothes.find(c => c.id === outfit.bottomId);
  const shoes = clothes.find(c => c.id === outfit.shoesId);
  const acc = clothes.find(c => c.id === outfit.accessoryId);
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl p-4 shadow-lg border border-[var(--border-color)] flex items-center gap-4 transition-all hover:shadow-xl">
      <div className="w-24 h-32 flex-shrink-0 bg-[var(--bg-base)] rounded-xl p-2 border border-[var(--border-color)]">
        <LiveAvatar items={{ top, bottom, shoes, accessories: acc }} />
      </div>
      <div className="flex-1 space-y-2">
        {[top, bottom, shoes, acc].filter(Boolean).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full shadow-inner border border-[var(--border-color)] flex-shrink-0 overflow-hidden" style={{backgroundColor: item.color}}>
              {item.image && <img src={item.image} className="w-full h-full object-cover mix-blend-multiply opacity-50" />}
            </div>
            <p className="text-xs font-bold text-[var(--text-main)]">{translateType(item.type)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex lg:flex-row flex-col items-center gap-1 lg:gap-3 p-2 lg:p-3 lg:w-full rounded-xl transition-all ${active ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)]'}`}>
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>{icon}</div>
    <span className="text-[10px] lg:text-xs font-bold">{label}</span>
  </button>
);




// ==========================================
// شاشة تسجيل الدخول
// ==========================================
const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showToast = useContext(ToastContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('تم تسجيل الدخول', 'success');
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        showToast('تم إنشاء الحساب', 'success');
      }
    } catch (err) {
      setError("تأكد من صحة البيانات أو أن الحساب موجود.");
      showToast('فشل تسجيل الدخول', 'error');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch(err) {
      console.error("سبب فشل تسجيل الدخول:", err); 
      showToast('فشل تسجيل الدخول', 'error');
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen w-full">
      <div className="bg-[var(--bg-card)] p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[var(--border-color)]">
        <div className="text-center mb-6">
          <div className="inline-flex bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 mb-3"><DolabyLogo className="w-8 h-8" /></div>
          <h1 className="text-2xl font-black">dolaby</h1>
          <p className="text-[var(--text-muted)] font-bold text-xs">{isLogin ? 'سجل دخولك لمتابعة أناقتك' : 'أنشئ حسابك الجديد'}</p>
        </div>
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-xs font-bold text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none" placeholder="الاسم الكريم"/>}
          <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none" placeholder="البريد الإلكتروني"/>
          <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm outline-none" placeholder="كلمة المرور"/>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-sm">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب')}
          </button>
        </form>
        <div className="mt-4">
          <button onClick={handleGoogle} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] font-bold text-sm py-2.5 rounded-xl hover:bg-[var(--hover-bg)] flex items-center justify-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            متابعة باستخدام Google
          </button>
        </div>
        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="w-full text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-5 hover:underline">
          {isLogin ? "ليس لديك حساب؟ قم بإنشائه الآن" : "لديك حساب بالفعل؟ سجل دخولك"}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// المكونات الرئيسية
// ==========================================
const DashboardView = ({ clothes, profile, setProfile, user, favorites }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([{ role: 'model', text: 'أهلاً بك! أنا ستايليست الخاص بك. ماذا نرتدي اليوم؟', outfit: null, quickReplies: ["للعمل", "خروج كاجوال", "مناسبة ليلية"] }]);
  const chatEndRef = useRef(null);
  const showToast = useContext(ToastContext);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const handleGenderToggle = async () => {
    const newGender = profile.gender === 'male' ? 'female' : 'male';
    setProfile(p => ({...p, gender: newGender}));
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), { gender: newGender }, { merge: true });
    showToast(`تم التبديل إلى ${newGender === 'male' ? 'رجالي' : 'نسائي'}`, 'success');
  };

  const handleSend = async (txt = null) => {
    const textToSend = txt || input;
    if (!textToSend.trim()) return;

    const cleanClothes = clothes.filter(c => !c.inLaundry && (c.targetGender === 'unisex' || c.targetGender === profile.gender || !c.targetGender));
    if (cleanClothes.length < 3) {
      setMessages(p => [...p, { role: 'user', text: textToSend }, { role: 'model', text: 'أحتاج إلى 3 قطع ملابس نظيفة ومناسبة لك على الأقل في الخزانة لتنسيق طقم لك! 🧺 أضف ملابس جديدة أو تأكد من إعدادات ملابسك.' }]);
      setInput(''); return;
    }

    const newHistory = [...messages, { role: 'user', text: textToSend }];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    const result = await suggestOutfitWithAI(clothes, newHistory, profile);
    if (result?.outfit && (result.outfit.topId || result.outfit.bottomId)) {
      setMessages(p => [...p, { role: 'model', text: result.aiMessage || 'تفضل هذا التنسيق:', outfit: result.outfit, quickReplies: result.quickReplies || ["لون آخر", "حذاء مختلف"] }]);
    } else {
      setMessages(p => [...p, { role: 'model', text: 'عذراً، لم أجد قطعاً مناسبة في خزانتك لطلبك الحالي. جرب طلباً آخر.' }]);
    }
    setLoading(false);
  };

  const saveOutfit = async (outfit) => {
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'favorites', `outfit_${Date.now()}`), { outfit, createdAt: Date.now() });
    showToast('تم حفظ التنسيق في المفضلات', 'success');
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)] md:h-[calc(100dvh-50px)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">المساعد الذكي</h2>
        <button onClick={handleGenderToggle} className="text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shadow-sm">
          التنسيق لـ: {profile.gender === 'male' ? '👨 رجالي' : '🧕 نسائي'} (تغيير)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 hide-scroll pb-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[var(--bg-card)] text-[var(--text-main)] rounded-tl-none border border-[var(--border-color)]'}`}>
              <p className="font-bold text-sm leading-relaxed">{msg.text}</p>
              {msg.outfit && (
                <div className="mt-3">
                  <OutfitCard outfit={msg.outfit} clothes={clothes} />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => saveOutfit(msg.outfit)} className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--hover-bg)] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-[var(--border-color)]"><Heart className="w-3 h-3"/> حفظ</button>
                    <button onClick={() => handleSend("تنسيق مختلف")} className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-base)] hover:bg-[var(--hover-bg)] px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-[var(--border-color)]"><RefreshCw className="w-3 h-3"/> غيره</button>
                  </div>
                </div>
              )}
              {msg.quickReplies && !loading && idx === messages.length - 1 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
                  {msg.quickReplies.map((qr, i) => (
                    <button key={i} onClick={() => handleSend(qr)} className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-500/20 transition-colors">{qr}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-[var(--bg-card)] rounded-2xl rounded-tl-none p-4 border border-[var(--border-color)] shadow-sm"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /></div></div>}
        <div ref={chatEndRef} />
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-1.5 rounded-full flex items-center shadow-sm flex-shrink-0 mt-2">
        <input type="text" placeholder="ماذا نرتدي اليوم؟" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-transparent border-none px-4 py-2 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none font-bold" />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full transition-transform active:scale-95 disabled:opacity-50"><Send className="w-4 h-4 rtl:scale-x-[-1]" /></button>
      </div>
    </div>
  );
};

const ClosetView = ({ clothes, profile, user }) => {
  const [filter, setFilter] = useState('All');
  const [editingItem, setEditingItem] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const showToast = useContext(ToastContext);
  const confirm = useContext(ConfirmContext);

  const getCategory = (type) => {
    if (ITEM_TYPES.top.some(t => t.val === type)) return 'top';
    if (ITEM_TYPES.bottom.some(t => t.val === type)) return 'bottom';
    if (ITEM_TYPES.full.some(t => t.val === type)) return 'full';
    if (ITEM_TYPES.shoes.some(t => t.val === type)) return 'shoes';
    if (ITEM_TYPES.accessories.some(t => t.val === type)) return 'accessories';
    return 'top';
  };

  const filteredClothes = useMemo(() => {
    if (filter === 'laundry') return clothes.filter(c => c.inLaundry);
    const nonLaundry = clothes.filter(c => !c.inLaundry);
    if (filter === 'All') return nonLaundry;
    return nonLaundry.filter(c => getCategory(c.type) === filter);
  }, [clothes, filter]);

  const handleDelete = async (id) => {
    confirm('هل أنت متأكد من حذف هذه القطعة؟', async () => {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clothes', id));
      showToast('تم الحذف', 'success');
    });
  };

  const toggleLaundry = async (item) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clothes', item.id), {
      inLaundry: !item.inLaundry
    });
    showToast(item.inLaundry ? 'تم إخراجها من الغسيل' : 'تم إرسالها للغسيل', 'success');
  };

  const handleSaveEdit = async (updatedItem) => {
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clothes', updatedItem.id), updatedItem);
    setEditingItem(null);
    showToast('تم التعديل', 'success');
  };

  const handleAnalyzeGaps = async () => {
    setIsAnalyzingGaps(true);
    const result = await analyzeWardrobeGapsWithAI(clothes, profile);
    setGapAnalysis(result);
    setIsAnalyzingGaps(false);
  };

  const tabs = [
    { id: 'All', label: 'الكل' }, { id: 'top', label: 'علوي' }, { id: 'bottom', label: 'سفلي' },
    { id: 'full', label: 'كامل' }, { id: 'shoes', label: 'حذاء' }, { id: 'accessories', label: 'إكسسوار' },
    { id: 'laundry', label: 'سلة الغسيل 🧺' }
  ];

  return (
    <div className="space-y-4 relative">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-black text-[var(--text-main)]">خزانتي</h2>
          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-color)]">
            الإجمالي: {clothes.length}
          </span>
        </div>
        <button onClick={handleAnalyzeGaps} disabled={isAnalyzingGaps || clothes.length === 0}
          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50">
          {isAnalyzingGaps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          تحليل النواقص ✨
        </button>
      </div>

      {gapAnalysis && (
        <div className="bg-[var(--bg-card)] border-2 border-indigo-500/30 rounded-2xl p-4 shadow-md relative overflow-hidden animate-in">
          <button onClick={() => setGapAnalysis(null)} className="absolute top-2 left-2 p-1 text-[var(--text-muted)] hover:text-indigo-500"><X className="w-4 h-4"/></button>
          <h3 className="font-black text-indigo-500 text-sm mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4"/> رأي الستايليست:</h3>
          <p className="text-xs font-bold text-[var(--text-main)] mb-4 leading-relaxed">{gapAnalysis.summary}</p>
          <div className="space-y-2">
            <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wide">نوصيك باقتناء القطع التالية:</p>
            {gapAnalysis.suggestions?.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-[var(--bg-base)] p-3 rounded-xl border border-[var(--border-color)] shadow-sm">
                <div className="w-6 h-6 rounded-full border border-[var(--border-color)] shadow-inner flex-shrink-0" style={{backgroundColor: s.colorHex}}></div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-main)]">{s.item}</p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-snug">{s.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
        {tabs.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-bold transition-all border ${filter === f.id ? 'bg-[var(--text-main)] text-[var(--bg-base)] border-[var(--text-main)]' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filteredClothes.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm">
          {filter === 'laundry' ? <Droplets className="w-12 h-12 text-blue-400 opacity-50 mx-auto mb-3" /> : <Shirt className="w-12 h-12 text-[var(--text-muted)] opacity-50 mx-auto mb-3" />}
          <p className="text-[var(--text-muted)] font-bold text-sm">{filter === 'laundry' ? 'لا توجد ملابس في الغسيل' : 'لا توجد قطع هنا'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredClothes.map(item => {
            const cat = getCategory(item.type);
            const dummyItems = { [cat]: item };
            return (
              <div key={item.id} className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden group relative transition-all shadow-sm ${item.inLaundry ? 'opacity-80' : 'hover:shadow-md'}`}>
                <div className="aspect-[4/5] bg-[var(--bg-base)] flex items-center justify-center p-2 relative">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-lg" /> : <LiveAvatar items={dummyItems} />}
                  {item.inLaundry && (
                    <div className="absolute inset-0 bg-blue-900/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg flex items-center gap-1"><Droplets className="w-3 h-3"/> في الغسيل</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={() => toggleLaundry(item)} title={item.inLaundry ? 'إخراج من الغسيل' : 'إرسال للغسيل'} className={`p-1.5 rounded-full shadow-md transition-colors ${item.inLaundry ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                      {item.inLaundry ? <CheckCircle className="w-3 h-3"/> : <Droplets className="w-3 h-3"/>}
                    </button>
                    <button onClick={() => setEditingItem(item)} title="تعديل" className="p-1.5 bg-gray-800 text-white rounded-full hover:bg-gray-900 shadow-md">
                      <Edit3 className="w-3 h-3"/>
                    </button>
                    <button onClick={() => handleDelete(item.id)} title="حذف" className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md">
                      <Trash2 className="w-3 h-3"/>
                    </button>
                  </div>
                </div>
                <div className="p-2 border-t border-[var(--border-color)]">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-bold text-[var(--text-main)] text-xs truncate">{translateType(item.type)}</h3>
                    <div className="w-3 h-3 rounded-full shadow-inner border border-[var(--border-color)] flex-shrink-0" style={{ backgroundColor: item.color }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase">{item.season}</p>
                    <p className="text-[9px] text-[var(--text-muted)] font-bold">{item.targetGender === 'male' ? 'رجالي' : item.targetGender === 'female' ? 'نسائي' : 'للجنسين'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingItem && (
        <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} getCategory={getCategory} />
      )}
    </div>
  );
};

const EditModal = ({ item, onClose, onSave, getCategory }) => {
  const [editedItem, setEditedItem] = useState(item);
  const category = getCategory(editedItem.type);

  const handleCategoryChange = (newCat) => {
    setEditedItem({...editedItem, type: ITEM_TYPES[newCat][0].val});
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-5 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4"/></button>
        <h3 className="text-lg font-black text-[var(--text-main)] mb-4">تعديل القطعة</h3>
        <div className="flex gap-4 mb-4">
          <div className="w-24 h-32 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg flex items-center justify-center p-2 relative overflow-hidden flex-shrink-0">
            {editedItem.image ? <img src={editedItem.image} className="w-full h-full object-cover rounded" /> : <LiveAvatar items={{ [getCategory(editedItem.type)]: editedItem }} />}
            <label className="absolute bottom-1 right-1 bg-black/60 text-white p-1.5 rounded-full cursor-pointer hover:bg-black">
              <ImageIcon className="w-3 h-3" />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if(e.target.files[0]) { const img = await processImage(e.target.files[0], 400, false); setEditedItem({...editedItem, image: img}); } }} />
            </label>
            {editedItem.image && (
              <button onClick={() => setEditedItem({...editedItem, image: null})} className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full hover:bg-red-500"><ImageOff className="w-3 h-3"/></button>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">القسم / النوع</label>
              <div className="flex gap-1">
                <select value={category} onChange={e => handleCategoryChange(e.target.value)} className="w-1/3 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2 rounded-lg outline-none focus:border-indigo-500">
                  <option value="top">علوي</option><option value="bottom">سفلي</option><option value="full">كامل</option><option value="shoes">حذاء</option><option value="accessories">إكسسوار</option>
                </select>
                <select value={editedItem.type} onChange={e => setEditedItem({...editedItem, type: e.target.value})} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2 rounded-lg outline-none focus:border-indigo-500">
                  {ITEM_TYPES[category].map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">الفئة</label>
              <select value={editedItem.targetGender || 'unisex'} onChange={e => setEditedItem({...editedItem, targetGender: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2 rounded-lg outline-none focus:border-indigo-500">
                <option value="unisex">للجنسين</option><option value="male">رجالي</option><option value="female">نسائي</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">الموسم</label>
                <select value={editedItem.season} onChange={e => setEditedItem({...editedItem, season: e.target.value})} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2 rounded-lg outline-none focus:border-indigo-500">
                  <option value="all">الكل</option><option value="summer">صيفي</option><option value="winter">شتوي</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">اللون</label>
                <div className="w-10 h-[34px] rounded-lg border border-[var(--border-color)] overflow-hidden">
                  <input type="color" value={editedItem.color} onChange={e => setEditedItem({...editedItem, color: e.target.value})} className="w-full h-full cursor-pointer border-none p-0 bg-transparent"/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => onSave(editedItem)} className="w-full bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
          حفظ التعديلات
        </button>
      </div>
    </div>
  );
};

const AddClothingView = ({ profile, user, onAdded }) => {
  const [mode, setMode] = useState('choose');
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [analyzedItems, setAnalyzedItems] = useState([]);
  const [category, setCategory] = useState('top');
  const [type, setType] = useState('tshirt');
  const [color, setColor] = useState('#000000');
  const [season, setSeason] = useState('all');
  const [targetGender, setTargetGender] = useState('unisex');
  const showToast = useContext(ToastContext);

  const processFiles = async (files) => {
    if (!files.length) return;
    setLoading(true);
    setAiError('');
    let results = [];
    try {
      for(const file of files) {
        const base64 = await processImage(file, 400, autoRemoveBg);
        const aiResults = await analyzeImageWithAI(base64);
        if (aiResults && aiResults.length > 0) {
          aiResults.forEach(res => results.push({
            image: base64,
            type: res.type || 'tshirt',
            color: res.color || '#000000',
            season: res.season || 'all',
            targetGender: res.targetGender || 'unisex',
            inLaundry: false
          }));
        }
      }
      if (results.length > 0) {
        setAnalyzedItems(results);
        setMode('ai_review');
      } else {
        setAiError('لم يتم التعرف على الملابس. يرجى تجربة الإدخال اليدوي.');
      }
    } catch (err) {
      setAiError('حدث خطأ أثناء التحليل.');
    }
    setLoading(false);
  };

  const handleSmartUpload = (e) => processFiles(Array.from(e.target.files).filter(f => f.type.startsWith('image/')));
  const handleDragOver = (e) => { e.preventDefault(); if(!loading) setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if(loading) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if(files.length > 0) processFiles(files);
  };

  const handleSaveAIItems = async () => {
    setLoading(true);
    for(const item of analyzedItems) {
      await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'clothes')), { ...item, createdAt: Date.now() });
    }
    setLoading(false);
    showToast('تمت إضافة القطع بنجاح', 'success');
    onAdded();
  };

  const removeAiItem = (index) => {
    const newArr = analyzedItems.filter((_, i) => i !== index);
    if(newArr.length === 0) setMode('choose');
    else setAnalyzedItems(newArr);
  };

  const handleManualSave = async () => {
    setLoading(true);
    await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'clothes')), {
      type, color, season, targetGender, inLaundry: false, createdAt: Date.now()
    });
    setLoading(false);
    showToast('تمت الإضافة', 'success');
    onAdded();
  };

  useEffect(() => { setType(ITEM_TYPES[category][0].val); }, [category]);

  if (mode === 'choose') {
    return (
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`max-w-2xl mx-auto space-y-6 pt-4 p-6 rounded-3xl transition-all border-2 ${isDragging ? 'border-indigo-500 bg-indigo-500/10 border-dashed scale-[1.02]' : 'border-transparent'}`}>
        <h2 className="text-xl font-black text-[var(--text-main)] text-center mb-4">إضافة قطعة جديدة</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`flex flex-col items-center justify-center p-6 bg-[var(--bg-card)] border rounded-2xl transition-all text-center relative overflow-hidden ${loading ? 'opacity-50 cursor-not-allowed border-[var(--border-color)]' : 'hover:border-indigo-500 border-indigo-500/30 shadow-sm'}`}>
            {loading ? <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" /> : <div className="bg-indigo-500/10 p-3 rounded-full mb-3"><Upload className="w-8 h-8 text-indigo-500" /></div>}
            <h3 className="text-lg font-black text-[var(--text-main)] mb-1">تحليل ذكي (AI)</h3>
            <p className="text-xs text-[var(--text-muted)] font-bold mb-4">اسحب الصور هنا أو اضغط لرفعها</p>
            <label className="flex items-center gap-2 mb-4 text-xs font-bold text-[var(--text-muted)] cursor-pointer">
              <input type="checkbox" checked={autoRemoveBg} onChange={e=>setAutoRemoveBg(e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
              إزالة الخلفية (تجريبي ✨)
            </label>
            <label className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-colors">
              تحديد الصور
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleSmartUpload} disabled={loading} />
            </label>
          </div>
          <button onClick={() => setMode('manual')} disabled={loading}
            className={`flex flex-col items-center justify-center p-6 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl transition-all text-center ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--hover-bg)] shadow-sm'}`}>
            <div className="bg-[var(--bg-base)] p-3 rounded-full mb-3 border border-[var(--border-color)]"><Palette className="w-8 h-8 text-[var(--text-muted)]" /></div>
            <h3 className="text-lg font-black text-[var(--text-main)] mb-1">إدخال يدوي</h3>
            <p className="text-xs text-[var(--text-muted)] font-bold">حدد التفاصيل يدوياً بدون صور.</p>
          </button>
        </div>
        {aiError && <p className="text-center text-red-500 font-bold text-sm bg-red-500/10 py-2 rounded-lg">{aiError}</p>}
      </div>
    );
  }

  if (mode === 'ai_review') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-[var(--text-main)]">مراجعة القطع ({analyzedItems.length})</h2>
          <button onClick={() => setMode('choose')} className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]">إلغاء</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {analyzedItems.map((item, idx) => (
            <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-xl flex items-start gap-3 shadow-sm">
              <div className="w-16 h-20 rounded-lg overflow-hidden border border-[var(--border-color)] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjBmMGYwIi8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmMGYwZjAiLz4KPC9zdmc+')]">
                <img src={item.image} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex gap-1">
                  <select value={item.type} onChange={e => { const arr = [...analyzedItems]; arr[idx].type = e.target.value; setAnalyzedItems(arr); }} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold p-1 rounded outline-none">
                    {Object.entries(ALL_TYPES_FLAT).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                  <select value={item.targetGender} onChange={e => { const arr = [...analyzedItems]; arr[idx].targetGender = e.target.value; setAnalyzedItems(arr); }} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-[10px] font-bold p-1 rounded outline-none">
                    <option value="unisex">للجنسين</option><option value="male">رجالي</option><option value="female">نسائي</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={item.color} onChange={e => { const arr = [...analyzedItems]; arr[idx].color = e.target.value; setAnalyzedItems(arr); }} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"/>
                  <select value={item.season} onChange={e => { const arr = [...analyzedItems]; arr[idx].season = e.target.value; setAnalyzedItems(arr); }} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-1 rounded outline-none">
                    <option value="all">كل المواسم</option><option value="summer">صيف</option><option value="winter">شتاء</option>
                  </select>
                </div>
              </div>
              <button onClick={() => removeAiItem(idx)} className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
        <button onClick={handleSaveAIItems} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl flex justify-center items-center gap-2 mt-4 transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4"/> حفظ الكل بالخزانة</>}
        </button>
      </div>
    );
  }

  // mode === 'manual'
  return (
    <div className="max-w-3xl mx-auto pt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-[var(--text-main)]">إدخال يدوي</h2>
        <button onClick={() => setMode('choose')} className="p-1.5 bg-[var(--bg-card)] rounded-full text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)]"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 max-w-[200px] mx-auto bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center justify-center aspect-[3/4] shadow-sm">
          <LiveAvatar items={{ [category]: { type, color } }} />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">1. القسم</label>
            <div className="flex gap-2">
              {[ {id: 'top', label: 'علوي'}, {id: 'bottom', label: 'سفلي'}, {id: 'full', label: 'كامل'}, {id: 'shoes', label: 'حذاء'}, {id: 'accessories', label: 'إكسسوار'} ].map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-colors ${category === c.id ? 'bg-[var(--text-main)] text-[var(--bg-base)] border-[var(--text-main)]' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--hover-bg)]'}`}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">2. النوع</label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES[category].map(t => (
                <button key={t.val} onClick={() => setType(t.val)} className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${type === t.val ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--hover-bg)]'}`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">الفئة</label>
              <select value={targetGender} onChange={e => setTargetGender(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2.5 rounded-lg outline-none focus:border-indigo-500">
                <option value="unisex">للجنسين</option><option value="male">رجالي</option><option value="female">نسائي</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">الموسم</label>
              <select value={season} onChange={e => setSeason(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2.5 rounded-lg outline-none focus:border-indigo-500">
                <option value="all">كل المواسم</option><option value="summer">صيفي</option><option value="winter">شتوي</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">3. اللون</label>
            <div className="flex flex-wrap gap-2 items-center">
              {QUICK_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-indigo-600 scale-110' : 'border-[var(--border-color)] hover:scale-105'}`} style={{backgroundColor: c}}></button>
              ))}
              <div className="relative w-8 h-8 rounded-full border border-dashed border-[var(--text-muted)] overflow-hidden flex items-center justify-center bg-[var(--bg-base)]">
                <Palette className="w-4 h-4 text-[var(--text-muted)] absolute pointer-events-none" />
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
          </div>
          <button onClick={handleManualSave} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl flex justify-center items-center gap-2 mt-4 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4"/> إضافة للخزانة</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const FavoritesView = ({ favorites, clothes, user }) => {
  const [captionLoading, setCaptionLoading] = useState(null);
  const [generatedCaption, setGeneratedCaption] = useState(null);
  const showToast = useContext(ToastContext);
  const confirm = useContext(ConfirmContext);

  const handleDelete = async (id) => {
    confirm('هل أنت متأكد من حذف هذا التنسيق؟', async () => {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'favorites', id));
      showToast('تم الحذف', 'success');
    });
  };

  const handleGenerateCaption = async (fav) => {
    setCaptionLoading(fav.id);
    const top = clothes.find(c => c.id === fav.outfit.topId);
    const bottom = clothes.find(c => c.id === fav.outfit.bottomId);
    const shoes = clothes.find(c => c.id === fav.outfit.shoesId);
    const acc = clothes.find(c => c.id === fav.outfit.accessoryId);
    const itemsDesc = [top, bottom, shoes, acc]
      .filter(Boolean)
      .map(i => `${translateType(i.type)} (لون ${i.color})`)
      .join(' و ');
    const result = await generateCaptionWithAI(itemsDesc);
    if (result && result.caption) {
      setGeneratedCaption(result.caption);
    }
    setCaptionLoading(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-[var(--text-main)]">المفضلات</h2>
      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm">
          <Bookmark className="w-12 h-12 text-[var(--text-muted)] opacity-50 mx-auto mb-3" />
          <p className="text-[var(--text-muted)] font-bold text-sm">لا توجد تنسيقات محفوظة</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {favorites.map(fav => (
            <div key={fav.id} className="relative group flex flex-col">
              <div className="relative">
                <OutfitCard outfit={fav.outfit} clothes={clothes} />
                <button onClick={() => handleDelete(fav.id)} className="absolute top-2 left-2 p-1.5 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                  <Trash2 className="w-3 h-3"/>
                </button>
              </div>
              <button onClick={() => handleGenerateCaption(fav)} disabled={captionLoading === fav.id}
                className="mt-2 w-full text-xs font-bold bg-[var(--bg-card)] text-indigo-500 py-2 rounded-lg hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-1.5 border border-[var(--border-color)] shadow-sm">
                {captionLoading === fav.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                توليد كابشن للصورة ✨
              </button>
            </div>
          ))}
        </div>
      )}

      {generatedCaption && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in">
            <button onClick={() => setGeneratedCaption(null)} className="absolute top-4 left-4 p-1 rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-base)]"><X className="w-4 h-4"/></button>
            <h3 className="text-lg font-black text-[var(--text-main)] mb-4 text-center flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500"/> الكابشن المقترح
            </h3>
            <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] text-sm font-bold leading-relaxed whitespace-pre-wrap text-[var(--text-main)]">
              {generatedCaption}
            </div>
            <button onClick={() => { copyToClipboard(generatedCaption, showToast); setGeneratedCaption(null); }}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Copy className="w-4 h-4"/> نسخ النص
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileModal = ({ user, profile, setProfile, onClose, clothes, favorites }) => {
  const [name, setName] = useState(profile.name);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const showToast = useContext(ToastContext);

  const handleSave = async () => {
    setLoading(true);
    setProfile(p => ({...p, name}));
    if(!user.isAnonymous) {
      await updateProfile(user, { displayName: name });
    }
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), { name }, { merge: true });
    setLoading(false);
    showToast('تم حفظ الملف الشخصي', 'success');
    onClose();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    const base64 = await processImage(file, 200, false);
    setProfile(p => ({...p, photo: base64}));
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings'), { photo: base64 }, { merge: true });
    showToast('تم تحديث الصورة', 'success');
  };

  const handleExport = () => {
    const data = { clothes, favorites };
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `dolaby_${name || 'User'}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if(data.clothes) {
          for(const c of data.clothes) {
            await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'clothes')), c);
          }
        }
        if(data.favorites) {
          for(const f of data.favorites) {
            await setDoc(doc(collection(db, 'artifacts', appId, 'users', user.uid, 'favorites')), f);
          }
        }
        setMsg("تم استيراد البيانات بنجاح!");
        setTimeout(() => setMsg(''), 3000);
        showToast('تم الاستيراد', 'success');
      } catch(err) {
        setMsg("ملف غير صالح!");
        setTimeout(() => setMsg(''), 3000);
        showToast('فشل الاستيراد', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-sm p-5 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-4 h-4"/></button>
        <h3 className="text-lg font-black text-[var(--text-main)] mb-4 text-center">الملف الشخصي</h3>
        {msg && <div className="text-center text-xs font-bold text-green-500 bg-green-500/10 py-2 rounded-lg mb-4">{msg}</div>}
        <div className="flex flex-col items-center mb-6">
          <label className="relative cursor-pointer group">
            {profile.photo ? <img src={profile.photo} className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border-color)] shadow-sm" /> : <div className="w-20 h-20 rounded-full bg-[var(--bg-base)] flex items-center justify-center border-2 border-[var(--border-color)]"><UserCircle className="w-10 h-10 text-[var(--text-muted)]" /></div>}
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ImageIcon className="w-5 h-5 text-white"/></div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          <p className="text-xs text-[var(--text-muted)] mt-2">{user.email || 'حساب ضيف'}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1">الاسم</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] px-3 py-2 rounded-lg text-sm text-[var(--text-main)] outline-none focus:border-indigo-500" />
          </div>
          <div className="flex gap-2 pt-2 border-t border-[var(--border-color)]">
            <button onClick={handleExport} className="flex-1 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1 hover:bg-[var(--hover-bg)]">
              <DownloadCloud className="w-4 h-4"/> تصدير
            </button>
            <label className="flex-1 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-1 cursor-pointer hover:bg-[var(--hover-bg)]">
              <UploadCloud className="w-4 h-4"/> استيراد
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
          <button onClick={handleSave} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-lg transition-colors">
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button onClick={() => signOut(auth)} className="w-full text-red-500 font-bold text-sm py-2 flex justify-center gap-1 items-center bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
            <LogOut className="w-4 h-4"/> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// المكون الرئيسي App
// ==========================================
const App = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ gender: 'male', name: '', photo: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clothes, setClothes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });

  useEffect(() => {
    const savedTheme = localStorage.getItem('anaqa_theme');
    if (savedTheme === 'dark') setIsDark(true);
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setIsAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfile(prev => ({ ...prev, name: user.displayName || 'مستخدم', photo: user.photoURL || '' }));
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings')).then(d => { if(d.exists()) setProfile(p => ({ ...p, ...d.data() })); });
    const unsubC = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'clothes'), (snap) => setClothes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt - a.createdAt)));
    const unsubF = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'favorites'), (snap) => setFavorites(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => { unsubC(); unsubF(); };
  }, [user]);

  useEffect(() => {
    if (isDark) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('anaqa_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const showToast = (message, type = 'info') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const confirm = (message, onConfirm) => { setConfirmState({ open: true, message, onConfirm }); };

  const themeVariables = isDark ? `
    --bg-base: #0B0F19; --bg-card: #111827; --text-main: #f9fafb; --text-muted: #9ca3af;
    --border-color: #1f2937; --hover-bg: #1f2937; --skin-color: #475569;
  ` : `
    --bg-base: #fafafa; --bg-card: #ffffff; --text-main: #111827; --text-muted: #6b7280;
    --border-color: #e5e7eb; --hover-bg: #f9fafb; --skin-color: #cbd5e1;
  `;

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <ToastContext.Provider value={showToast}>
      <ConfirmContext.Provider value={confirm}>
        <React.Fragment>
          <style>{`:root { ${themeVariables} }`}</style>
          <div className="min-h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-main)] transition-colors">
            {!user ? <AuthScreen /> : (
              <div className="pb-20 md:pb-0 md:pr-20 lg:pr-56 h-full">
                <nav className="fixed bottom-0 w-full md:w-20 lg:w-56 md:right-0 md:top-0 md:h-screen bg-[var(--bg-card)] md:border-l border-t border-[var(--border-color)] z-40 px-3 py-2 md:py-6 flex md:flex-col justify-between md:justify-start items-center lg:items-start shadow-sm">
                  <div className="hidden md:flex items-center justify-center lg:justify-start gap-2 mb-8 w-full lg:px-4 text-indigo-600">
                    <DolabyLogo className="w-7 h-7" />
                    <h1 className="text-xl font-black hidden lg:block text-[var(--text-main)]">dolaby</h1>
                  </div>
                  <div className="flex md:flex-col w-full justify-between md:justify-start gap-1 lg:gap-2 flex-1">
                    <NavButton icon={<Home />} label="المساعد" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    <NavButton icon={<Shirt />} label="الخزانة" active={activeTab === 'closet'} onClick={() => setActiveTab('closet')} />
                    <NavButton icon={<PlusCircle />} label="إضافة" active={activeTab === 'add'} onClick={() => setActiveTab('add')} />
                    <NavButton icon={<Bookmark />} label="المفضلات" active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
                  </div>
                  <div className="hidden md:flex flex-col w-full gap-2 mt-auto pt-4 border-t border-[var(--border-color)] lg:px-2">
                    <button onClick={() => setIsDark(!isDark)} className="flex items-center justify-center lg:justify-between p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors w-full border border-[var(--border-color)]">
                      <span className="flex items-center gap-2">{isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}<span className="hidden lg:block text-xs font-bold">{isDark ? 'داكن' : 'فاتح'}</span></span>
                      <div className={`hidden lg:flex w-8 h-4 rounded-full items-center p-0.5 transition-colors ${isDark ? 'bg-indigo-600' : 'bg-[var(--border-color)]'}`}><div className={`w-3 h-3 rounded-full bg-white transition-transform ${isDark ? 'translate-x-0' : '-translate-x-3.5'}`}></div></div>
                    </button>
                    <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--hover-bg)] transition-colors w-full justify-center lg:justify-start border border-transparent">
                      {profile.photo ? <img src={profile.photo} className="w-6 h-6 rounded-full object-cover" /> : <UserCircle className="w-5 h-5" />}
                      <span className="text-sm font-bold hidden lg:block truncate">{profile.name}</span>
                    </button>
                  </div>
                </nav>
                <div className="md:hidden flex justify-between items-center p-4 bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-30">
                  <div className="flex items-center gap-2 text-indigo-600"><DolabyLogo className="w-6 h-6" /><h1 className="text-lg font-black text-[var(--text-main)]">dolaby</h1></div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsDark(!isDark)}>{isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}</button>
                    <button onClick={() => setShowProfile(true)}>{profile.photo ? <img src={profile.photo} className="w-7 h-7 rounded-full object-cover" /> : <UserCircle className="w-6 h-6 text-[var(--text-muted)]" />}</button>
                  </div>
                </div>
                <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
                  <div className="animate-in">
                    {activeTab === 'dashboard' && <DashboardView clothes={clothes} profile={profile} setProfile={setProfile} user={user} favorites={favorites} />}
                    {activeTab === 'closet' && <ClosetView clothes={clothes} profile={profile} user={user} />}
                    {activeTab === 'add' && <AddClothingView user={user} onAdded={() => setActiveTab('closet')} />}
                    {activeTab === 'favorites' && <FavoritesView favorites={favorites} clothes={clothes} user={user} />}
                  </div>
                </main>
                {showProfile && <ProfileModal user={user} profile={profile} setProfile={setProfile} onClose={() => setShowProfile(false)} clothes={clothes} favorites={favorites} />}
              </div>
            )}
            {toast && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 toast-slide">
                {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {toast.message}
              </div>
            )}
            {confirmState.open && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-sm w-full shadow-xl border border-[var(--border-color)]">
                  <p className="text-[var(--text-main)] font-bold mb-6 text-center">{confirmState.message}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmState({ open: false, message: '', onConfirm: null })} className="flex-1 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] font-bold">إلغاء</button>
                    <button onClick={() => { confirmState.onConfirm?.(); setConfirmState({ open: false, message: '', onConfirm: null }); }} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold">تأكيد</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </React.Fragment>
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
};

// ==========================================
// عرض التطبيق
// ==========================================
const root = createRoot(document.getElementById('root'));
root.render(<App />);