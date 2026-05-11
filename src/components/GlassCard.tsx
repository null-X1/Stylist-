/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, HTMLMotionProps } from 'motion/react';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function GlassCard({ children, className = '', glow = true, ...props }: GlassCardProps) {
  return (
    <motion.div
      className={`glass-card p-8 bg-white/[0.03] border-white/[0.08] backdrop-blur-2xl rounded-[32px] ${glow ? 'glass-glow' : ''} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
