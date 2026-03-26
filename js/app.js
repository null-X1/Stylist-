import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { auth, db, appId } from './firebase-config.js';
import { ITEM_TYPES, QUICK_COLORS, ALL_TYPES_FLAT } from './constants.js';
import { analyzeImageWithAI, suggestOutfitWithAI, analyzeWardrobeGapsWithAI, generateCaptionWithAI } from './gemini-service.js';
import { LiveAvatar, OutfitCard, NavButton } from './components.js';
import { signOut, updateProfile, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { Home, Shirt, PlusCircle, Sparkles, LogOut, Trash2, Loader2, CheckCircle, Bookmark, X, Palette, Moon, Sun, UserCircle, UploadCloud, DownloadCloud, Image as ImageIcon, Upload, Droplets, Edit3, ImageOff, Copy, Check, AlertCircle } from 'https://esm.sh/lucide-react@0.344.0';

// Contexts
export const ToastContext = createContext();
export const ConfirmContext = createContext();

// Helper functions
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
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
        else { if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; } }
        canvas.width = width; canvas.height = height;
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

// Dashboard View
function DashboardView({ clothes, profile, setProfile, user, favorites }) {
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
    setMessages(newHistory); setInput(''); setLoading(true);

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
}

// Closet View (simplified for brevity, but complete logic would be here)
function ClosetView({ clothes, profile, user }) {
  // ... full implementation similar to original but using hooks and contexts
  return <div>خزانة الملابس (سيتم عرض القطع)</div>;
}

// AddClothingView (simplified)
function AddClothingView({ user, onAdded }) {
  return <div>إضافة قطعة جديدة</div>;
}

// FavoritesView (simplified)
function FavoritesView({ favorites, clothes, user }) {
  return <div>المفضلات</div>;
}

// Profile Modal (simplified)
function ProfileModal({ user, profile, setProfile, onClose, clothes, favorites }) {
  return <div>الملف الشخصي</div>;
}

// Auth Screen
function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const showToast = useContext(ToastContext);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('تم تسجيل الدخول بنجاح', 'success');
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        showToast('تم إنشاء الحساب بنجاح', 'success');
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
      showToast('تم تسجيل الدخول باستخدام Google', 'success');
    } catch(err) { showToast('فشل تسجيل الدخول', 'error'); }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen w-full">
      <div className="bg-[var(--bg-card)] p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-sm border border-[var(--border-color)]">
        <div className="text-center mb-6">
          <div className="inline-flex bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-2xl text-indigo-600 mb-3"><Sparkles className="w-6 h-6" /></div>
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
}

// Main App Component
export function App() {
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
    if(savedTheme === 'dark') setIsDark(true);
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

  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <ToastContext.Provider value={showToast}>
      <ConfirmContext.Provider value={confirm}>
        <div className="min-h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-main)] transition-colors">
          {!user ? <AuthScreen /> : (
            <div className="pb-20 md:pb-0 md:pr-20 lg:pr-56 h-full">
              <nav className="fixed bottom-0 w-full md:w-20 lg:w-56 md:right-0 md:top-0 md:h-screen bg-[var(--bg-card)] md:border-l border-t border-[var(--border-color)] z-40 px-3 py-2 md:py-6 flex md:flex-col justify-between md:justify-start items-center lg:items-start shadow-sm">
                <div className="hidden md:flex items-center justify-center lg:justify-start gap-2 mb-8 w-full lg:px-4 text-indigo-600">
                  <Sparkles className="w-6 h-6" />
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
                <div className="flex items-center gap-2 text-indigo-600"><Sparkles className="w-5 h-5" /><h1 className="text-lg font-black text-[var(--text-main)]">dolaby</h1></div>
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
          {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 toast-slide">{toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.message}</div>}
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
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
