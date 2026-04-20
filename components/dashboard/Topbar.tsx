'use client';

'use client';

import { Search, Bell, Calendar, Command, LayoutGrid } from 'lucide-react';
import { AuthSection } from '@/components/auth/AuthSection';

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface-bright/80 backdrop-blur-[20px] border-b border-border">
      <div className="flex h-20 items-center justify-between px-10">
        <div className="flex items-center gap-8 flex-1">
          <div className="relative group w-full max-w-md">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <input
              type="text"
              placeholder="Search Precision Matrix..."
              className="w-full h-12 pl-12 pr-12 bg-white border border-border rounded-xl text-[14px] font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all font-body shadow-sm"
            />
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-lg border border-border">
                <Command className="w-3 h-3 text-muted-foreground/60" strokeWidth={2} />
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">K</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-surface-container rounded-xl border border-border">
             <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
             <span className="text-[10px] font-black text-foreground/60 uppercase tracking-[0.2em] font-body">
               {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
             </span>
          </div>

          <div className="flex items-center gap-3">
             <button className="p-3 bg-white border border-border rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/[0.03] transition-all relative group active:scale-95 shadow-sm">
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-primary rounded-full border-2 border-white shadow-lg shadow-primary/40 animate-pulse" />
             </button>
             <button className="p-3 bg-white border border-border rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/[0.03] transition-all active:scale-95 shadow-sm">
                <LayoutGrid className="w-5 h-5" strokeWidth={1.5} />
             </button>
          </div>

          <div className="h-8 w-px bg-border mx-2" />

          <AuthSection />
        </div>
      </div>
    </header>
  );
}
