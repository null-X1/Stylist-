import { motion } from 'motion/react';
import { ClothingItem } from '../types';

interface AvatarPreviewProps {
  gender: 'male' | 'female';
  items?: ClothingItem[] | any[];
  clothingType?: string;
  color?: string;
  isModest?: boolean;
}

export default function AvatarPreview({ gender, items = [], clothingType, color = '#ffffff', isModest = true }: AvatarPreviewProps) {
  
  // Backwards compatibility if passed single clothingType/color
  const activeItems = items.length > 0 ? items : (clothingType ? [{ type: clothingType, color }] : []);

  const getPieces = () => {
    let top = null, bottom = null, full = null, head = null, outer = null;
    
    activeItems.forEach(item => {
      const typeLower = (item.type || '').toLowerCase();
      if (typeLower.includes('hijab') || typeLower.includes('hat') || typeLower.includes('cap')) head = item.color;
      else if (typeLower.includes('dress') || typeLower.includes('abaya')) full = item.color;
      else if (typeLower.includes('jacket') || typeLower.includes('coat')) outer = item.color;
      else if (typeLower.includes('shirt') || typeLower.includes('blouse') || typeLower.includes('sweater') || typeLower.includes('t-shirt') || typeLower.includes('top')) top = item.color;
      else if (typeLower.includes('jeans') || typeLower.includes('pants') || typeLower.includes('shorts') || typeLower.includes('skirt') || typeLower.includes('trousers')) bottom = item.color;
    });

    return { top, bottom, full, head, outer };
  };

  const { top, bottom, full, head, outer } = getPieces();

  // If no parts identified but items exist, fallback to generic overlay
  const hasPieces = top || bottom || full || head || outer;
  const fallbackColor = activeItems.length > 0 && !hasPieces ? activeItems[0].color : null;

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* 3D-ish Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 mix-blend-overlay pointer-events-none z-10" />
      
      {/* 3D stylized SVG Avatar */}
      <svg viewBox="0 0 200 400" className="w-64 h-full drop-shadow-2xl">
        <defs>
          <radialGradient id="headGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
          </linearGradient>
          <filter id="clothDropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="5" stdDeviation="3" floodOpacity="0.3" />
          </filter>
          <filter id="innerDepth">
             <feComponentTransfer in="SourceAlpha"><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
             <feGaussianBlur stdDeviation="3" result="blur"/>
             <feOffset dy="4" dx="0"/>
             <feComposite operator="out" in2="SourceAlpha"/>
             <feComposite operator="in" in2="SourceGraphic"/>
             <feBlend mode="multiply" in2="SourceGraphic"/>
          </filter>
        </defs>

        {/* Head */}
        <circle cx="100" cy="60" r="35" fill="url(#headGrad)" opacity="0.6" filter="url(#clothDropShadow)" />
        
        {/* Body placeholder */}
        <motion.path
          d="M60 120 L140 120 L145 360 L55 360 Z"
          fill="url(#bodyGrad)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeDasharray="5"
        />

        {/* Dynamic Clothing Overlay */}
        <motion.g
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {full ? (
              <path d="M50 110 L150 110 L160 380 L40 380 Z" fill={full} filter="url(#clothDropShadow)" />
          ) : fallbackColor ? (
              <path d={isModest ? "M40 110 L160 110 L170 390 L30 390 Z" : "M60 120 L140 120 L150 250 L50 250 Z"} fill={fallbackColor} filter="url(#clothDropShadow)" />
          ) : (
            <>
              {top && (
                  <path d="M45 110 L155 110 L145 220 L55 220 Z" fill={top} filter="url(#clothDropShadow)" />
              )}
              {bottom && (
                  <path d="M55 210 L145 210 L145 380 L115 380 L100 240 L85 380 L55 380 Z" fill={bottom} filter="url(#clothDropShadow)" />
              )}
            </>
          )}

          {outer && (
             <path d="M35 105 L165 105 L155 280 L140 280 L140 130 L60 130 L60 280 L45 280 Z" fill={outer} opacity="0.9" filter="url(#clothDropShadow)" />
          )}

          {head && (
              <path d="M50 25 C75 -15 125 -15 150 25 L150 75 C150 75 100 130 50 75 Z" fill={head} filter="url(#clothDropShadow)" />
          )}

          {/* Add highlights and shadows to clothing (3D effect) */}
          <path d="M50 110 C80 130 120 130 150 110 L150 380 C120 380 80 380 50 380 Z" fill="url(#bodyGrad)" style={{ mixBlendMode: 'overlay' }} pointerEvents="none" />
        </motion.g>
        
        {isModest && gender === 'female' && !head && (
           <motion.path
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             d="M50 25 C50 25 100 -5 150 25 L150 75 C150 75 100 95 50 75 Z"
             fill="white"
             opacity="0.1"
             stroke="white"
             strokeWidth="1"
           />
        )}
      </svg>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-fuchsia animate-pulse shadow-[0_0_8px_#ff00ff]" />
        <span className="text-[9px] uppercase tracking-widest font-bold opacity-60 text-white">AI Studio</span>
      </div>
    </div>
  );
}
