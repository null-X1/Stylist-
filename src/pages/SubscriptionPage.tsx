import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Crown, Star, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function SubscriptionPage() {
  const { t, isRtl } = useLanguage();
  const { profile, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletNumber, setWalletNumber] = useState('');

  const currentTier = profile?.subscriptionTier || 'free';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(isRtl ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const initiateSubscription = (tierId: 'essential' | 'unlimited') => {
    setSelectedPlan(tierId);
    setShowWalletModal(true);
  };

  const handleSubscribe = async () => {
    if (!user || !selectedPlan || !walletNumber) return;
    
    setIsProcessing(true);
    setShowWalletModal(false);
    
    try {
      const response = await fetch('/api/paymob/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tierId: selectedPlan, userId: user.uid, walletNumber }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Paymob Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to get checkout URL');
      }
    } catch (error) {
      console.error(error);
      alert(isRtl ? 'حدث خطأ أثناء الترقية' : 'Error upgrading subscription');
    } finally {
      setIsProcessing(false);
      setWalletNumber('');
    }
  };

  const plans = [
    {
      id: 'free',
      name: isRtl ? 'الأساسي' : 'Basic',
      price: 0,
      icon: <Star className="w-6 h-6" />,
      features: isRtl ? [
        'إضافة حتى 15 قطعة ملابس',
        'تنسيق أساسي من الذكاء الاصطناعي',
        'حفظ الإطلالات الأساسية',
      ] : [
        'Add up to 15 clothing items',
        'Basic AI styling',
        'Save basic outfits',
      ],
      color: 'from-slate-500 to-slate-400',
    },
    {
      id: 'essential',
      name: isRtl ? 'الأساسي بلس' : 'Essential',
      price: 70,
      icon: <Crown className="w-6 h-6" />,
      features: isRtl ? [
        'إضافة حتى 50 قطعة ملابس',
        'تنسيق متقدم من الذكاء الاصطناعي',
        'أولوية الدعم الفني',
        'تنسيق الملابس بناءاً على المناسبة',
      ] : [
        'Add up to 50 clothing items',
        'Advanced AI styling',
        'Priority support',
        'Occasion-based styling',
      ],
      color: 'from-accent-cerulean to-accent-indigo',
      popular: true,
    },
    {
      id: 'unlimited',
      name: isRtl ? 'اللامحدود' : 'Unlimited',
      price: 170,
      icon: <Sparkles className="w-6 h-6" />,
      features: isRtl ? [
        'إضافة لا محدودة للملابس',
        'ميزات ذكاء اصطناعي لامحدودة',
        'دعم فني فوري',
        'تحليل خزانة الملابس بالكامل',
        'تنسيقات سفر وتخزين (قريباً)',
      ] : [
        'Unlimited clothing items',
        'Infinite AI features',
        'Instant support',
        'Full wardrobe analysis',
        'Travel & packing styling (Soon)',
      ],
      color: 'from-accent-fuchsia to-purple-600',
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          {isRtl ? 'ارتقِ بأسلوبك' : 'Elevate Your Style'}
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          {isRtl 
            ? 'اختر الباقة المناسبة لك واستمتع بمميزات الذكاء الاصطناعي المتقدمة لتنسيق ملابسك بكل سهولة.' 
            : 'Choose the right plan for you and enjoy advanced AI features to style your outfits easily.'}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-center">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative p-1 rounded-3xl ${
              plan.popular 
                ? 'bg-gradient-to-b from-accent-cerulean to-accent-fuchsia/20' 
                : 'bg-white/5'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-cerulean to-accent-fuchsia px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                {isRtl ? 'الأكثر شيوعاً' : 'Most Popular'}
              </div>
            )}
            
            <div className="bg-[#151515] rounded-[22px] p-8 h-full flex flex-col">
              <div className="space-y-4 mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center text-white shadow-lg`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{formatPrice(plan.price)}</span>
                  <span className="text-white/40">{isRtl ? '/ شهر' : '/ month'}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${plan.popular ? 'text-accent-cerulean' : 'text-white/40'}`} />
                    <span className="text-sm text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => plan.id !== 'free' ? initiateSubscription(plan.id as any) : null}
                disabled={currentTier === plan.id || isProcessing}
                className={`w-full py-4 rounded-full font-bold transition-all relative overflow-hidden group ${
                  currentTier === plan.id
                    ? 'bg-white/5 text-white/40 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-white text-black hover:scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-[1.02]'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isProcessing && selectedPlan === plan.id ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : currentTier === plan.id ? (
                    isRtl ? 'باقتك الحالية' : 'Current Plan'
                  ) : plan.id === 'free' ? (
                    currentTier === 'free' ? (isRtl ? 'باقتك الحالية' : 'Current Plan') : (isRtl ? 'تم التخفيض' : 'Downgrade')
                  ) : (
                    isRtl ? 'اشترك الآن' : 'Subscribe Now'
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#151515] border border-white/10 rounded-3xl p-8 max-w-sm w-full space-y-6"
          >
            <h3 className="text-2xl font-bold">
              {isRtl ? 'فودافون كاش' : 'Vodafone Cash'}
            </h3>
            <p className="text-white/60">
              {isRtl ? 'يرجى إدخال رقم محفظتك لإتمام عملية الدفع.' : 'Please enter your wallet mobile number to proceed.'}
            </p>
            <input 
              type="tel"
              value={walletNumber}
              onChange={(e) => setWalletNumber(e.target.value)}
              placeholder="010..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent-fuchsia"
            />
            <div className="flex items-center gap-4 pt-4">
              <button 
                onClick={() => setShowWalletModal(false)}
                className="flex-1 py-3 rounded-full bg-white/5 hover:bg-white/10 font-bold"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleSubscribe}
                disabled={!walletNumber || isProcessing}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-accent-cerulean to-accent-fuchsia font-bold disabled:opacity-50"
              >
                {isRtl ? 'متابعة الدفع' : 'Proceed to Pay'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
