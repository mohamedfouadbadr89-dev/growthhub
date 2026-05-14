"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Layers,
  CheckCircle2,
  LineChart,
  Wifi,
  Mail,
  Filter,
  Download, RefreshCw,
  Wand2,
  ChevronDown,
  Key,
  Trash2,
  Save,
} from "lucide-react";
import { apiClient, ApiError, formatErrorMessage } from "@/lib/api-client";

// Phase 7 Sub-pass B (continuation #19, 2026-05-09): wired to canonical
// `GET /api/v1/billing/plan`, `PATCH /api/v1/billing/plan`,
// `POST /api/v1/billing/byok`, `DELETE /api/v1/billing/byok`. Frontend
// consumes the canonical envelope via api-client auto-unwrap (Sub-pass B
// continuation #13).
//
// Sections that remain MOCKED-DEFERRED per holistic governance recommendation:
//   - PLAN_FEATURES list           → no plan-catalogue endpoint
//   - Plan price ("$499.00/month") → no pricing catalogue
//   - "Upgrade Plan" / "View Details" buttons → Stripe checkout-session
//     creation is forward-positioned for a future pass (no Stripe outbound
//     API in A1c); wiring this button to PATCH /plan would lie about
//     behavior (it would only flip plan_type enum, not actually upgrade).
//   - System Utilization widget   → no monthly-spend aggregation endpoint
//   - INVOICES table              → no invoices endpoint
//   - Payment Method card display → no Stripe payment-method API wiring
//   - Annual billing banner       → no annual-plan logic

const PLAN_FEATURES = ["Unlimited Executions", "Priority API Access", "Dedicated Support"];

const INVOICES = [
  { date: "Oct 12, 2023", id: "INV-2023-9021", amount: "$499.00" },
  { date: "Sep 12, 2023", id: "INV-2023-8412", amount: "$499.00" },
  { date: "Aug 12, 2023", id: "INV-2023-7655", amount: "$499.00" },
  { date: "Jul 12, 2023", id: "INV-2023-6821", amount: "$499.00" },
];

interface BillingState {
  org_id: string;
  plan_type: string;        // 'subscription' | 'ltd'
  credits_balance: number;
  has_byok_key: boolean;
}

function planLabel(planType: string): string {
  if (planType === "ltd") return "Lifetime Deal";
  if (planType === "subscription") return "Subscription Plan";
  return planType;
}

function planSubtitle(planType: string): string {
  if (planType === "ltd") return "Lifetime access — BYOK required for AI features";
  if (planType === "subscription") return "Active subscription — credits-based AI execution";
  return "";
}

