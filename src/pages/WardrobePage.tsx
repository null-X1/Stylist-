/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { Search, Filter, SlidersHorizontal, Plus, Heart, Trash2, Shirt } from 'lucide-react';
import { ClothingItem, Outfit } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import AvatarPreview from '../components/AvatarPreview';

export default function WardrobePage() {
  const { t, isRtl } = useLanguage();
  const { user, profile } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items'|'looks'>('items');

  useEffect(() => {
    if (!user) return;
    
    // Set up real-time listener for wardrobe items
    const q1 = query(collection(db, 'wardrobe'), where('userId', '==', user.uid));
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const fetchedItems: ClothingItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as ClothingItem);
      });
      // Sort by newest
      fetchedItems.sort((a, b) => b.createdAt - a.createdAt);
      setItems(fetchedItems);
      setLoading(false);
    });

    const q2 = query(collection(db, 'outfits'), where('userId', '==', user.uid));
    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const fetchedOutfits: Outfit[] = [];
      snapshot.forEach((doc) => {
        fetchedOutfits.push({ id: doc.id, ...doc.data() } as Outfit);
      });
      fetchedOutfits.sort((a, b) => b.createdAt - a.createdAt);
      setOutfits(fetchedOutfits);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const toggleFavorite = async (id: string, current: boolean) => {
    const itemRef = doc(db, 'wardrobe', id);
    try {
      await updateDoc(itemRef, { isFavorite: !current });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteOutfit = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'outfits', id));
    } catch (e) {
      console.error(e);
    }
  };

  const categories = ['all', 'work', 'casual', 'formal', 'party', 'university'];

  const filteredItems = items.filter(item => 
    (filter === 'all' || item.category === filter) &&
    (item.type.toLowerCase().includes(search.toLowerCase()) || 
     item.color?.toLowerCase().includes(search.toLowerCase()))
  );
  
  const filteredOutfits = outfits.filter(outfit => 
    outfit.name?.toLowerCase().includes(search.toLowerCase()) || 
    outfit.items.some(i => i.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="w-full space-y-10 md:space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('wardrobe')}</h1>
          <div className="flex bg-white/5 p-1 rounded-full border border-white/10 w-fit">
            <button 
              onClick={() => setActiveTab('items')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'items' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
            >
              {isRtl ? 'القطع' : 'Items'}
            </button>
            <button 
              onClick={() => setActiveTab('looks')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'looks' ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white'}`}
            >
              {isRtl ? 'الإطلالات' : 'Saved Looks'}
            </button>
          </div>
        </div>
        
        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={20} />
            <input
              type="text"
              placeholder={t('search_wardrobe')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 liquid-glass-input pl-12 py-3"
            />
          </div>
          <button className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            <SlidersHorizontal size={24} />
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {activeTab === 'items' && categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-2 rounded-full border transition-all text-sm font-medium whitespace-nowrap capitalize ${
              filter === cat ? 'bg-white text-black border-white' : 'border-white/10 bg-white/5 opacity-60 hover:opacity-100'
            }`}
          >
            {t(`cat_${cat}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="w-10 h-10 border-4 border-accent-indigo border-t-accent-fuchsia rounded-full animate-spin" />
        </div>
      ) : activeTab === 'items' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pb-6">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group"
              >
                <GlassCard className="p-0 overflow-hidden h-[360px] sm:h-[400px] flex flex-col relative" glow={false}>
                  <div className="h-[75%] overflow-hidden relative">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.type} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="mt-3 sm:mt-4 font-mono text-xs sm:text-sm opacity-50">{item.color}</span>
                        <span className="mt-1 font-mono text-[10px] sm:text-xs opacity-50">{item.material}</span>
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.preventDefault(); toggleFavorite(item.id, item.isFavorite); }}
                      className={`absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md border border-white/20 shadow-lg ${item.isFavorite ? 'bg-red-500 text-white border-transparent' : 'bg-black/20 text-white hover:bg-white/20 transition-colors'}`}
                    >
                      <Heart size={16} className="sm:w-[18px] sm:h-[18px]" fill={item.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="p-4 sm:p-6 space-y-1 sm:space-y-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-0">
                      <h3 className="font-bold text-base sm:text-lg truncate w-full">{item.type}</h3>
                      <span className="text-[9px] sm:text-xs px-2 py-0.5 sm:px-2 sm:py-1 rounded-md bg-white/10 border border-white/5 opacity-60 uppercase">{item.category}</span>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs opacity-50 font-medium">
                      <span>{item.color}</span>
                      <span>•</span>
                      <span>{item.material}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <Link to="/add" className="block">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-[360px] sm:h-[400px] border-2 border-dashed border-white/10 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center gap-2 sm:gap-4 opacity-40 hover:opacity-100 hover:border-white/30 transition-all hover:bg-white/5 cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Plus size={24} className="sm:w-[32px] sm:h-[32px] tracking-wide" />
              </div>
              <span className="font-medium tracking-wide uppercase text-xs sm:text-sm text-center px-2">{t('add_clothing')}</span>
            </motion.div>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          <AnimatePresence>
            {filteredOutfits.map((outfit) => (
              <motion.div
                key={outfit.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group"
              >
                <GlassCard className="p-6 flex flex-col gap-6 relative" glow={false}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xl">{outfit.name}</h3>
                      <span className="text-sm opacity-50">{new Date(outfit.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={() => deleteOutfit(outfit.id)}
                      className={"p-2 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-red-400 hover:bg-white/10 transition-colors"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {outfit.items.map((item, idx) => (
                      <div key={idx} className="bg-black/20 rounded-2xl p-3 flex flex-col items-center gap-3">
                        <div className="w-full h-32 bg-white/5 rounded-xl overflow-hidden relative">
                          <AvatarPreview 
                            gender={profile?.gender || 'female'} 
                            clothingType={item.type} 
                            color={item.color} 
                            isModest={profile?.isModestPreferred || true} 
                          />
                        </div>
                        <div className="text-center w-full">
                           <div className="flex items-center justify-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: item.color }} />
                             <span className="text-[10px] opacity-60 uppercase tracking-wider truncate">{item.type}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredOutfits.length === 0 && (
             <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-white/40">
                <Shirt size={48} className="opacity-20" />
                <p className="text-lg">{isRtl ? 'لا يوجد إطلالات محفوظة حتى الآن' : 'No saved looks yet'}</p>
                <Link to="/chat" className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors mt-2 text-white/80">
                  {isRtl ? 'اطلب مساعدة منسق الأزياء' : 'Get AI styling suggestions'}
                </Link>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
