/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import Navbar from './Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Languages, Shirt, Crown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, isRtl, lang, setLang } = useLanguage();
  const { user, profile, logout } = useAuth();
  const location = useLocation();

  const getTierIconColor = (tier?: string) => {
    switch (tier) {
      case 'unlimited': return 'text-accent-fuchsia drop-shadow-[0_0_8px_rgba(255,0,255,0.5)]';
      case 'essential': return 'text-accent-cerulean drop-shadow-[0_0_8px_rgba(0,194,255,0.5)]';
      default: return 'text-slate-400';
    }
  };

  const getTierBg = (tier?: string) => {
    switch (tier) {
      case 'unlimited': return 'bg-accent-fuchsia/10 border-accent-fuchsia/30 hover:bg-accent-fuchsia/20';
      case 'essential': return 'bg-accent-cerulean/10 border-accent-cerulean/30 hover:bg-accent-cerulean/20';
      default: return 'bg-white/5 border-white/10 hover:bg-white/10';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#050308]">
      {/* Liquid Blobs Background with gentle light */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
          className="absolute w-[80%] h-[80%] bg-accent-indigo/20 blur-[150px] rounded-full"
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -50, 30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ top: '-20%', left: '-20%' }}
        />
        <motion.div
          className="absolute w-[80%] h-[80%] bg-accent-fuchsia/15 blur-[150px] rounded-full"
          animate={{
            x: [0, -40, 60, 0],
            y: [0, 80, -40, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          style={{ bottom: '-20%', right: '-20%' }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full mx-auto max-w-3xl h-[60%] bg-white/5 blur-[180px] rounded-full pointer-events-none" />
      </div>

      <header className="relative z-20 px-4 sm:px-8 py-6 md:py-8 flex justify-between items-center w-full max-w-[2000px] mx-auto">
        <Link 
          to="/"
          className="text-2xl font-bold tracking-tighter flex items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-indigo to-accent-fuchsia flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-transform group-hover:rotate-6">
            <Shirt size={20} className="text-white" />
          </div>
          <span className="font-serif italic tracking-tight">{t('app_name')}</span>
        </Link>
        
        <div className="flex gap-2 sm:gap-4 items-center">
          {user && (
            <Link 
              to="/subscription"
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${getTierBg(profile?.subscriptionTier)}`}
              title={isRtl ? 'الاشتراك' : 'Subscription'}
            >
              <Crown size={20} className={getTierIconColor(profile?.subscriptionTier)} />
            </Link>
          )}

          <button 
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Languages size={20} />
          </button>
          
          {user && (
            <button 
              onClick={logout}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-colors text-red-500"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 px-3 sm:px-6 md:px-8 pb-32 w-full max-w-[2000px] mx-auto flex flex-col">
        <motion.div
           key={location.pathname}
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.35, ease: "easeOut" }}
           className="w-full flex-1 flex flex-col"
        >
           {children}
        </motion.div>
      </main>

      {user && <Navbar />}
    </div>
  );
}
