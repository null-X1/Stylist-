import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { isRtl } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none"
        >
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto max-w-sm w-full relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 blur-xl"></div>
            <div className="relative z-10 w-12 h-12 rounded-full bg-black/20 flex items-center justify-center shrink-0">
              <WifiOff size={24} />
            </div>
            <div className="relative z-10 flex-1">
              <h3 className="font-bold text-lg leading-tight">
                {isRtl ? 'لا يوجد اتصال بالإنترنت' : 'You are offline'}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {isRtl 
                  ? 'يرجى التحقق من اتصالك بالشبكة. التطبيق بانتظار عودة الإتصال...' 
                  : 'Please check your network connection. Waiting to reconnect...'}
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              <RefreshCw size={20} className="animate-spin opacity-50" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
