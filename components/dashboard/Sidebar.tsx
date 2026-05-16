'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useOrganization } from '@clerk/nextjs';
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
  Network,
  UserCircle,
  Users as UsersIcon,
  CreditCard,
  Sparkles,
  PenTool,
  FlaskConical,
  Paintbrush,
  GitBranch,
  Archive as ArchiveIcon,
  Activity as ActivityIcon,
  Brain,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
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
  // Continuation #53 (2026-05-12) — Overview entry was missing. The canonical
  // dashboard landing page lives at /dashboard/overview (per CLAUDE.md §5
  // routing map; Clerk `AFTER_SIGN_IN_URL` env points here per CLAUDE.md §10).
  // Without this sidebar entry, operators had no path back to Overview from
  // any dashboard child page. The bare `/dashboard` route is now safe:
  // `app/dashboard/page.tsx` (added #53) server-side redirects to
  // /dashboard/overview, so the parent header never 404s. Placing Overview
  // at index 0 matches the routing map.
  { label: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { label: 'Channels', href: '/dashboard/channels', icon: BarChart3 },
  { label: 'Creative', href: '/dashboard/creative', icon: Palette },
  { label: 'Attribution', href: '/dashboard/attribution', icon: Layers },
  { label: 'Segment', href: '/dashboard/segment', icon: Users },
  { label: 'Profit', href: '/dashboard/profit', icon: TrendingDown },
  { label: 'LTV Analysis', href: '/dashboard/ltv', icon: PieChart },
  { label: 'Cohort Analysis', href: '/dashboard/cohort', icon: CalendarDays },
];

// Continuation #123 (2026-05-15) — Phase Ω.6 Phase A reframing per
// `specs/operator-intelligence.md` realignment. Section label and
// item labels move from "automation engine" language to marketer-
// facing "workflows" language. Routes UNCHANGED — only display
// strings change. Operator URL memory + bookmarks preserved.
const AUTOMATION_CHILDREN: NavItem[] = [
  // Decision Center (preview) — governance-deferred Phase 6 mock-shell
  // remains operator-visible with the "(preview)" suffix.
  { label: 'Decision Center (preview)', href: '/dashboard/automation/decision-center', icon: Cpu },
  // Copilot — Phase Ω.6 foundational D UX. AI-assisted workflow drafting;
  // calls existing /api/v1/ai/decisions/generate. No orchestration runtime.
  { label: 'Copilot',         href: '/automation/copilot',    icon: Sparkles },
  // Templates — Phase Ω.6 Phase B. Curated marketplace of starter workflows;
  // each routes to a real Use-Template flow (no dead CTAs).
  { label: 'Templates',       href: '/automation/strategies', icon: Lightbulb },
  // Builder — Phase 6 mock-shell, intentionally deferred to Phase E.
  { label: 'Builder',         href: '/automation/builder',    icon: GitBranch },
  // Runs — was "History"; reframed for marketer-facing language.
  { label: 'Runs',            href: '/automation/history',    icon: ScrollText },
  // Continuation #118 (2026-05-14) — Phase α Layer 6 (Execution Timeline)
  // per `specs/execution-timeline.md`. Interleaved chronological view of
  // automation_runs + decision_history. FE-only; no new endpoints.
  { label: 'Timeline',        href: '/automation/timeline',   icon: ActivityIcon },
  // Continuation #120 (2026-05-14) — Phase γ Layer 7 (Approval Intelligence)
  // per `specs/approval-intelligence.md`. Operator queue of auto-fire
  // blocked rule attempts; reads /automation/runs?status=skipped which
  // the new automation-engine.ts persistence path populates.
  { label: 'Approvals',       href: '/automation/approvals',  icon: ShieldAlertIcon },
];

const ACTIONS_CHILDREN: NavItem[] = [
  { label: 'Library',    href: '/actions',            icon: Library },
  { label: 'Logs',       href: '/actions/logs',       icon: ScrollText },
  { label: 'Automation', href: '/actions/automation', icon: AutomationIcon },
];

const CREATIVES_CHILDREN: NavItem[] = [
  { label: 'Generator', href: '/creatives',             icon: Sparkles    },
  { label: 'Editor',    href: '/creatives/editor',     icon: PenTool     },
  { label: 'Results',   href: '/creatives/results',    icon: FlaskConical },
  { label: 'Archive',   href: '/creatives/archive',    icon: ArchiveIcon  },
  { label: 'Brand Kit', href: '/creatives/brand-kit',  icon: Paintbrush  },
];

const SETTINGS_CHILDREN: NavItem[] = [
  { label: 'Account',  href: '/settings',         icon: UserCircle },
  { label: 'Team',     href: '/settings/team',    icon: UsersIcon },
  { label: 'Billing',  href: '/settings/billing', icon: CreditCard },
];

