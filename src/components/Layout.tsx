/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import Navbar from './Navbar';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Languages, Shirt } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, isRtl, lang, setLang } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-[#050308]">
      {/* Liquid Blobs Background with gentle light */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
  className="absolute w-[80%] h-[80%] bg-accent-indigo/20 blur-[100px] rounded-full"
          animate={window.innerWidth > 768 ? {
    x: [0, 50, -30, 0],
    y: [0, -50, 30, 0],
  } : {}}
  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
/>
        <motion.div
          className="absolute w-[80%] h-[80%] bg-accent-fuchsia/15 blur-[150px] rounded-full"
          animate={window.innerWidth > 768 ? {
    x: [0, 50, -30, 0],
    y: [0, -50, 30, 0],
  } : {}}
  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
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
