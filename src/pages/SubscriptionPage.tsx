import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Crown, Star, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function SubscriptionPage() {
  const { t, isRtl } = useLanguage();
  const { profile, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletNumber, setWalletNumber] = useState('');

  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'submitting' | 'sent' | 'success'>('idle');
  const [screenshot, setScreenshot] = useState<File | null>(null);

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubscribe = async () => {
    if (!user || !selectedPlan || !walletNumber || !screenshot) {
      alert(isRtl ? 'يرجى إملاء كافة الحقول!' : 'Please fill all required fields!');
      return;
    }
    
    setPaymentStatus('submitting');
    
    try {
      const base64Image = await fileToBase64(screenshot);
      const response = await fetch('/api/subscription/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tierId: selectedPlan, 
          userId: user.uid, 
          userEmail: user.email,
          senderNumber: walletNumber,
          base64Image 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowWalletModal(false);
        setPaymentStatus('sent');
        setTimeout(() => {
          setPaymentStatus((curr) => curr === 'sent' ? 'idle' : curr);
        }, 8000);

        // Start polling for admin approval
        const intervalId = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/subscription/status?userId=${user.uid}`);
            const statusData = await statusRes.json();
            
            if (statusData.status === 'approved') {
              clearInterval(intervalId);
              // Store user's new tier locally
              await updateDoc(doc(db, 'users', user.uid), {
                subscriptionTier: selectedPlan
              });
              await fetch('/api/subscription/clear', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ userId: user.uid }) 
              });
              
              setPaymentStatus('success');
              setTimeout(() => {
                 window.location.reload();
              }, 3000);
            } else if (statusData.status === 'rejected') {
              clearInterval(intervalId);
              setPaymentStatus('idle');
              alert(isRtl ? "عذراً، تم الرفض في عملية التحقق من الدفع." : "Payment verification was rejected.");
            }
          } catch (err) {
            console.error("Polling error", err);
          }
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error(error);
      setPaymentStatus('idle');
      alert(isRtl ? 'حدث خطأ أثناء رفع الطلب' : 'Error submitting request');
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
                disabled={currentTier === plan.id || paymentStatus === 'submitting'}
                className={`w-full py-4 rounded-full font-bold transition-all relative overflow-hidden group ${
                  currentTier === plan.id
                    ? 'bg-white/5 text-white/40 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-white text-black hover:scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-[1.02]'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {paymentStatus === 'submitting' && selectedPlan === plan.id ? (
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
            className="bg-[#151515] border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-6"
          >
            <h3 className="text-2xl font-bold text-center">
              {isRtl ? 'الدفع عبر فودافون كاش' : 'Pay via Vodafone Cash'}
            </h3>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
              <p className="text-white/80">
                {isRtl ? 'يرجى تحويل مبلغ' : 'Please transfer the amount of'}
                <span className="font-bold text-accent-fuchsia mx-1">
                  {selectedPlan === 'essential' ? '70' : selectedPlan === 'unlimited' ? '170' : '0'} {isRtl ? 'جنيه مصري' : 'EGP'}
                </span>
                {isRtl ? 'إلى الرقم التالي:' : 'to the following number:'}
              </p>
              <p className="text-2xl font-bold text-accent-cerulean tracking-wider">01020753374</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  {isRtl ? 'رقم محفظتك (الذي قمت بالتحويل منه)' : 'Your Wallet Number (Sender)'}
                </label>
                <input 
                  type="tel"
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="010..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent-fuchsia"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  {isRtl ? 'إيصال التحويل (صورة الشاشة)' : 'Transfer Receipt (Screenshot)'}
                </label>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button 
                onClick={() => setShowWalletModal(false)}
                className="flex-1 py-3 rounded-full bg-white/5 hover:bg-white/10 font-bold"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleSubscribe}
                disabled={!walletNumber || !screenshot || paymentStatus === 'submitting'}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-accent-cerulean to-accent-fuchsia font-bold disabled:opacity-50 relative overflow-hidden"
              >
                {paymentStatus === 'submitting' ? (
                   <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                   isRtl ? 'تأكيد ودفع' : 'Confirm & Pay'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="fixed top-20 right-4 rtl:right-auto rtl:left-4 z-[60] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {(paymentStatus === 'sent' || paymentStatus === 'success') && (
            <motion.div 
              initial={{ opacity: 0, x: isRtl ? -50 : 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`pointer-events-auto backdrop-blur-xl border rounded-2xl p-4 w-80 shadow-2xl flex items-start gap-4 ${
                paymentStatus === 'sent'
                  ? 'bg-orange-950/40 border-orange-500/30 shadow-[0_4px_30px_rgba(249,115,22,0.15)] text-orange-100' 
                  : 'bg-green-950/40 border-green-500/30 shadow-[0_4px_30px_rgba(34,197,94,0.15)] text-green-100'
              }`}
            >
              {paymentStatus === 'sent' ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 flex-none mt-1 shadow-[0_0_15px_rgba(249,115,22,0.4)] relative">
                    <AlertCircle className="w-4 h-4 text-orange-400 relative z-10" />
                  </div>
                  <div>
                    <h3 className="font-bold text-orange-400">{isRtl ? 'تم إرسال طلبك' : 'Request Sent'}</h3>
                    <p className="text-orange-200/70 text-xs mt-1 leading-relaxed">
                      {isRtl ? 'يرجى الانتظار، سيصلك إشعار فور تأكيد تحويلك من قبل الإدارة.' : 'Please wait, you will be notified once the admin verifies the transfer.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 flex-none mt-1 shadow-[0_0_15px_rgba(34,197,94,0.4)] relative">
                    <Check className="w-4 h-4 text-green-400 relative z-10" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400">{isRtl ? 'تم التفعيل بنجاح!' : 'Subscription Active!'}</h3>
                    <p className="text-green-200/70 text-xs mt-1 leading-relaxed">
                      {isRtl ? 'شكراً لك، جاري تحديث الصفحة' : 'Thank you, refreshing page...'}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
