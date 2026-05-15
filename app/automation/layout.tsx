"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B Step 5.
// Hydrates connection-status snapshot from /api/v1/integrations once
// per session so template badges, detail-page integrations list, and
// Copilot drafts can render real "Connected / Not connected" state
// without each child firing its own fetch.
import { IntegrationStatusProvider } from '@/lib/integration-status/context';

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <IntegrationStatusProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-x-hidden font-body">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full" />
        </div>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={cn("transition-all duration-500 ease-in-out relative z-10", collapsed ? "pl-20" : "pl-72")}>
          <Topbar />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 mt-16 lg:p-12"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </IntegrationStatusProvider>
  );
}
