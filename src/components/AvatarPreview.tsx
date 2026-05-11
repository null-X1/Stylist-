import { motion } from 'motion/react';

interface AvatarPreviewProps {
  gender: 'male' | 'female';
  clothingType?: string;
  color?: string;
  isModest?: boolean;
}

export default function AvatarPreview({ gender, clothingType, color = '#ffffff', isModest = true }: AvatarPreviewProps) {
  
  const typeLower = (clothingType || '').toLowerCase();

  const isTop = typeLower.includes('shirt') || typeLower.includes('blouse') || typeLower.includes('sweater') || typeLower.includes('jacket') || typeLower.includes('coat');
  const isBottom = typeLower.includes('jeans') || typeLower.includes('pants') || typeLower.includes('shorts') || typeLower.includes('skirt');
  const isFull = typeLower.includes('dress') || typeLower.includes('abaya');
  const isHead = typeLower.includes('hijab') || typeLower.includes('hat') || typeLower.includes('cap');

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Simple stylized SVG Avatar */}
      <svg viewBox="0 0 200 400" className="w-64 h-full drop-shadow-2xl">
        {/* Head */}
        <circle cx="100" cy="60" r="40" fill="gray" opacity="0.2" />
        
        {/* Body placeholder */}
        <motion.path
          d="M60 120 L140 120 L150 380 L50 380 Z"
          fill="white"
          opacity="0.05"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="5"
        />

        {/* Dynamic Clothing Overlay */}
        {clothingType && (
          <motion.g
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            {isTop && (
               <path d="M50 110 L150 110 L140 220 L60 220 Z" fill={color} />
            )}
            
            {isBottom && (
               <path d={typeLower.includes('skirt') ? "M60 220 L140 220 L150 380 L50 380 Z" : "M60 220 L140 220 L140 380 L110 380 L100 240 L90 380 L60 380 Z"} fill={color} />
            )}

            {isFull && (
               <path d="M50 110 L150 110 L160 380 L40 380 Z" fill={color} />
            )}

            {isHead && (
               <path d="M60 20 C80 -10 120 -10 140 20 L140 80 C140 80 100 120 60 80 Z" fill={color} />
            )}

            {!isTop && !isBottom && !isFull && !isHead && (
               <path d={isModest ? "M40 110 L160 110 L170 390 L30 390 Z" : "M60 120 L140 120 L150 250 L50 250 Z"} fill={color} />
            )}
          </motion.g>
        )}
        
        {isModest && gender === 'female' && !isHead && (
           <motion.path
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             d="M60 20 C60 20 100 0 140 20 L140 80 C140 80 100 100 60 80 Z"
             fill="white"
             opacity="0.1"
             stroke="white"
             strokeWidth="1"
           />
        )}
      </svg>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-fuchsia animate-pulse" />
        <span className="text-[9px] uppercase tracking-widest font-bold opacity-60 text-white">AI Active</span>
      </div>
    </div>
  );
}