export default function BillingPage() {
  const { getToken } = useAuth();

  const [billing,    setBilling]    = useState<BillingState | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  const [byokInput,    setByokInput]    = useState("");
  const [byokSaving,   setByokSaving]   = useState(false);
  const [byokDeleting, setByokDeleting] = useState(false);
  const [byokError,    setByokError]    = useState<string | null>(null);

  const [upgrading,    setUpgrading]    = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  // Continuation #97 (2026-05-12) — data-freshness indicator extended to
  // settings billing (eighth volatility-sensitive cockpit surface after
  // #90/#91/#92/#93/#94/#95/#96). Billing state changes via Stripe webhook
  // events (plan_type transitions on subscription.created, credits_balance
  // changes on invoice.paid / refund / RPC writes); operators don't
  // directly trigger these so a freshness indicator helps them judge
  // whether the displayed credits + plan reflect the latest webhook.
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  function relUpdated(): string {
    if (lastUpdatedAt === null) return "—";
    const ms = nowTick - lastUpdatedAt;
    if (ms < 60_000) return "just now";
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const data = await apiClient<BillingState>("/api/v1/billing/plan", token);
      setBilling(data);
      setLastUpdatedAt(Date.now());
    } catch (err) {
      // Continuation #35: formatErrorMessage surfaces ApiError.requestId
      // (from #34) so operators can quote it to support for backend log pivot.
      setLoadError(formatErrorMessage(err, "Failed to load billing state"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveByok() {
    if (byokSaving) return;
    setByokError(null);
    const trimmed = byokInput.trim();
    if (!trimmed) {
      setByokError("Enter your OpenRouter API key");
      return;
    }
    setByokSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      await apiClient<{ org_id: string; has_byok_key: boolean }>(
        "/api/v1/billing/byok",
        token,
        { method: "POST", body: JSON.stringify({ openrouter_key: trimmed }) },
      );
      setByokInput("");
      await load();
    } catch (err) {
      setByokError(formatErrorMessage(err, "Failed to save BYOK key"));
    } finally {
      setByokSaving(false);
    }
  }

  // Phase 7 Sub-pass D (continuation #21, 2026-05-09) — Stripe Checkout.
  // Reads the configured Stripe price id from
  // `NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID`. Operators populate this env at
  // build time with a Stripe Price id (price_xxx) created in the Stripe
  // Dashboard. If unset, the button shows a helpful error rather than
  // silently failing. NO pricing logic in code — Stripe Price metadata
  // (`credits_to_grant`) drives credit allocation server-side via the
  // existing webhook.
  async function handleUpgrade() {
    if (upgrading) return;
    setUpgradeError(null);

    const priceId = process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID;
    if (!priceId) {
      setUpgradeError(
        "Stripe Price not configured (NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID env var). Contact your operator.",
      );
      return;
    }

    setUpgrading(true);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      const result = await apiClient<{ checkout_url: string; session_id: string }>(
        "/api/v1/billing/checkout",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            price_id: priceId,
            mode: "subscription",
          }),
        },
      );
      // Redirect to Stripe-hosted Checkout. On success, Stripe redirects
      // back to /settings/billing?checkout=success and emits webhook
      // events the inbound handler consumes for subscription state +
      // optional credit grant.
      window.location.href = result.checkout_url;
    } catch (err) {
      setUpgradeError(formatErrorMessage(err, "Failed to start checkout"));
      setUpgrading(false);
    }
  }

  async function handleRemoveByok() {
    if (byokDeleting) return;
    setByokError(null);
    setByokDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new ApiError(401, "Sign in required");
      await apiClient<{ org_id: string; has_byok_key: boolean }>(
        "/api/v1/billing/byok",
        token,
        { method: "DELETE" },
      );
      await load();
    } catch (err) {
      setByokError(formatErrorMessage(err, "Failed to remove BYOK key"));
    } finally {
      setByokDeleting(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
            Settings
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-sans">Billing &amp; Usage</h2>
        </div>
        {/* Continuation #67 (2026-05-12) — Refresh button completes cockpit
            coverage on every wired top-level surface. Re-fires the existing
            `load()` callback (which BYOK save/delete already invoke).
            Continuation #97 added freshness indicator beside it. */}
        <div className="flex items-center gap-3">
          {lastUpdatedAt !== null && (
            <span className="text-[11px] text-muted-foreground font-body">
              Updated <span className="font-bold text-foreground">{relUpdated()}</span>
            </span>
          )}
          <button
            onClick={() => void load()}
            disabled={loading}
            title="Refresh — re-poll billing state"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-surface-container-low text-foreground hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-body"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-body rounded-lg px-4 py-3">
          {loadError}
        </div>
      )}

      {/* Bento Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan — wired to GET /billing/plan */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 relative overflow-hidden flex flex-col border border-border shadow-sm">
          <div className="absolute top-0 right-0 p-8">
            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase font-body">
              {loading ? "Loading…" : "Active"}
            </span>
          </div>
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0">
              <Layers size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1 font-body">
                Current Plan
              </h3>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tighter font-sans">
                {loading ? "—" : billing ? planLabel(billing.plan_type) : "—"}
              </h2>
              <p className="text-primary font-medium mt-1 font-body">
                {loading
                  ? "—"
                  : billing
                    ? `${billing.credits_balance.toLocaleString()} credits available`
                    : "—"}
                {!loading && billing && (
                  <span className="text-muted-foreground text-sm font-normal block mt-0.5">
                    {planSubtitle(billing.plan_type)}
                  </span>
                )}
              </p>
            </div>
          </div>
          {/* Plan features — MOCKED-DEFERRED (no plan-catalogue endpoint).
              Continuation #82 (2026-05-12) — feature list is hardcoded
              ("Unlimited Executions" etc.) with no source of truth.
              Sample-marker added inline above the feature grid. */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            <span className="text-[11px] text-muted-foreground font-body">Feature catalogue pending</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 opacity-70">
            {PLAN_FEATURES.map((f) => (
              <div
                key={f}
                className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl"
              >
                <CheckCircle2 size={18} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground font-body">{f}</span>
              </div>
            ))}
          </div>
          {/* Upgrade Plan — wired to POST /billing/checkout (Stripe outbound) */}
          <div className="mt-auto flex items-center gap-4">
            <button
              onClick={handleUpgrade}
              disabled={upgrading || loading}
              className="px-8 py-3 bg-gradient-to-r from-primary to-[#2563eb] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 font-body disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {upgrading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Redirecting…</span>
                </>
              ) : (
                <span>Upgrade Plan</span>
              )}
            </button>
            {/* Continuation #82 — View Details button had no handler;
                no plan-catalogue endpoint to navigate to. Disabled. */}
            <button
              disabled
              title="Plan details pending"
              className="px-8 py-3 text-muted-foreground font-semibold text-sm rounded-xl font-body opacity-50 cursor-not-allowed"
            >
              View Details
            </button>
          </div>
          {upgradeError && (
            <p className="mt-3 text-xs text-red-600 font-body">{upgradeError}</p>
          )}
        </div>

        {/* System Utilization — MOCKED-DEFERRED (no monthly-spend
            aggregation endpoint). Continuation #81 (2026-05-12) — Sample
            marker added matching the #76/#78/#79/#80 honesty pattern;
            $320 / $500 / "+34% vs last month" are fabricated. */}
        <div className="bg-white rounded-3xl p-8 flex flex-col border border-border shadow-sm opacity-70">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-bold text-lg font-sans">System Utilization</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            </div>
            <LineChart size={20} className="text-muted-foreground" />
          </div>
          <div className="mb-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest font-body">
                  Spent this month
                </p>
                <p className="text-3xl font-bold text-foreground font-sans">$320.00</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest font-body">
                  Monthly Limit
                </p>
                <p className="text-xl font-semibold text-muted-foreground font-sans">$500.00</p>
              </div>
            </div>
            <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "64%" }} />
            </div>
            <p className="mt-3 text-sm font-semibold text-primary font-body">64% Utilized</p>
          </div>
          <div className="space-y-4 pt-6 border-t border-surface-container-high">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-body">Avg. Daily Run</span>
              <span className="font-bold text-foreground font-body">$10.32</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-body">Projected Spend</span>
              <span className="font-bold text-foreground font-body">$415.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Row 1.5 — BYOK section (wired to POST/DELETE /billing/byok) */}
      <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
        <div className="flex items-start gap-6 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0">
            <Key size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-foreground font-bold text-lg font-sans">Bring Your Own Key (OpenRouter)</h3>
            <p className="text-sm text-muted-foreground font-body mt-1">
              Lifetime Deal users must provide their own OpenRouter API key. Subscription users may optionally connect
              a key to bypass the platform credits flow. Keys are stored encrypted in Supabase Vault and never returned.
            </p>
          </div>
        </div>

        {byokError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-body rounded-lg px-4 py-2 mb-4">
            {byokError}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground font-body">Loading…</div>
        ) : billing?.has_byok_key ? (
          <div className="flex items-center justify-between gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900 font-body">OpenRouter key connected</p>
                <p className="text-xs text-emerald-700 font-body">
                  AI calls bypass platform credits and bill to your OpenRouter account.
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveByok}
              disabled={byokDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-60 font-body"
            >
              {byokDeleting ? (
                <>
                  <span className="w-3 h-3 border-2 border-red-300 border-t-red-700 rounded-full animate-spin" />
                  <span>Removing…</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Remove key</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="password"
              value={byokInput}
              onChange={(e) => setByokInput(e.target.value)}
              placeholder="sk-or-v1-…"
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface-container-low text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono"
              autoComplete="off"
            />
            <button
              onClick={handleSaveByok}
              disabled={byokSaving || byokInput.trim().length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-[#2563eb] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 font-body"
            >
              {byokSaving ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save key</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bento Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Method — MOCKED-DEFERRED (no Stripe payment-method API
            wiring). Continuation #81 (2026-05-12) — Sample marker added;
            "Alexander Wright VISA 4242" is fabricated card data. The
            "Change" button is also non-functional (no payment-method
            management endpoint); now disabled. */}
        <div className="bg-white rounded-3xl p-8 border border-border shadow-sm opacity-70">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-bold text-lg font-sans">Payment Method</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            </div>
            <button
              disabled
              title="Payment-method management pending"
              className="text-muted-foreground text-sm font-bold opacity-50 cursor-not-allowed font-body"
            >
              Change
            </button>
          </div>

          {/* Credit Card */}
          <div className="w-full aspect-[1.586/1] bg-gradient-to-br from-[#191c1e] to-[#434655] rounded-2xl p-6 text-white relative shadow-2xl overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="relative h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <Wifi size={32} className="text-white/40" />
                <div className="text-right">
                  <p className="text-[8px] uppercase tracking-[0.2em] font-black text-white/50 font-body">
                    Cognitive Core
                  </p>
                  <p className="italic font-serif text-lg leading-none">VISA</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl tracking-[0.15em] font-medium font-mono">•••• •••• •••• 4242</p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-[8px] uppercase text-white/50 mb-0.5 font-body">Expires</p>
                    <p className="text-xs font-mono">12 / 26</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase text-white/50 mb-0.5 font-body">Holder</p>
                    <p className="text-xs uppercase tracking-wider font-body">Alexander Wright</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-xl">
            <Mail size={16} className="text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground font-body">
              Invoices sent to: finance@execution.ai
            </span>
          </div>
        </div>

        {/* Billing History — MOCKED-DEFERRED (no invoices endpoint).
            Continuation #81 (2026-05-12) — Sample marker added; the
            displayed rows are fabricated invoice history. Filter button
            also disabled (no real filter endpoint). */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 flex flex-col border border-border shadow-sm opacity-70">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground font-bold text-lg font-sans">Billing History</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            </div>
            <button
              disabled
              title="Filter pending — invoices endpoint not wired"
              className="p-2 text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <Filter size={18} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-surface-container-high">
                <tr>
                  {["Date", "Invoice ID", "Amount", "Status", ""].map((h, i) => (
                    <th
                      key={i}
                      className={`pb-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-body ${i === 4 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/50">
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-5 text-sm font-medium text-foreground font-body">{inv.date}</td>
                    <td className="py-5 text-sm font-mono text-muted-foreground">{inv.id}</td>
                    <td className="py-5 text-sm font-bold text-foreground font-body">{inv.amount}</td>
                    <td className="py-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 font-body">
                        <span className="w-1 h-1 bg-emerald-600 rounded-full mr-1.5" /> Paid
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all">
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-auto pt-6 flex justify-center">
            <button className="text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 font-body">
              Load more activity <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Annual Billing Banner — MOCKED-DEFERRED (no annual-plan logic).
          Continuation #82 (2026-05-12) — entire banner marked Sample;
          annual-plan upgrade isn't wired (no annual plan in the Stripe
          catalogue per Phase 7 closure state). "Switch & Save" CTA
          disabled with explanatory tooltip. */}
      <div className="bg-gradient-to-r from-[#495c95] to-[#2563eb] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 opacity-70">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
            <Wand2 size={28} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-xl font-bold font-sans">Annual Billing is now available</h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-body">Sample</span>
            </div>
            <p className="text-white/80 text-sm font-body">
              Annual plan pending — monthly plans only via current Stripe checkout.
            </p>
          </div>
        </div>
        <button
          disabled
          title="Annual plan pending"
          className="px-8 py-3 bg-white/40 text-white/70 rounded-xl font-bold text-sm whitespace-nowrap font-body cursor-not-allowed"
        >
          Switch &amp; Save
        </button>
      </div>
    </div>
  );
}
