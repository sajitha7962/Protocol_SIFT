import React from 'react';
import { cn } from '../../lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  hover?: boolean;
  onClick?: () => void;
  id?: string;
}

export function GlassPanel({ children, className, strong = false, hover = false, onClick, id }: GlassPanelProps) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'rounded-xl transition-all duration-200',
        hover && 'cursor-pointer hover:border-sift-cyan/25 hover:shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
