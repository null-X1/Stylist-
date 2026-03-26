export const ITEM_TYPES = {
  top: [
    { val: 'tshirt', label: 'تيشيرت' }, { val: 'shirt', label: 'قميص' }, { val: 'blouse', label: 'بلوزة' },
    { val: 'sweater', label: 'بلوفر' }, { val: 'hoodie', label: 'هودي' }, { val: 'jacket', label: 'جاكيت' },
    { val: 'coat', label: 'معطف' }, { val: 'vest', label: 'فيست' }
  ],
  bottom: [
    { val: 'pants', label: 'بنطال' }, { val: 'jeans', label: 'جينز' },
    { val: 'shorts', label: 'شورت' }, { val: 'skirt', label: 'تنورة' }
  ],
  full: [
    { val: 'dress', label: 'فستان' }, { val: 'abaya', label: 'عباءة' }, { val: 'suit', label: 'بدلة' }
  ],
  shoes: [
    { val: 'sneakers', label: 'رياضي' }, { val: 'shoes', label: 'كلاسيك' },
    { val: 'boots', label: 'بوت' }, { val: 'sandals', label: 'صندل' }
  ],
  accessories: [
    { val: 'hijab', label: 'حجاب' }, { val: 'scarf', label: 'وشاح' }, { val: 'tie', label: 'ربطة عنق' }
  ]
};

export const ALL_TYPES_FLAT = Object.values(ITEM_TYPES).flat().reduce((acc, curr) => ({...acc, [curr.val]: curr.label}), {});

export const QUICK_COLORS = ['#ffffff', '#000000', '#9ca3af', '#1e3a8a', '#b91c1c', '#f59e0b', '#166534', '#fdf6e3', '#ec4899', '#8b5cf6'];
