/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { 
  Shirt, 
  MessageSquare, 
  History, 
  PieChart, 
  Plus,
  User
} from 'lucide-react';

export default function Navbar() {
  const { t } = useLanguage();
  const location = useLocation();

  const navItems = [
    { icon: MessageSquare, label: t('chat'), path: '/chat' },
    { icon: Shirt, label: t('wardrobe'), path: '/wardrobe' },
    { icon: PieChart, label: t('analysis'), path: '/analysis' },
    { icon: User, label: t('profile'), path: '/profile' }
  ];

  return (
    <div className="fixed bottom-3 md:bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none px-3">
      <motion.nav 
        className="px-2 sm:px-6 py-3 sm:py-4 flex items-center justify-between w-full max-w-[800px] gap-2 pointer-events-auto rounded-3xl md:rounded-full bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
      >
        <div className="flex items-center gap-3 sm:gap-8 flex-1 justify-around md:justify-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-all ${location.pathname === item.path ? 'text-white opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}
            >
              <item.icon size={20} className="sm:w-6 sm:h-6 w-5 h-5" />
              <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-[0.1em] text-center max-w-16 h-4 overflow-hidden">{item.label}</span>
            </Link>
          ))}
        </div>
        
        <div className="w-[1px] h-8 bg-white/10 mx-1 sm:mx-2 shrink-0" />
        
        <Link
          to="/add"
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${location.pathname === '/add' ? 'bg-white text-black scale-110' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Plus size={20} className="sm:w-6 sm:h-6 w-5 h-5" />
        </Link>
      </motion.nav>
    </div>
  );
}
