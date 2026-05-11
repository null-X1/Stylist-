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

export default function AnalysisDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    workwear: 0,
    casual: 0,
    formal: 0,
    sport: 0
  });

  const [score, setScore] = useState(0);

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
        setStats({
          workwear: Math.round((work / total) * 100),
          casual: Math.round((casual / total) * 100),
          formal: Math.round((formal / total) * 100),
          sport: Math.round((sport / total) * 100)
        });

        // Basic score calculation
        let calculatedScore = 30; // base score
        if (data.length > 5) calculatedScore += 20;
        if (work > 0 && casual > 0 && formal > 0) calculatedScore += 30; // diversity
        if (data.length > 20) calculatedScore += 20;
        setScore(Math.min(calculatedScore, 100));

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin w-8 h-8 opacity-50" />
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
            <h3 className="text-xl font-bold">{t('missing_essentials')}</h3>
          </div>
          <ul className="space-y-3">
            {stats.formal < 15 ? (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <ShoppingCart size={16} className="opacity-40" />
                <span>{t('formal_attire')}</span>
              </li>
            ) : null}
            {stats.casual < 20 ? (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <ShoppingCart size={16} className="opacity-40" />
                <span>{t('everyday_casual')}</span>
              </li>
            ) : null}
            {items.length < 5 ? (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                <ShoppingCart size={16} className="opacity-40" />
                <span>{t('more_variety')}</span>
              </li>
            ) : null}
            {items.length >= 5 && stats.formal > 15 && stats.casual > 20 && (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50">
                <ShoppingCart size={16} className="opacity-40" />
                <span>{t('balanced_wardrobe')}</span>
              </li>
            )}
          </ul>
        </GlassCard>

        {/* Smart Recommendations */}
        <GlassCard className="space-y-6 border-white/20 bg-white/10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <h3 className="text-xl font-bold">{t('styling_tips')}</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <p className="font-medium">{t('color_harmony')}</p>
              <p className="text-sm opacity-60">{t('color_harmony_desc')}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <p className="font-medium">{t('mix_match')}</p>
              <p className="text-sm opacity-60">{t('mix_match_desc')}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