const INTEGRATIONS_CHILDREN: NavItem[] = [
  { label: 'All Integrations', href: '/integrations',         icon: Network },
  // Continuation #109 (2026-05-14) — removed "Connect" sub-nav. The route
  // it pointed at (`/integrations/connect`) was a mock-shell catalog with
  // hardcoded unsupported platforms; the page is now a redirect to
  // `/integrations` (which already exposes the real per-provider Connect
  // CTAs). Sidebar shortcut becomes a redirect no-op + a duplicate concept
  // — removing it cleans up operator nav and matches the canonical
  // single-source-of-truth pattern.
];

const CAMPAIGNS_CHILDREN: NavItem[] = [
  { label: 'All Campaigns',   href: '/campaigns',        icon: List },
  { label: 'Create Campaign', href: '/campaigns/create', icon: Plus },
  // Campaign Detail entry intentionally absent: detail routes are
  // /campaigns/<uuid> resolved per-row from the list. A static placeholder
  // (e.g. /campaigns/1) was a Stitch-template residue that 404'd in
  // production.
];

const DECISIONS_CHILDREN: NavItem[] = [
  { label: 'Overview',        href: '/decisions',                  icon: Gavel },
  { label: 'Alerts',          href: '/decisions/alerts',           icon: Bell },
  { label: 'Opportunities',   href: '/decisions/opportunities',    icon: TrendingUp },
  { label: 'Recommendations', href: '/decisions/recommendations',  icon: Lightbulb },
  { label: 'Audience',        href: '/decisions/audience',         icon: UserCheck },
];

// Continuation #119 (2026-05-14) — Phase β AI Operator Center entry per
// `specs/ai-operator-center.md`. Single top-level link (no submenu —
// the page itself has tabs). Read-only operator surface over
// `ai_decisions` + `ai_logs`.
// Continuation #123 (2026-05-15) — reframed from "AI Operator" to
// "AI Insights" per Phase A marketing terminology direction.
const OPERATOR_AI_ITEM: NavItem = { label: 'AI Insights', href: '/operator/ai', icon: Brain };

// Continuation #121 (2026-05-14) — Phase δ Governance Dashboard entry per
// `specs/governance-dashboard.md`. Read-only observability over the
// EXISTING governance architecture. No mutation paths.
const GOVERNANCE_ITEM: NavItem = { label: 'Governance', href: '/governance', icon: ShieldCheckIcon };

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
  { label: 'Workflows', icon: Cpu, children: AUTOMATION_CHILDREN },
  OPERATOR_AI_ITEM,
  GOVERNANCE_ITEM,
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

  // Continuation #52 (2026-05-12) — wire bottom user pill to real Clerk user.
  // Replaces hardcoded "Alex Sterling / Director" with actual signed-in
  // identity. AuthSection (Topbar) already uses Clerk's `<UserButton>` —
  // having the Sidebar pill show a fake user was an operator-honesty bug.
  // useUser/useOrganization are safe inside the dashboard layout (auth
  // middleware protects all dashboard routes, so by the time Sidebar mounts
  // we have a session). Loading fallback shows initials placeholder; the
  // pill renders inert (no click handler) — actual user management lives
  // in the Topbar UserButton.
  const { user, isLoaded: userLoaded } = useUser();
  const { organization } = useOrganization();
  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    (userLoaded ? "Operator" : "…");
  const initials = (() => {
    if (!user) return "—";
    const first = user.firstName?.[0] ?? "";
    const last  = user.lastName?.[0] ?? "";
    if (first || last) return (first + last).toUpperCase() || "—";
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    return email[0]?.toUpperCase() ?? "—";
  })();
  // Organization name as the subtitle slot (replaces the fabricated "Director"
  // role). Empty when no org membership; falls back to "—".
  const subtitle = organization?.name?.toUpperCase() || "—";

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
             {/* Continuation #52 — brand label aligned with CLAUDE.md §1
                 product name ("GrowthHub — AI-powered Growth Operating
                 System"). The prior "Precision / Curator" label was Stitch
                 template residue. */}
             <div className="flex flex-col">
                <span className="font-extrabold text-[18px] tracking-tighter text-foreground leading-none font-sans uppercase">
                  GrowthHub
                </span>
                <span className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] leading-none mt-1 font-body">
                  Growth OS
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

      {/* Continuation #52 — bottom pill now reflects the real Clerk user
          (name + org). Was hardcoded "Alex Sterling / Director" Stitch
          mock. AuthSection in Topbar still owns the interactive
          account/menu surface via Clerk's <UserButton>; this pill is
          inert/decorative. */}
      <div className="p-6 mt-auto border-t border-border bg-primary/[0.02]">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[12px] font-black">
               {initials}
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
               <span className="text-[13px] font-bold text-foreground truncate font-sans">{displayName}</span>
               <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate font-body">{subtitle}</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center text-primary text-[12px] font-black mx-auto">
             {initials}
          </div>
        )}
      </div>
    </aside>
  );
}