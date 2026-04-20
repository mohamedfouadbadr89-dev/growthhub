import React from 'react';
import { Calendar, ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FilterBar({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-wrap items-center gap-4 py-3 px-6 bg-surface-container-low rounded-sm",
      className
    )}>
      <div className="flex items-center gap-3 px-3 py-2 rounded-sm bg-surface-container-highest/30 cursor-pointer hover:bg-surface-container-high hover:text-primary transition-all duration-300">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase">Mar 1 - Mar 31, 2024</span>
        <ChevronDown className="w-3 h-3 opacity-40" />
      </div>
      
      <div className="h-6 w-px bg-outline-variant/10 mx-2" />
      
      <div className="flex items-center gap-3 px-3 py-2 rounded-sm bg-surface-container-highest/30 cursor-pointer hover:bg-surface-container-high hover:text-primary transition-all duration-300">
        <Filter className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase">All Channels</span>
        <ChevronDown className="w-3 h-3 opacity-40" />
      </div>

      <div className="flex items-center gap-3 px-3 py-2 rounded-sm bg-surface-container-highest/30 cursor-pointer hover:bg-surface-container-high hover:text-primary transition-all duration-300 ml-auto">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/40">Segment:</span>
        <span className="text-[11px] font-bold tracking-[0.1em] uppercase">All Customers</span>
        <ChevronDown className="w-3 h-3 opacity-40" />
      </div>
    </div>
  );
}

