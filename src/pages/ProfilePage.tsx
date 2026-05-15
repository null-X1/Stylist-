import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';
import { User, ShieldCheck, Mail, LogOut, Crown, Award, ChevronRight, HelpCircle, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfilePage() {
  const { t, lang, setLang, isRtl } = useLanguage();
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const getTierName = (tier?: string) => {
    switch (tier) {
      case 'unlimited': return isRtl ? 'اللامحدود' : 'Unlimited';
      case 'essential': return isRtl ? 'الأساسي بلس' : 'Essential';
      default: return isRtl ? 'الأساسي' : 'Basic';
    }
  };

  const handleSaveName = async () => {
    if (!user || editedName.trim() === '') return;
    setIsUpdatingName(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editedName.trim()
      });
      // reload the page to refresh context
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingName(false);
      setIsEditingName(false);
    }
  };

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
        
        <div className="text-center md:text-left md:flex-1 space-y-3">
          {isEditingName ? (
            <div className="flex items-center justify-center md:justify-start gap-3">
              <input 
                type="text" 
                value={editedName} 
                onChange={e => setEditedName(e.target.value)} 
                className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:border-accent-indigo"
                autoFocus
              />
              <button 
                onClick={handleSaveName} 
                disabled={isUpdatingName}
                className="px-4 py-2 bg-accent-indigo rounded-lg text-white font-bold text-sm hover:bg-accent-fuchsia transition-colors"
              >
                {isUpdatingName ? '...' : (isRtl ? 'حفظ' : 'Save')}
              </button>
              <button 
                onClick={() => setIsEditingName(false)} 
                className="px-4 py-2 bg-white/10 rounded-lg text-white font-bold text-sm hover:bg-white/20 transition-colors"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center md:justify-start gap-4">
              <h1 className="text-4xl font-bold tracking-tight">{profile?.displayName || 'Fashion Explorer'}</h1>
              <button 
                onClick={() => {
                  setEditedName(profile?.displayName || '');
                  setIsEditingName(true);
                }}
                className="text-white/50 hover:text-white transition-colors text-sm underline"
              >
                {isRtl ? 'تعديل' : 'Edit'}
              </button>
            </div>
          )}
          <p className="opacity-60 flex items-center justify-center md:justify-start gap-2">
            <Mail size={16} />
            {profile?.email || user?.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="col-span-1 md:col-span-2 overflow-hidden relative group cursor-pointer" onClick={() => navigate('/subscription')}>
          <div className="absolute inset-0 bg-gradient-to-r from-accent-cerulean/10 to-accent-fuchsia/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cerulean to-accent-fuchsia flex items-center justify-center">
                <Crown size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{isRtl ? 'باقة الاشتراك' : 'Subscription Plan'}</h3>
                <p className="opacity-80">
                  {isRtl ? 'الباقة الحالية: ' : 'Current Tier: '}
                  <span className="font-bold text-accent-fuchsia">{getTierName(profile?.subscriptionTier)}</span>
                </p>
              </div>
            </div>
            <button className="px-6 py-3 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
              {isRtl ? 'إدارة الاشتراك' : 'Manage Subscription'}
              <ChevronRight size={18} className={isRtl ? 'rotate-180' : ''} />
            </button>
          </div>
        </GlassCard>

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
            
            <a href="https://wa.me/201070634991" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group block">
              <div className="flex items-center gap-3">
                <HelpCircle className="text-white/60 group-hover:text-accent-cerulean transition-colors" size={20} />
                <span>{t('help_center')}</span>
              </div>
              <ChevronRight size={18} className={`text-white/40 group-hover:text-white transition-all ${isRtl ? 'rotate-180' : ''}`} />
            </a>

            <a href="https://wa.me/201070634991" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group block">
              <div className="flex items-center gap-3">
                <Code className="text-white/60 group-hover:text-accent-fuchsia transition-colors" size={20} />
                <span>{t('contact_developer')}</span>
              </div>
              <ChevronRight size={18} className={`text-white/40 group-hover:text-white transition-all ${isRtl ? 'rotate-180' : ''}`} />
            </a>
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
