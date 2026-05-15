/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertCircle, 
  BarChart3,
  Dna,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ClothingItem } from '../types';
import { getWardrobeInsights } from '../services/geminiService';

export default function AnalysisDashboard() {
  const { t, lang } = useLanguage();
  const { user, profile } = useAuth();
  
  const cachedWardrobeJSON = sessionStorage.getItem(`wardrobe_data_${user?.uid}`);
  const cachedWardrobe = cachedWardrobeJSON ? JSON.parse(cachedWardrobeJSON) : null;

  const [items, setItems] = useState<ClothingItem[]>(cachedWardrobe?.items || []);
  const [loading, setLoading] = useState(!cachedWardrobe);
  const [insightsLoading, setInsightsLoading] = useState(false);
  
  const [smartInsights, setSmartInsights] = useState<{
    missing_essentials: string[],
    styling_tips: { title: string, description: string }[]
  } | null>(null);

  const [stats, setStats] = useState(cachedWardrobe?.stats || {
    workwear: 0,
    casual: 0,
    formal: 0,
    sport: 0
  });

  const [score, setScore] = useState(cachedWardrobe?.score || 0);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const q = query(collection(db, 'wardrobe'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ClothingItem);
        setItems(data);
        
        let work = 0, casual = 0, formal = 0, sport = 0;
        data.forEach(item => {
          if (item.category === 'work') work++;
          else if (item.category === 'casual') casual++;
          else if (item.category === 'formal') formal++;
          else if (item.category === 'sport') sport++;
        });
        
        const total = data.length || 1;
        const newStats = {
          workwear: Math.round((work / total) * 100),
          casual: Math.round((casual / total) * 100),
          formal: Math.round((formal / total) * 100),
          sport: Math.round((sport / total) * 100)
        };
        setStats(newStats);

        // Basic score calculation
        let calculatedScore = 30; // base score
        if (data.length > 5) calculatedScore += 20;
        if (work > 0 && casual > 0 && formal > 0) calculatedScore += 30; // diversity
        if (data.length > 20) calculatedScore += 20;
        const finalScore = Math.min(calculatedScore, 100);
        setScore(finalScore);

        sessionStorage.setItem(`wardrobe_data_${user.uid}`, JSON.stringify({
          items: data,
          stats: newStats,
          score: finalScore
        }));

        if (data.length > 0) {
          const itemsHash = data.map(i => i.id).sort().join(',');
          const cacheKey = `insights_${user.uid}_${itemsHash}_${lang}`;
          const cached = sessionStorage.getItem(cacheKey);

          if (cached) {
            setSmartInsights(JSON.parse(cached));
          } else {
            setInsightsLoading(true);
            try {
              const isModest = profile?.stylePreferences?.includes('modest') || false;
              const gender = profile?.gender || 'female';
              const insights = await getWardrobeInsights(data, lang, isModest, gender);
              setSmartInsights(insights);
              sessionStorage.setItem(cacheKey, JSON.stringify(insights));
            } catch (e) {
              console.error("Insights error", e);
            } finally {
              setInsightsLoading(false);
            }
          }
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, profile, lang]);

  if (loading) {
    return (
      <div className="w-full space-y-12 pb-20 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4 w-1/3">
            <div className="h-10 bg-white/10 rounded-lg w-full"></div>
            <div className="h-4 bg-white/5 rounded w-2/3"></div>
          </div>
          <div className="w-full md:w-32 h-12 bg-white/10 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="col-span-1 h-80 bg-white/5 rounded-[32px]"></div>
          <div className="col-span-1 lg:col-span-2 h-80 bg-white/5 rounded-[32px]"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-white/5 rounded-[32px]"></div>
          <div className="h-64 bg-white/5 rounded-[32px]"></div>
        </div>
      </div>
    );
  }

  const offset = 628 - (628 * score) / 100;

  return (
    <div className="w-full space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{t('ai_analysis')}</h1>
          <p className="opacity-60">{t('analysis_subtitle')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full md:w-auto px-8 py-3 bg-accent-indigo text-white rounded-full font-bold flex items-center justify-center gap-3 shadow-2xl shadow-accent-indigo/20 transition-all cursor-not-allowed opacity-80"
          title="Auto real-time analysis"
        >
          <Dna size={20} />
          {items.length} {t('items_indexed')}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Style Score Card */}
        <GlassCard className="col-span-1 flex flex-col items-center justify-center p-8 md:p-12 space-y-8 bg-[#0d0d15]/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-accent-indigo/5 blur-[100px] rounded-full -top-20 -left-20" />
          <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/5"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-accent-indigo"
                initial={{ strokeDasharray: "628", strokeDashoffset: "628" }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 2.5, delay: 0.5, ease: "circOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl md:text-7xl font-serif italic text-white">{score}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold opacity-30 mt-2 text-center">{t('style_score')}</span>
            </div>
          </div>
          <div className="text-center space-y-2 relative z-10">
            <p className="text-xl font-serif italic">{score > 70 ? t('excellent_balance') : t('needs_additions')}</p>
            <p className="text-sm text-slate-400">{t('wardrobe_optimized')}</p>
          </div>
        </GlassCard>

        {/* Categories Analysis */}
        <GlassCard className="col-span-1 lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('wardrobe_balance')}</h2>
            <BarChart3 className="opacity-40" />
          </div>
          
          <div className="space-y-6">
            {[
              { label: t('cat_workwear'), value: stats.workwear, color: 'bg-white' },
              { label: t('cat_casual'), value: stats.casual, color: 'bg-white/60' },
              { label: t('cat_formal'), value: stats.formal, color: 'bg-white/30' },
              { label: t('cat_sport'), value: stats.sport, color: 'bg-white/10' },
            ].map((stat, i) => (
              <div key={stat.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="opacity-60">{stat.label}</span>
                  <span className="font-bold">{isNaN(stat.value) ? 0 : stat.value}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${stat.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${isNaN(stat.value) ? 0 : stat.value}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Missing Essentials */}
        <GlassCard className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <AlertCircle className="text-orange-500" size={20} />
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold">{t('missing_essentials')}</h3>
              {insightsLoading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
            </div>
          </div>
          <ul className="space-y-3">
            {smartInsights?.missing_essentials?.length ? (
              smartInsights.missing_essentials.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <ShoppingCart size={16} className="opacity-40" />
                  <span>{item}</span>
                </li>
              ))
            ) : insightsLoading ? (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50">
                <Loader2 size={16} className="opacity-40 animate-spin" />
                <span>{lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}</span>
              </li>
            ) : (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50">
                <ShoppingCart size={16} className="opacity-40" />
                <span>{t('balanced_wardrobe')}</span>
              </li>
            )}
          </ul>
        </GlassCard>

        {/* Smart Recommendations */}
        <GlassCard className="space-y-6 border-white/20 bg-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-indigo/10 blur-[80px] rounded-full" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold">{t('styling_tips')}</h3>
              {insightsLoading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
            </div>
          </div>
          <div className="relative z-10 space-y-4">
            {smartInsights?.styling_tips?.length ? (
              smartInsights.styling_tips.map((tip, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <p className="font-medium text-accent-indigo">{tip.title}</p>
                  <p className="text-sm opacity-80 leading-relaxed">{tip.description}</p>
                </div>
              ))
            ) : insightsLoading ? (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 opacity-50">
                <p className="font-medium flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {lang === 'ar' ? 'جاري التوليد...' : 'Generating...'}</p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <p className="font-medium">{t('color_harmony')}</p>
                  <p className="text-sm opacity-60">{t('color_harmony_desc')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <p className="font-medium">{t('mix_match')}</p>
                  <p className="text-sm opacity-60">{t('mix_match_desc')}</p>
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
