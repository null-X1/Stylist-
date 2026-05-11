/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { Upload, X, ShieldCheck, Sparkles, Camera, PenTool, CheckCircle } from 'lucide-react';
import { analyzeClothingImage } from '../services/geminiService';
import AvatarPreview from '../components/AvatarPreview';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ClothingItem } from '../types';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Gray', value: '#808080' },
  { name: 'Red', value: '#FF0000' },
  { name: 'Blue', value: '#0000FF' },
  { name: 'Navy', value: '#000080' },
  { name: 'Green', value: '#008000' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Pink', value: '#FFC0CB' },
  { name: 'Purple', value: '#800080' },
  { name: 'Brown', value: '#A52A2A' },
  { name: 'Beige', value: '#F5F5DC' },
];

const TYPES = [
  'T-Shirt', 'Shirt', 'Blouse', 'Sweater', 'Jacket', 'Coat', 
  'Jeans', 'Pants', 'Shorts', 'Skirt', 'Dress', 'Abaya', 'Hijab'
];

const MATERIALS = [
  'Cotton', 'Linen', 'Wool', 'Silk', 'Denim', 'Leather', 'Polyester', 'Nylon', 'Viscose'
];

export default function AddClothingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'choose' | 'ai' | 'manual'>('choose');
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    type: TYPES[0],
    category: 'casual' as any,
    color: COLORS[0].value,
    material: MATERIALS[0],
    gender: 'female' as 'male' | 'female',
    modest: true,
  });

  const [aiItems, setAiItems] = useState<any[]>([]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Downscale image to fit in Firestore (1MB limit)
        const img = new Image();
        img.src = base64;
        await new Promise(resolve => img.onload = resolve);
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        setImage(compressedBase64);
        if (mode === 'ai') {
           setIsAnalyzing(true);
           setAiItems([]); // reset previous
           try {
             const result = await analyzeClothingImage(compressedBase64);
             if (Array.isArray(result)) {
               setAiItems(result.map(r => ({...r, modest: true})));
             }
           } catch (error) {
             console.error(error);
           } finally {
             setIsAnalyzing(false);
           }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIDetect = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setAiItems([]); // reset previous
    try {
      const result = await analyzeClothingImage(image);
      if (Array.isArray(result)) {
        setAiItems(result.map(r => ({...r, modest: true})));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (mode === 'ai') {
        // Save multiple items
        if(aiItems.length === 0) return;
        const promises = aiItems.map(item => {
          const itemData: Omit<ClothingItem, 'id'> = {
            userId: user.uid,
            imageUrl: image || '',
            type: item.type || TYPES[0],
            category: item.category || 'casual',
            color: item.color || COLORS[0].value,
            material: item.material || MATERIALS[0],
            style: item.style || '',
            gender: item.gender || 'female',
            season: ['summer', 'winter', 'spring', 'autumn'],
            usageFrequency: 0,
            tags: [item.modest ? 'modest' : ''],
            isFavorite: false,
            createdAt: Date.now()
          };
          return addDoc(collection(db, 'wardrobe'), itemData);
        });
        await Promise.all(promises);
      } else {
        // Save manual single item
        const itemData: Omit<ClothingItem, 'id'> = {
          userId: user.uid,
          imageUrl: image || '',
          type: formData.type,
          category: formData.category,
          color: formData.color,
          material: formData.material,
          style: '',
          gender: formData.gender,
          season: ['summer', 'winter', 'spring', 'autumn'],
          usageFrequency: 0,
          tags: [formData.modest ? 'modest' : ''],
          isFavorite: false,
          createdAt: Date.now()
        };
        await addDoc(collection(db, 'wardrobe'), itemData);
      }
      navigate('/wardrobe');
    } catch (error) {
       console.error("Error adding document: ", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tight mb-12 text-center">{t('choose_method')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <GlassCard 
            className="p-10 flex flex-col items-center text-center cursor-pointer hover:bg-white/10 transition-colors group"
            onClick={() => setMode('ai')}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent-indigo to-accent-fuchsia flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform mb-6">
              <Sparkles size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('ai_entry')}</h2>
            <p className="opacity-60">Upload a photo and let AI fill in all the details automatically.</p>
          </GlassCard>

          <GlassCard 
            className="p-10 flex flex-col items-center text-center cursor-pointer hover:bg-white/10 transition-colors group"
            onClick={() => setMode('manual')}
          >
            <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-6">
              <PenTool size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('manual_entry')}</h2>
            <p className="opacity-60">Select colors, materials, and categories manually from presets.</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto py-6 md:py-12 flex flex-col lg:flex-row gap-6 lg:gap-8 pb-32">
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('choose')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
          <h1 className="text-3xl font-bold tracking-tight">{t('add_clothing')}</h1>
        </div>
        
        {mode === 'manual' && (
          <GlassCard className="h-[400px] p-0 overflow-hidden relative">
             <AvatarPreview 
               gender={formData.gender} 
               clothingType={formData.type} 
               color={formData.color} 
               isModest={formData.modest} 
             />
          </GlassCard>
        )}

        {mode === 'ai' && (
          <GlassCard className="aspect-square flex flex-col items-center justify-center relative p-0 overflow-hidden group">
            {image ? (
              <>
                <img src={image} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-xl hover:bg-black/80 transition-colors"
                  title="Remove Image"
                >
                  <X size={20} />
                </button>
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                     <div className="w-10 h-10 border-4 border-accent-indigo border-t-accent-fuchsia rounded-full animate-spin" />
                     <p className="font-bold tracking-widest text-sm uppercase">Analyzing...</p>
                  </div>
                )}
                {!isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 xl:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleAIDetect}
                      className="px-6 py-3 bg-white text-black rounded-2xl font-bold flex items-center gap-2"
                    >
                      <Sparkles size={20} />
                      {t('auto_detect')}
                    </motion.button>
                  </div>
                )}
              </>
            ) : (
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors gap-4">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Camera size={32} />
                </div>
                <div className="text-center px-4">
                  <p className="font-bold text-lg">{t('upload_photo')}</p>
                  <p className="text-sm opacity-40 mt-2">{t('drag_drop')}</p>
                </div>
              </label>
            )}
          </GlassCard>
        )}
      </div>

      <div className="flex-1 w-full space-y-6">
        {mode === 'manual' && (
          <GlassCard className="p-6 md:p-8 space-y-8">
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-widest font-bold opacity-40">{t('select_type')}</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, type })}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${formData.type === type ? 'bg-white text-black' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs uppercase tracking-widest font-bold opacity-40">{t('select_category')}</label>
              <div className="flex flex-wrap gap-2">
                {['casual', 'work', 'formal', 'party'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${formData.category === cat ? 'bg-white text-black' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                  >
                    {t(`cat_${cat}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs uppercase tracking-widest font-bold opacity-40">{t('select_color')}</label>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-3">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    title={c.name}
                    className={`aspect-square rounded-full flex items-center justify-center transition-transform ${formData.color === c.value ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-white' : 'hover:scale-110 border border-white/10'}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs uppercase tracking-widest font-bold opacity-40">{t('select_material')}</label>
              <div className="flex flex-wrap gap-2">
                {MATERIALS.map(mat => (
                  <button
                    key={mat}
                    onClick={() => setFormData({ ...formData, material: mat })}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${formData.material === mat ? 'bg-white text-black' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 rounded-[24px] bg-white/5 border border-white/10 mt-8 gap-4">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl bg-accent-indigo/10 flex items-center justify-center border border-accent-indigo/20 flex-shrink-0">
                  <ShieldCheck className="text-accent-indigo" size={20} />
                </div>
                <div>
                  <p className="font-bold">{t('modest_selection')}</p>
                  <p className="text-xs opacity-40 mt-1">{t('apply_religious')}</p>
                </div>
              </div>
              <button
                onClick={() => setFormData({ ...formData, modest: !formData.modest })}
                className={`w-14 h-8 rounded-full transition-all duration-500 relative flex-shrink-0 ${formData.modest ? 'bg-accent-indigo' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-500 bg-white`} 
                  style={{ left: formData.modest ? 'calc(100% - 28px)' : '4px' }}
                />
              </button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-5 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-2xl shadow-white/10 mt-8"
            >
              {isSaving ? (
                <div className="w-6 h-6 border-2 border-black border-t-white rounded-full animate-spin" />
              ) : (
                <>
                 <CheckCircle size={20} />
                 {t('save_wardrobe')}
                </>
              )}
            </motion.button>
          </GlassCard>
        )}

        {mode === 'ai' && (
          <GlassCard className="p-6 md:p-8 space-y-8">
            <h2 className="text-2xl font-bold tracking-tight">{t('ai_analysis')}</h2>
            {!image ? (
              <p className="opacity-60 text-sm">{t('upload_photo')} {t('auto_detect')}</p>
            ) : (
              <div className="space-y-6">
                {aiItems.length > 0 ? (
                  <div className="space-y-4">
                    <p className="opacity-60 text-sm mb-4">{t('detected_items')}: {aiItems.length}. {t('review_before_saving')}</p>
                    {aiItems.map((item, idx) => (
                      <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold block mb-1">{t('type')}</span>
                            <span className="font-medium">{item.type || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold block mb-1">{t('category')}</span>
                            <span className="font-medium capitalize">{item.category || 'Casual'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold block mb-1">{t('color')}</span>
                              <span className="font-medium">{item.color || '#ffffff'}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: item.color || '#ffffff' }} />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold block mb-1">{t('material')}</span>
                            <span className="font-medium">{item.material || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <span className="text-xs font-bold">{t('modest_selection')}</span>
                          <button
                            onClick={() => {
                              const newItems = [...aiItems];
                              newItems[idx].modest = !newItems[idx].modest;
                              setAiItems(newItems);
                            }}
                            className={`w-10 h-6 rounded-full transition-all duration-500 relative ${item.modest ? 'bg-accent-indigo' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-500 bg-white`} 
                              style={{ left: item.modest ? 'calc(100% - 20px)' : '4px' }}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center opacity-40 py-8">{t('no_items_detected')} {t('upload_to_start')}</p>
                )}

                {aiItems.length > 0 && (

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving || isAnalyzing}
                  className="w-full py-5 bg-white text-black rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-2xl shadow-white/10 mt-8"
                >
                  {isSaving ? (
                    <div className="w-6 h-6 border-2 border-black border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                     <CheckCircle size={20} />
                     {t('save_wardrobe')}
                    </>
                  )}
                </motion.button>
                )}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
