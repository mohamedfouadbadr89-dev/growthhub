'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Gavel,
  MousePointer2,
  Cpu,
  Palette,
  Flag,
  Puzzle,
  Settings,
  ChevronRight,
  ChevronLeft,
  Box,
  BarChart3,
  Layers,
  PieChart,
  Users,
  TrendingDown,
  CalendarDays,
  Bell,
  TrendingUp,
  Lightbulb,
  UserCheck,
  Library,
  ScrollText,
  Cpu as AutomationIcon,
  List,
  Plus,
  BarChart2,
  Network,
  Link2,
  UserCircle,
  Users as UsersIcon,
  CreditCard,
  Sparkles,
  PenTool,
  FlaskConical,
  Paintbrush,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  label: string;
  href?: string;
  icon: any;
  children?: NavItem[];
}

const DASHBOARD_CHILDREN: NavItem[] = [
  { label: 'Channels', href: '/dashboard/channels', icon: BarChart3 },
  { label: 'Creative', href: '/dashboard/creative', icon: Palette },
  { label: 'Attribution', href: '/dashboard/attribution', icon: Layers },
  { label: 'Segment', href: '/dashboard/segment', icon: Users },
  { label: 'Profit', href: '/dashboard/profit', icon: TrendingDown },
  { label: 'LTV Analysis', href: '/dashboard/ltv', icon: PieChart },
  { label: 'Cohort Analysis', href: '/dashboard/cohort', icon: CalendarDays },
];

const AUTOMATION_CHILDREN: NavItem[] = [
  { label: 'Decision Center', href: '/automation',            icon: Cpu },
  { label: 'Builder',         href: '/automation/builder',    icon: GitBranch },
  { label: 'Strategies',      href: '/automation/strategies', icon: Lightbulb },
  { label: 'History',         href: '/decisions/history',     icon: ScrollText },
];

const ACTIONS_CHILDREN: NavItem[] = [
  { label: 'Library',    href: '/actions',            icon: Library },
  { label: 'Logs',       href: '/actions/logs',       icon: ScrollText },
  { label: 'Automation', href: '/actions/automation', icon: AutomationIcon },
];

const CREATIVES_CHILDREN: NavItem[] = [
  { label: 'Generator', href: '/creatives',            icon: Sparkles    },
  { label: 'Editor',    href: '/creatives/editor',     icon: PenTool     },
  { label: 'Results',   href: '/creatives/results',    icon: FlaskConical },
  { label: 'Brand Kit', href: '/creatives/brand-kit',  icon: Paintbrush  },
];

const SETTINGS_CHILDREN: NavItem[] = [
  { label: 'Account',  href: '/settings',         icon: UserCircle },
  { label: 'Team',     href: '/settings/team',    icon: UsersIcon },
  { label: 'Billing',  href: '/settings/billing', icon: CreditCard },
];

const INTEGRATIONS_CHILDREN: NavItem[] = [
  { label: 'All Integrations', href: '/integrations',         icon: Network },
  { label: 'Connect',          href: '/integrations/connect', icon: Link2 },
];

const CAMPAIGNS_CHILDREN: NavItem[] = [
  { label: 'All Campaigns',   href: '/campaigns',        icon: List },
  { label: 'Create Campaign', href: '/campaigns/create', icon: Plus },
  { label: 'Campaign Detail', href: '/campaigns/1',      icon: BarChart2 },
];

const DECISIONS_CHILDREN: NavItem[] = [
  { label: 'Overview',        href: '/decisions',                  icon: Gavel },
  { label: 'Alerts',          href: '/decisions/alerts',           icon: Bell },
  { label: 'Opportunities',   href: '/decisions/opportunities',    icon: TrendingUp },
  { label: 'Recommendations', href: '/decisions/recommendations',  icon: Lightbulb },
  { label: 'Audience',        href: '/decisions/audience',         icon: UserCheck },
];

const NAV_STRUCTURE: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    children: DASHBOARD_CHILDREN
  },
  {
    label: 'Decisions',
    icon: Gavel,
    children: DECISIONS_CHILDREN,
  },
  { label: 'Actions', icon: MousePointer2, children: ACTIONS_CHILDREN },
  { label: 'Automation', icon: Cpu, children: AUTOMATION_CHILDREN },

  { label: 'Creatives', icon: Palette, children: CREATIVES_CHILDREN },
  { label: 'Campaigns', icon: Flag, children: CAMPAIGNS_CHILDREN },
  { label: 'Integrations', icon: Puzzle, children: INTEGRATIONS_CHILDREN },
  { label: 'Settings', icon: Settings, children: SETTINGS_CHILDREN },
];

function NavGroup({ item, collapsed, pathname }: { item: NavItem; collapsed: boolean; pathname: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = item.href === pathname || item.children?.some(child => child.href === pathname);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2">
         <div className={cn(
           "p-3 rounded-xl transition-all duration-300 relative group",
           isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
         )}>
           <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
         </div>
      </div>
    );
  }

  if (item.children) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-1">
        <CollapsibleTrigger asChild>
          <button className={cn(
            "flex items-center gap-3 w-full px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
          )}>
            <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className="text-[14px] font-bold tracking-tight font-sans flex-1 text-left">{item.label}</span>
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-9 space-y-1 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          {item.children.map((child, idx) => {
            const isChildActive = child.href === pathname;
            return (
              <Link key={idx} href={child.href || '#'}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group relative truncate",
                  isChildActive ? "text-primary font-black bg-primary/5" : "text-muted-foreground hover:text-primary hover:bg-primary/[0.03]"
                )}>
                  <span className="text-[13px] font-bold tracking-tight font-body truncate">{child.label}</span>
                  {isChildActive && (
                    <motion.div 
                      layoutId="active-child-indicator"
                      className="absolute -left-5 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full shadow-lg shadow-primary/20" 
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Link href={item.href || '#'}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
        isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      )}>
        <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        <span className="text-[14px] font-bold tracking-tight font-sans truncate">{item.label}</span>
        {isActive && (
          <motion.div 
            layoutId="active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" 
          />
        )}
      </div>
    </Link>
  );
}

export function Sidebar({
  collapsed,
  setCollapsed
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col z-50 transition-all duration-500 border-r border-border",
        "bg-surface-container-low",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="p-8 pb-12 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                <Box className="w-6 h-6" strokeWidth={2} />
             </div>
             <div className="flex flex-col">
                <span className="font-extrabold text-[18px] tracking-tighter text-foreground leading-none font-sans uppercase">
                  Precision
                </span>
                <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] leading-none mt-1 font-body">
                  Curator
                </span>
             </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2.5 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all active:scale-95"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" strokeWidth={1.5} /> : <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />}
        </button>
      </div>

      <div className="flex-1 px-4 mt-2 overflow-y-auto custom-scrollbar space-y-1 pb-10">
        {NAV_STRUCTURE.map((item, idx) => (
          <NavGroup key={idx} item={item} collapsed={collapsed} pathname={pathname} />
        ))}
      </div>

      <div className="p-6 mt-auto border-t border-border bg-primary/[0.02]">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[12px] font-black">
               AS
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
               <span className="text-[13px] font-bold text-foreground truncate font-sans">Alex Sterling</span>
               <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate font-body">Director</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center text-primary text-[12px] font-black mx-auto">
             AS
          </div>
        )}
      </div>
    </aside>
  );
}