/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sparkles, X } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { translateAuthError } from '../utils/errorHandling';

export default function AuthPage() {
  const { signIn, signInWithEmail, signUpWithEmail, user } = useAuth();
  const { t, isRtl } = useLanguage();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl relative">
          
          <div className="absolute top-6 left-6 rtl:left-auto rtl:right-6">
            <button 
              onClick={() => navigate('/')}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          <div className="mb-8">
            <div className="flex bg-[#111] border border-white/5 rounded-full p-1 w-max mb-8">
              <button
                onClick={() => setIsLogin(false)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!isLogin ? 'bg-[#222] text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
              >
                {t('sign_up') || 'Sign up'}
              </button>
              <button
                onClick={() => setIsLogin(true)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${isLogin ? 'bg-[#222] text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
              >
                {t('sign_in') || 'Sign in'}
              </button>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {isLogin ? (isRtl ? 'تسجيل الدخول' : 'Sign in to your account') : (isRtl ? 'إنشاء حساب جديد' : 'Create an account')}
            </h1>
          </div>

          {error && (
            <div className="w-full p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="flex gap-4">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={isRtl ? 'الاسم الأول' : 'First name'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30"
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={isRtl ? 'الاسم الأخير' : 'Last name'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30"
                />
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30"
                dir={isRtl ? 'rtl' : 'ltr'}
                style={isRtl ? { paddingRight: '2.5rem', paddingLeft: '1rem' } : undefined}
              />
              {isRtl && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter your password'}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/30"
                dir={isRtl ? 'rtl' : 'ltr'}
                style={isRtl ? { paddingRight: '2.5rem', paddingLeft: '1rem' } : undefined}
              />
              {isRtl && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isLoading}
              type="submit"
              className="w-full py-3.5 mt-2 bg-white text-black rounded-xl font-semibold shadow-sm flex justify-center items-center gap-2 hover:bg-gray-100 transition-colors"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isLogin ? (
                isRtl ? 'تسجيل الدخول' : 'Sign in'
              ) : (
                isRtl ? 'إنشاء حساب' : 'Create an account'
              )}
            </motion.button>
          </form>

          <div className="my-8 relative flex justify-center text-[10px] text-white/30 uppercase tracking-widest">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative bg-[#1a1a1a] px-4 font-medium backdrop-blur-3xl">
              {isRtl ? 'أو المتابعة عبر' : 'OR SIGN IN WITH'}
            </span>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl font-medium flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </motion.button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[11px] text-white/40 leading-relaxed font-medium">
              {isRtl 
                ? 'بإنشاء حساب، أنت توافق على شروط الخدمة الخاصة بنا'
                : 'By creating an account, you agree to our Terms & Service'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
