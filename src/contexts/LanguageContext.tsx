/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isRtl: boolean;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    app_name: 'Dolaby AI',
    hero_title: 'Your Personal',
    hero_title_italic: 'AI Stylist',
    hero_subtitle: 'Smart wardrobe management and personalized outfit suggestions tailored just for you.',
    get_started: 'Get Started',
    explore_collection: 'Explore Collection',
    chat: 'Chat',
    wardrobe: 'Wardrobe',
    history: 'History',
    analysis: 'Analysis',
    add_clothing: 'Add Item',
    profile: 'Profile',
    settings: 'Settings',
    modest_fashion: 'Modest Fashion Only',
    gender_male: 'Male',
    gender_female: 'Female',
    search_wardrobe: 'Search your wardrobe...',
    suggested_prompts: 'Try asking:',
    prompt_work: 'Outfit for work',
    prompt_wedding: 'Wedding outfit',
    prompt_casual: 'Casual weekend style',
    prompt_uni: 'University style',
    prompt_modest: 'Summer fashion',
    prompt_formal: 'Formal outfit',
    modest_chic: 'Modest Chic',
    sand_collection: 'The Sand Collection',
    formal_evening: 'Formal Evening',
    midnight_silk: 'Midnight Silk',
    campus_style: 'Campus Style',
    minimalist_layering: 'Minimalist Layering',
    ai_analysis: 'AI Analysis',
    refresh_analysis: 'Refresh Analysis',
    analysis_subtitle: 'Smart insights based on your recent wardrobe changes.',
    style_score: 'Style Score',
    excellent_balance: 'Excellent Balance',
    wardrobe_optimized: 'Your wardrobe is 80% optimized for the current season.',
    wardrobe_balance: 'Wardrobe Balance',
    missing_essentials: 'Missing Essentials',
    styling_tips: 'Styling Tips',
    auto_detect: 'Auto-Detect with AI',
    upload_photo: 'Upload Clothing Photo',
    drag_drop: 'Drag and drop or click to browse',
    classification: 'Classification',
    type: 'Type',
    category: 'Category',
    visual_details: 'Visual Details',
    color: 'Color',
    material: 'Material',
    modest_selection: 'Modest Selection',
    apply_religious: 'Apply religious styling rules',
    save_wardrobe: 'Save to Wardrobe',
    reference_photo: 'Reference Photo',
    join_dalaby: 'Join Dolaby',
    unlock_stylist: 'Unlock your AI stylist and start building your future wardrobe today.',
    continue_google: 'Continue with Google',
    terms_privacy: 'By continuing, you agree to Dolaby\'s Terms of Service and Privacy Policy. Modest fashion rules applied by default for female profiles.',
    cat_all: 'All',
    cat_work: 'Work',
    cat_casual: 'Casual',
    cat_formal: 'Formal',
    cat_party: 'Party',
    cat_university: 'University',
    cat_sport: 'Sport',
    cat_workwear: 'Workwear',
    color_harmony: 'Color Harmony Alert',
    color_harmony_desc: 'You have a lot of dark tops. Try adding some beige or pastel tones to balance your summer looks.',
    mix_match: 'Mix & Match Optimization',
    mix_match_desc: 'Your blue blazer matches 15 items in your wardrobe. It\'s your most versatile piece!',
    manual_entry: 'Manual Entry',
    ai_entry: 'AI Image Analysis',
    select_color: 'Select Color',
    select_type: 'Select Type',
    select_category: 'Select Category',
    select_material: 'Select Material',
    email: 'Email',
    password: 'Password',
    sign_in: 'Sign In',
    sign_up: 'Sign Up',
    create_account: 'Create Account',
    logout: 'Logout',
    choose_method: 'Choose how to add your clothing',
    ai_greeting: 'Hello! I am your Dolaby stylist. Where are you heading today?',
    type_message: 'Type a message...',
    no_clothes_in_wardrobe: 'There are no clothes in your wardrobe yet. Please add some pieces so I can coordinate outfits for you!',
    detected_items: 'Detected Items',
    review_before_saving: 'You can review them before saving.',
    no_items_detected: 'No items detected yet.',
    upload_to_start: 'Upload an image to start.',
    items_indexed: 'Items Indexed',
    needs_additions: 'Needs some additions',
    formal_attire: 'Formal attire (Suits, Ties)',
    everyday_casual: 'Everyday Casual Items',
    more_variety: 'More variety of tops and bottoms',
    balanced_wardrobe: 'Your wardrobe looks quite balanced!',
    contact_developer: 'Contact Developer',
    help_center: 'Help Center',
  },
  ar: {
    app_name: 'دولابي',
    hero_title: 'منسق ملابسك الشخصي بـ',
    hero_title_italic: 'الذكاء الاصطناعي',
    hero_subtitle: 'إدارة ذكية لخزانة ملابسك واقتراحات أطقم مخصصة لك تماماً.',
    get_started: 'ابدأ الآن',
    explore_collection: 'استكشف المجموعة',
    chat: 'الدردشة',
    wardrobe: 'الخزانة',
    history: 'السجل',
    analysis: 'التحليل',
    add_clothing: 'إضافة قطعة',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    modest_fashion: 'ملابس محتشمة فقط',
    gender_male: 'ذكر',
    gender_female: 'أنثى',
    search_wardrobe: 'ابحث في خزانة ملابسك...',
    suggested_prompts: 'جرب أن تسأل:',
    prompt_work: 'طقم للشغل',
    prompt_wedding: 'لبس لفرح',
    prompt_casual: 'ستايل كاجوال',
    prompt_uni: 'ستايل جامعة',
    prompt_modest: 'ستايل للصيف',
    prompt_formal: 'ستايل رسمي',
    modest_chic: 'شياكة محتشمة',
    sand_collection: 'تشكيلة الرمال',
    formal_evening: 'سهرة رسمية',
    midnight_silk: 'حرير منتصف الليل',
    campus_style: 'ستايل الجامعة',
    minimalist_layering: 'طبقات بسيطة',
    ai_analysis: 'تحليل الذكاء الاصطناعي',
    refresh_analysis: 'تحديث التحليل',
    analysis_subtitle: 'رؤى ذكية بناءً على التغييرات الأخيرة في خزانة ملابسك.',
    style_score: 'نقاط الأناقة',
    excellent_balance: 'توازن ممتاز',
    wardrobe_optimized: 'خزانة ملابسك محسنة بنسبة 80٪ للموسم الحالي.',
    wardrobe_balance: 'توازن الخزانة',
    missing_essentials: 'الأساسيات المفقودة',
    styling_tips: 'نصائح التنسيق',
    auto_detect: 'التعرف التلقائي بالذكاء الاصطناعي',
    upload_photo: 'رفع صورة الملابس',
    drag_drop: 'اسحب وأفلت أو انقر للتصفح',
    classification: 'التصنيف',
    type: 'النوع',
    category: 'الفئة',
    visual_details: 'التفاصيل المرئية',
    color: 'اللون',
    material: 'الخامة',
    modest_selection: 'تفضيلات الملابس المحتشمة',
    apply_religious: 'سيتم التركيز على اقتراح ملابس محتشمة فقط',
    save_wardrobe: 'حفظ في الخزانة',
    reference_photo: 'الصورة المرجعية',
    join_dalaby: 'انضم إلى دولابي',
    unlock_stylist: 'افتح منسق أزيائك الشخصي وابدأ في بناء خزانة ملابس المستقبل اليوم.',
    continue_google: 'المتابعة مع Google',
    terms_privacy: 'بالمتابعة، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بدولابي. يتم تطبيق قواعد اللباس المحتشم افتراضيًا للملفات الشخصية للإناث.',
    cat_all: 'الكل',
    cat_work: 'عمل',
    cat_casual: 'كاجوال',
    cat_formal: 'رسمي',
    cat_party: 'حفلة',
    cat_university: 'جامعة',
    cat_sport: 'رياضة',
    cat_workwear: 'ملابس عمل',
    color_harmony: 'تنبيه تناسق الألوان',
    color_harmony_desc: 'لديك الكثير من البلوزات الداكنة. حاولي إضافة بعض درجات البيج أو الباستيل لموازنة إطلالاتك الصيفية.',
    mix_match: 'تحسين التنسيق',
    mix_match_desc: 'سترتك الزرقاء تتناسب مع 15 قطعة في خزانة ملابسك. إنها أكثر قطعة متعددة الاستخدامات لديك!',
    manual_entry: 'إدخال يدوي',
    ai_entry: 'تحليل الصورة بالذكاء الاصطناعي',
    select_color: 'اختر اللون',
    select_type: 'اختر النوع',
    select_category: 'اختر الفئة',
    select_material: 'اختر الخامة',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    sign_in: 'تسجيل الدخول',
    sign_up: 'إنشاء حساب',
    create_account: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    choose_method: 'اختر طريقة إضافة ملابسك',
    ai_greeting: 'مرحباً! أنا منسق الأزياء دولابي. إلى أين تتجه اليوم؟',
    type_message: 'اكتب رسالتك هنا...',
    no_clothes_in_wardrobe: 'لا يوجد ملابس في خزانتك حتى الآن، يرجى إضافة بعض القطع حتى أتمكن من تنسيق أطقم لك!',
    detected_items: 'القطع المكتشفة',
    review_before_saving: 'يمكنك مراجعتها قبل الحفظ.',
    no_items_detected: 'لم يتم العثور على أي قطع بعد.',
    upload_to_start: 'ارفع صورة للبدء.',
    items_indexed: 'قطع مفهرسة',
    needs_additions: 'بحاجة لبعض الإضافات',
    formal_attire: 'ملابس رسمية (بدل، كرافتات)',
    everyday_casual: 'ملابس كاجوال يومية',
    more_variety: 'مزيد من التنوع في القطع العلوية والسفلية',
    balanced_wardrobe: 'خزانتك تبدو متوازنة تماماً!',
    contact_developer: 'تواصل مع المطور',
    help_center: 'مركز المساعدة',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'ar' || saved === 'en') return saved as Language;
    
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'ar' ? 'ar' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (lang === 'ar') {
      document.documentElement.style.fontSize = '14px';
      document.body.classList.add('font-arabic');
      document.body.classList.remove('font-sans');
    } else {
      document.documentElement.style.fontSize = '16px';
      document.body.classList.add('font-sans');
      document.body.classList.remove('font-arabic');
    }
  }, [lang]);

  const isRtl = lang === 'ar';

  const t = (key: string) => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRtl, t }}>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
