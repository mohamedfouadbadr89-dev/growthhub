"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ScrollText, Cpu, ArrowRight, Loader2, Zap } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface ActionTemplate {
  id: string;
  platform: string;
  action_type: string;
  name: string;
  description: string;
  parameter_schema: { fields: Array<{ name: string; type: string; required: boolean; label: string }> };
  created_at: string;
}

const PLATFORM_COLOR: Record<string, string> = {
  meta:   "bg-[#1877F2]/10 text-[#1877F2]",
  google: "bg-[#4285F4]/10 text-[#4285F4]",
  shopify:"bg-emerald-100 text-emerald-700",
};

const PLATFORM_LABEL: Record<string, string> = {
  meta:   "Meta Ads",
  google: "Google Ads",
  shopify:"Shopify",
};

const QUICK_LINKS = [
  { Icon: ScrollText, label: "Execution Logs",   href: "/actions/logs",       desc: "View all recent executions" },
  { Icon: Cpu,        label: "Automation Rules",  href: "/actions/automation", desc: "Manage IF→THEN playbooks" },
];

export default function ActionsLibraryPage() {
  const { getToken } = useAuth();
  const [templates, setTemplates] = useState<ActionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiClient<{ actions: ActionTemplate[] }>("/api/v1/actions", token);
        setTemplates(data.actions);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const grouped = templates.reduce<Record<string, ActionTemplate[]>>((acc, t) => {
    if (!acc[t.platform]) acc[t.platform] = [];
    acc[t.platform].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
          Execution Engine
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-sans">Actions Library</h2>
        <p className="text-muted-foreground mt-2 font-body">
          Browse executable action templates. Select one to configure parameters and execute.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICK_LINKS.map((q) => (
          <Link key={q.label} href={q.href}>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex items-center gap-4 hover:border-primary/20 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <q.Icon size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground font-body">{q.label}</p>
                <p className="text-xs text-muted-foreground font-body">{q.desc}</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Actions by Platform */}
      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
          <Loader2 size={20} className="animate-spin" />
          <span className="font-body text-sm">Loading actions…</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground font-body text-sm">
          No action templates found.
        </div>
      ) : (
        Object.entries(grouped).map(([platform, actions]) => (
          <div key={platform}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-body ${PLATFORM_COLOR[platform] ?? "bg-surface-container-low text-muted-foreground"}`}>
                {PLATFORM_LABEL[platform] ?? platform}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {actions.map((action) => (
                <Link key={action.id} href={`/actions/${action.id}`}>
                  <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group cursor-pointer flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Zap size={22} className="text-primary" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest font-body ${PLATFORM_COLOR[action.platform] ?? "bg-surface-container-low text-muted-foreground"}`}>
                        {action.action_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-2 font-sans group-hover:text-primary transition-colors">
                      {action.name}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-body flex-1">
                      {action.description}
                    </p>
                    <div className="pt-4 border-t border-surface-container-low flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter font-body">
                        {action.parameter_schema?.fields?.length ?? 0} parameter{action.parameter_schema?.fields?.length !== 1 ? "s" : ""}
                      </span>
                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
