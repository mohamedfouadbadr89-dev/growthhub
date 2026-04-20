'use client';

import React from 'react';
import { Bell, Search, User, ChevronDown, Calendar, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopHeader() {
  return (
    <header className="h-20 bg-[#F9FAFB]/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-40 px-10 flex items-center justify-between">
      <div className="flex items-center gap-6 flex-1">
        <div className="relative max-w-md w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search analytics, cohorts, or campaigns..."
            className="w-full h-11 bg-muted/30 border-transparent rounded-2xl pl-12 pr-4 text-sm font-medium placeholder:text-muted-foreground/60 focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl shadow-sm text-[11px] font-bold text-muted-foreground hover:bg-muted/30 cursor-pointer transition-all">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Oct 12 - Nov 12, 2023</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-40 ml-1" />
        </div>

        <div className="w-[1px] h-6 bg-border mx-2 hidden md:block" />

        <button className="relative p-2.5 bg-white border border-border rounded-xl shadow-sm hover:bg-muted/30 transition-all group">
          <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-white" />
        </button>

        <div className="flex items-center gap-3 pl-2">
          <div className="flex flex-col items-end text-right">
             <span className="text-[13px] font-black text-foreground leading-tight">Alex Sterling</span>
             <span className="text-[10px] text-primary font-bold uppercase tracking-wider leading-tight">Admin Access</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-border flex items-center justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow">
             <User className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>
    </header>
  );
}
