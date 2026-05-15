/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { LogIn, Sparkles } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { translateAuthError } from '../utils/errorHandling';

export default function AuthPage() {
  const { signIn, signInWithEmail, signUpWithEmail, user } = useAuth();
  const { t, isRtl } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/chat" replace />;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error(error);
      setError(translateAuthError(error, isRtl));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (error) {
      console.error(error);
      setError(translateAuthError(error, isRtl));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-20">
      <GlassCard className="p-10 flex flex-col items-center text-center space-y-8 bg-premium-dark/50">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-accent-indigo to-accent-fuchsia flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.4)]">
          <span className="text-4xl font-serif italic text-white">D</span>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('join_dalaby')}</h1>
          <p className="opacity-60">{t('unlock_stylist')}</p>
        </div>

        {error && (
          <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="w-full space-y-4">
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:border-accent-indigo/50 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:border-accent-indigo/50 transition-colors"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            type="submit"
            className="w-full py-4 bg-accent-indigo text-white rounded-xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              t('sign_in')
            ) : (
              t('sign_up')
            )}
          </motion.button>
        </form>

        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-premium-dark text-slate-400">or</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('continue_google')}
            </>
          )}
        </motion.button>
        
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          {isLogin ? t('create_account') : 'Already have an account? Sign In'}
        </button>

        <p className="text-xs opacity-40 leading-relaxed max-w-sm pt-4 border-t border-white/10">
          {t('terms_privacy')}
        </p>
      </GlassCard>
    </div>
  );
}
