/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { Sparkles, Shield, Cloud, Layout as LayoutIcon, Zap } from 'lucide-react';

import { Link } from 'react-router-dom';

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 md:px-8 space-y-32">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-10 pt-20">
        <motion.h1 
          className="text-5xl md:text-7xl lg:text-9xl font-light tracking-tight leading-none text-white max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {t('hero_title')} <span className="font-serif italic">{t('hero_title_italic')}</span>
        </motion.h1>
        
        <motion.p 
          className="max-w-2xl text-lg md:text-2xl text-slate-400 font-light leading-relaxed px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {t('hero_subtitle')}
        </motion.p>
        
        <motion.div
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link to="/login" className="w-full sm:w-auto px-10 py-4 sm:py-5 bg-accent-indigo text-white rounded-full font-semibold text-lg hover:bg-accent-indigo/90 transition-colors shadow-2xl shadow-accent-indigo/20 text-center">
            {t('get_started')}
          </Link>
        </motion.div>
      </section>

      {/* Floating Cards Showcase */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10 px-4 md:px-0">
        {[
          { label: t('modest_chic'), title: t('sand_collection'), img: '1550000000001' },
          { label: t('formal_evening'), title: t('midnight_silk'), img: '1550000000002' },
          { label: t('campus_style'), title: t('minimalist_layering'), img: '1550000000003' },
        ].map((item, i) => (
          <GlassCard key={i} className="h-[400px] md:h-[550px] p-0 flex flex-col justify-end overflow-hidden group border-white/5">
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
            <motion.div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-110"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-${item.img}?auto=format&fit=crop&q=80&w=600')` }}
            />
            <div className="relative z-20 p-8 md:p-10 space-y-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-white/60 border border-white/10">
                {item.label}
              </span>
              <h3 className="text-3xl md:text-4xl font-serif italic text-white">{item.title}</h3>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-20 px-4 md:px-0">
        <div className="space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
            <Sparkles className="text-white" size={24} />
          </div>
          <h3 className="text-2xl font-bold">Smart AI Stylist</h3>
          <p className="opacity-60 leading-relaxed">
            Our AI understands your style and the occasion to provide the perfect outfit.
          </p>
        </div>
        
        <div className="space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
            <Cloud className="text-white" size={24} />
          </div>
          <h3 className="text-2xl font-bold">Dolaby Cloud</h3>
          <p className="opacity-60 leading-relaxed">
            Upload and manage your entire closet in one place. Never lose track of what you own.
          </p>
        </div>
        
        <div className="space-y-4 text-center md:text-left flex flex-col items-center md:items-start">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
            <Zap className="text-white" size={24} />
          </div>
          <h3 className="text-2xl font-bold">Rapid Detection</h3>
          <p className="opacity-60 leading-relaxed">
            Upload a photo and let our AI automatically detect clothing types, colors, and materials.
          </p>
        </div>
      </section>
    </div>
  );
}
