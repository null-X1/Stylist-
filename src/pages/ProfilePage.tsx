import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import { User, ShieldCheck, Mail, LogOut, Heart, Award } from 'lucide-react';

export default function ProfilePage() {
  const { t, lang, setLang } = useLanguage();
  const { user, profile, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center gap-8 py-8">
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-accent-indigo to-accent-fuchsia p-1">
          <div className="w-full h-full rounded-full bg-premium-dark flex items-center justify-center overflow-hidden">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white/50" />
            )}
          </div>
        </div>
        
        <div className="text-center md:text-left md:flex-1 space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{profile?.displayName || 'Fashion Explorer'}</h1>
          <p className="opacity-60 flex items-center justify-center md:justify-start gap-2">
            <Mail size={16} />
            {profile?.email || user?.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <ShieldCheck className="text-accent-indigo" />
            {t('settings')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
              <span>Language / اللغة</span>
              <button 
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold hover:bg-white/20 transition-colors"
              >
                {lang === 'en' ? 'العربية' : 'English'}
              </button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <Award className="text-accent-fuchsia" />
            Style Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="block text-3xl font-bold text-accent-fuchsia mb-1">0</span>
              <span className="text-xs opacity-60 uppercase tracking-wider">Items in Wardrobe</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="block text-3xl font-bold text-accent-indigo mb-1">0</span>
              <span className="text-xs opacity-60 uppercase tracking-wider">Outfits Created</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="pt-8">
        <button
          onClick={logout}
          className="w-full md:w-auto px-8 py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-colors mx-auto"
        >
          <LogOut size={20} />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
