import React from 'react';
import { ALL_TYPES_FLAT } from './constants.js';

export function LiveAvatar({ items }) {
  const top = items.top || items.full;
  const bottom = items.bottom;
  const shoes = items.shoes;
  const acc = items.accessories;
  return (
    <svg viewBox="0 0 200 350" className="w-full h-full drop-shadow-md">
      <g id="mannequin" fill="var(--skin-color, #cbd5e1)">
        <circle cx="100" cy="40" r="22" />
        <rect x="92" y="55" width="16" height="20" />
        <path d="M70 70 Q100 65 130 70 L120 180 L80 180 Z" />
        <path d="M70 70 L45 150 L60 150 L85 80 Z" />
        <path d="M130 70 L155 150 L140 150 L115 80 Z" />
        <path d="M80 180 L72 300 L93 300 L98 180 Z" />
        <path d="M120 180 L128 300 L107 300 L102 180 Z" />
        <path d="M72 300 L93 300 L93 315 L62 315 Z" />
        <path d="M128 300 L107 300 L107 315 L138 315 Z" />
      </g>
      {bottom && (
        <g fill={bottom.color}>
          {['pants', 'jeans'].includes(bottom.type) && <path d="M78 178 L68 305 L95 305 L100 178 L105 305 L132 305 L122 178 Z" />}
          {bottom.type === 'shorts' && <path d="M78 178 L72 240 L97 240 L100 178 L103 240 L128 240 L122 178 Z" />}
          {bottom.type === 'skirt' && <path d="M80 178 L55 260 L145 260 L120 178 Z" />}
        </g>
      )}
      {top && (
        <g fill={top.color}>
          {['tshirt', 'shirt', 'blouse'].includes(top.type) && <path d="M65 68 Q100 78 135 68 L150 120 L130 125 L122 185 L78 185 L70 125 L50 120 Z" />}
          {['sweater', 'hoodie', 'jacket', 'coat'].includes(top.type) && <path d="M55 65 Q100 75 145 65 L165 155 L140 160 L125 195 L75 195 L60 160 L35 155 Z" />}
          {['dress', 'abaya', 'suit'].includes(top.type) && <path d="M65 68 Q100 75 135 68 L145 110 L135 115 L150 280 L50 280 L65 115 L55 110 Z" />}
        </g>
      )}
      {acc && (
        <g fill={acc.color}>
          {acc.type === 'hijab' && <path d="M75 15 Q100 -5 125 15 L130 60 Q100 80 70 60 Z" />}
          {acc.type === 'tie' && <path d="M95 70 L105 70 L102 120 L100 125 L98 120 Z" />}
        </g>
      )}
      {shoes && (
        <g fill={shoes.color}>
          <path d="M68 302 L95 302 L95 318 L55 318 Q55 302 68 302 Z" />
          <path d="M132 302 L105 302 L105 318 L145 318 Q145 302 132 302 Z" />
          {shoes.type === 'sneakers' && <g fill="#ffffff" opacity="0.8"><rect x="58" y="312" width="35" height="6" rx="2" /><rect x="107" y="312" width="35" height="6" rx="2" /></g>}
        </g>
      )}
    </svg>
  );
}

export function OutfitCard({ outfit, clothes }) {
  if (!outfit) return null;
  const top = clothes.find(c => c.id === outfit.topId);
  const bottom = clothes.find(c => c.id === outfit.bottomId);
  const shoes = clothes.find(c => c.id === outfit.shoesId);
  const acc = clothes.find(c => c.id === outfit.accessoryId);
  const translateType = (type) => ALL_TYPES_FLAT[type] || type;
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl p-4 shadow-lg border border-[var(--border-color)] flex items-center gap-4 transition-all hover:shadow-xl">
      <div className="w-24 h-32 flex-shrink-0 bg-[var(--bg-base)] rounded-xl p-2 border border-[var(--border-color)]">
        <LiveAvatar items={{ top, bottom, shoes, accessories: acc }} />
      </div>
      <div className="flex-1 space-y-2">
        {[top, bottom, shoes, acc].filter(Boolean).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full shadow-inner border border-[var(--border-color)] flex-shrink-0 overflow-hidden" style={{backgroundColor: item.color}}>
              {item.image && <img src={item.image} className="w-full h-full object-cover mix-blend-multiply opacity-50" />}
            </div>
            <p className="text-xs font-bold text-[var(--text-main)]">{translateType(item.type)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex lg:flex-row flex-col items-center gap-1 lg:gap-3 p-2 lg:p-3 lg:w-full rounded-xl transition-all ${active ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)]'}`}>
      <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>{icon}</div>
      <span className="text-[10px] lg:text-xs font-bold">{label}</span>
    </button>
  );
}
