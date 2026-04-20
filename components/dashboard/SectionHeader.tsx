import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12", className)}>
      <div className="flex flex-col gap-2">
         <div className="flex items-center gap-3">
            <span className="w-12 h-0.5 bg-primary/40 rounded-full" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Operational Node</span>
         </div>
        <h2 className="text-5xl font-serif font-bold tracking-[-0.03em] uppercase leading-none">{title}</h2>
        {description && <p className="text-foreground/40 max-w-2xl text-xs uppercase tracking-wider font-medium leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </div>
  );
}

