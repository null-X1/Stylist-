import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { Send, Sparkles, User, Mic, Plus, Save, Check } from 'lucide-react';
import { Message, ClothingItem, Outfit } from '../types';
import { getStylingAdvice } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import AvatarPreview from '../components/AvatarPreview';

export default function ChatPage() {
  const { t, isRtl } = useLanguage();
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [genderChat, setGenderChat] = useState<'male' | 'female'>(profile?.gender || 'female');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [savedOutfits, setSavedOutfits] = useState<Set<string>>(new Set());

  const handleSaveOutfit = async (msgId: string, selectedItemsData: any[]) => {
    if (!user) return;
    
    // We need the actual clothing items to save them directly.
    // Let's fetch them from the database based on the selected IDs.
    try {
      setSavedOutfits(prev => new Set(prev).add(msgId)); // Optimistic UI
      
      const itemIds = selectedItemsData.map(i => i.id);
      let matchedItems: ClothingItem[] = [];
      const q = query(collection(db, 'wardrobe'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      snapshot.forEach(d => {
        if (itemIds.includes(d.id)) {
          matchedItems.push({ id: d.id, ...d.data() } as ClothingItem);
        }
      });
      
      const outfitId = Date.now().toString();
      const newOutfit: Outfit = {
        id: outfitId,
        userId: user.uid,
        name: isRtl ? 'إطلالة الذكاء الاصطناعي' : 'AI Suggested Look',
        description: '',
        items: matchedItems,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'outfits', outfitId), newOutfit);
    } catch (e) {
      console.error(e);
      // Revert optimistic if error
      setSavedOutfits(prev => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !user) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      chatId: '1',
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const q = query(collection(db, 'wardrobe'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const wardrobeItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ClothingItem);

      if (wardrobeItems.length === 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          chatId: '1',
          sender: 'ai',
          text: t('no_clothes_in_wardrobe') || 'لا يوجد ملابس في خزانتك حتى الآن، يرجى إضافة بعض القطع حتى أتمكن من تنسيق أطقم لك!',
          timestamp: Date.now()
        }]);
        return;
      }

      const advice = await getStylingAdvice({
        messages: [...messages, userMsg],
        wardrobe: wardrobeItems.map(item => ({ id: item.id, type: item.type, color: item.color, category: item.category, material: item.material })),
        isModest: profile?.isModestPreferred || true,
        gender: genderChat
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        chatId: '1',
        sender: 'ai',
        text: advice.text || (isRtl ? 'لقد اخترت لك هذا الطقم!' : 'I picked out an outfit for you!'),
        selectedItems: advice.selectedItems,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
       console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  const emptySuggestions = [
    t('prompt_work') || 'What should I wear to work?',
    t('prompt_casual') || 'Casual outfit ideas',
    t('prompt_wedding') || 'Wedding guest outfit'
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] flex flex-col relative rounded-[2rem] md:rounded-[3rem] sm:p-6 overflow-hidden isolate">
      {/* Background Layer */}
      <div className="absolute inset-0 z-[-1]">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent-fuchsia/20 blur-[120px] rounded-full pointer-events-none opacity-20"></div>
      </div>

      {/* Top Header Controls */}
      <div className="flex justify-end z-10 relative shrink-0">
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/10 backdrop-blur-md">
          <button onClick={() => setGenderChat('male')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${genderChat === 'male' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>{t('gender_male')}</button>
          <button onClick={() => setGenderChat('female')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${genderChat === 'female' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>{t('gender_female')}</button>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 mt-12 relative z-0">
          <div className="w-16 h-16 rounded-[1.5rem] bg-white text-black flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-4 shrink-0 transition-transform hover:scale-105">
            <Sparkles size={32} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white/90">{isRtl ? 'أهلاً بك!' : 'Good to See You!'}</h1>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-white">{isRtl ? 'كيف يمكنني' : 'How Can I'} <span className="text-white/60">{isRtl ? 'مساعدتك اليوم؟' : 'be an Assistance?'}</span></h2>
          </div>
          <p className="opacity-40 text-sm mt-4">{isRtl ? 'أنا متواجد على مدار ٢٤ ساعة، اسألني عن أي شيء.' : "I'm available 24/7 for you, ask me anything."}</p>

          <div className="w-full max-w-2xl mt-12 space-y-6">
            {/* Input */}
            <div className="p-2 md:p-3 rounded-2xl md:rounded-[2rem] bg-white/[0.03] border border-white/10 shadow-2xl flex items-center gap-3 backdrop-blur-xl hover:border-white/20 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isRtl ? "اكتب رسالة..." : "Ask anything..."}
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 text-base md:text-lg text-white font-light placeholder:text-white/20 outline-none"
              />
              <button onClick={() => handleSend()} className="w-10 h-10 rounded-full flex items-center justify-center text-black bg-white hover:scale-105 transition-all shrink-0">
                <Send size={18} className={isRtl ? "mr-1" : "ml-1"} />
              </button>
            </div>
            
            {/* Suggestions */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {emptySuggestions.map((s) => (
                  <button key={s} onClick={() => handleSend(s)} className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 text-white/60 hover:text-white">
                    <User size={14} className="opacity-50" />
                    {s}
                  </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-8 pb-32 pt-4 scroll-smooth"
            style={{ scrollbarWidth: 'none' }}
          >
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[90%] md:max-w-[85%] space-y-4`}>
                    <div className={`flex items-start gap-4 flex-col sm:flex-row ${msg.sender === 'user' ? 'sm:flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'ai' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                        {msg.sender === 'ai' ? <Sparkles size={16} className="md:w-5 md:h-5" /> : <User size={16} className="md:w-5 md:h-5" />}
                      </div>
                      
                      <div className={`p-4 md:p-6 rounded-[2rem] backdrop-blur-3xl border shadow-2xl space-y-4 flex flex-col ${msg.sender === 'ai' ? (isRtl ? 'bg-white/[0.03] border-white/10 rounded-tr-sm text-slate-200' : 'bg-white/[0.03] border-white/10 rounded-tl-sm text-slate-200') : (isRtl ? 'bg-white/10 border-white/10 rounded-tl-sm text-white' : 'bg-white/10 border-white/10 rounded-tr-sm text-white')}`}>
                        <p className="text-base md:text-[1.1rem] leading-relaxed font-light whitespace-pre-wrap">{msg.text}</p>
                        
                        {msg.selectedItems && msg.selectedItems.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-white/10 space-y-6">
                            <div className={`grid gap-6 ${msg.selectedItems.length > 1 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                               {msg.selectedItems.map(item => (
                                 <div key={item.id} className="bg-black/20 rounded-2xl p-4 flex flex-col items-center gap-4">
                                   <div className="w-full h-48 bg-white/5 rounded-xl overflow-hidden relative">
                                     <AvatarPreview 
                                       gender={genderChat} 
                                       clothingType={item.type} 
                                       color={item.color} 
                                       isModest={profile?.isModestPreferred || true} 
                                     />
                                   </div>
                                   <div className="text-center w-full">
                                     <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                     <div className="flex items-center justify-center gap-2 mt-1">
                                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: item.color }} />
                                        <span className="text-xs opacity-60 uppercase tracking-wider">{item.type}</span>
                                     </div>
                                   </div>
                                 </div>
                               ))}
                            </div>
                            
                            <div className="flex justify-end">
                              <button 
                                onClick={() => handleSaveOutfit(msg.id, msg.selectedItems!)}
                                disabled={savedOutfits.has(msg.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${savedOutfits.has(msg.id) ? 'bg-white/20 text-white cursor-default' : 'bg-white text-black hover:scale-105 active:scale-95 shadow-md'}`}
                              >
                                {savedOutfits.has(msg.id) ? (
                                  <>
                                    <Check size={16} />
                                    <span>{isRtl ? 'تم الحفظ' : 'Saved'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Save size={16} />
                                    <span>{isRtl ? 'حفظ الإطلالة' : 'Save Outfit'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start gap-4"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 animate-pulse">
                  <Sparkles size={16} className="md:w-5 md:h-5" />
                </div>
                <div className={`p-4 px-6 rounded-[2rem] ${isRtl ? 'rounded-tr-sm' : 'rounded-tl-sm'} bg-white/[0.03] border border-white/10 flex gap-2 items-center`}>
                  <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </motion.div>
            )}
          </div>

          <div className="fixed bottom-20 md:bottom-28 left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl flex justify-center z-40 pointer-events-none">
            <div className="w-full pointer-events-auto">
              <div className="p-1.5 md:p-3 rounded-[2rem] flex items-center gap-2 md:gap-3 backdrop-blur-3xl bg-black/60 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('type_message')}
                  className="flex-1 bg-transparent border-none focus:ring-0 px-4 text-base md:text-lg text-white font-light placeholder:text-white/50 outline-none"
                />
                <button 
                  onClick={() => handleSend()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black bg-white hover:scale-105 transition-all shrink-0 shadow-lg"
                >
                  <Send size={18} className={isRtl ? "mr-1" : "ml-1"} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
