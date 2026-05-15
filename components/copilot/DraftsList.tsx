"use client";

// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 9.
// Renders the operator's saved Copilot drafts from localStorage.
// Each row supports: load (returns the full draft to parent),
// duplicate, delete. Lightweight — list view only.

import { useEffect, useState } from "react";
import { FileText, Copy, Trash2, Inbox, Clock } from "lucide-react";
import {
  listDrafts, getDraft, deleteDraft, duplicateDraft,
  type CopilotDraft, type CopilotDraftSummary,
} from "@/lib/copilot-drafts";

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export interface DraftsListProps {
  /** Called when operator clicks "Load" on a draft */
  onLoad: (draft: CopilotDraft) => void;
  /** Increments to force a re-read from localStorage after parent saves */
  reloadKey?: number;
}

export function DraftsList({ onLoad, reloadKey = 0 }: DraftsListProps) {
  const [drafts, setDrafts] = useState<CopilotDraftSummary[]>([]);

  // Re-read localStorage when reloadKey bumps (parent signals save/delete).
  // Reading localStorage inside useEffect is the canonical pattern for
  // browser-only state — must run after mount to avoid SSR hydration
  // mismatches. The `set-state-in-effect` rule blocks direct setState
  // here; this is the intended escape for client-only initialization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDrafts(listDrafts()); }, [reloadKey]);

  if (drafts.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-xl p-6 text-center">
        <Inbox size={20} className="text-muted-foreground mx-auto mb-2" />
        <p className="text-xs font-body text-muted-foreground">
          Saved drafts will appear here.
        </p>
      </div>
    );
  }

  function handleLoad(id: string) {
    const d = getDraft(id);
    if (d) onLoad(d);
  }
  function handleDuplicate(id: string) {
    duplicateDraft(id);
    setDrafts(listDrafts());
  }
  function handleDelete(id: string) {
    deleteDraft(id);
    setDrafts(listDrafts());
  }

  return (
    <ul className="space-y-2">
      {drafts.map((d) => (
        <li
          key={d.id}
          className="bg-white border border-border/40 rounded-xl p-3 hover:border-primary/20 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => handleLoad(d.id)}
              className="flex-1 text-left min-w-0 group"
              title="Load this draft into the editor"
            >
              <h4 className="font-sans font-bold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                <FileText size={11} className="inline mr-1.5 -mt-0.5 text-muted-foreground" />
                {d.name}
              </h4>
              <p className="text-[11px] font-body text-muted-foreground line-clamp-1 mt-0.5">
                {d.description}
              </p>
              <p className="text-[10px] font-body text-muted-foreground mt-1 inline-flex items-center gap-1">
                <Clock size={9} />
                {relTime(d.updated_at)} · {d.step_count} step{d.step_count === 1 ? "" : "s"}
              </p>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleDuplicate(d.id)}
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-surface-container-low rounded-md transition-colors"
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-surface-container-low rounded-md transition-colors"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
