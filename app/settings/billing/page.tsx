"use client";

import {
  Layers,
  CheckCircle2,
  LineChart,
  Wifi,
  Mail,
  Filter,
  Download,
  Wand2,
  ChevronDown,
} from "lucide-react";

const PLAN_FEATURES = ["Unlimited Executions", "Priority API Access", "Dedicated Support"];

const INVOICES = [
  { date: "Oct 12, 2023", id: "INV-2023-9021", amount: "$499.00" },
  { date: "Sep 12, 2023", id: "INV-2023-8412", amount: "$499.00" },
  { date: "Aug 12, 2023", id: "INV-2023-7655", amount: "$499.00" },
  { date: "Jul 12, 2023", id: "INV-2023-6821", amount: "$499.00" },
];

export default function BillingPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-2 font-body">
          Settings
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-sans">Billing &amp; Usage</h2>
      </div>

      {/* Bento Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 relative overflow-hidden flex flex-col border border-border shadow-sm">
          <div className="absolute top-0 right-0 p-8">
            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase font-body">
              Active
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
                Enterprise AI Core
              </h2>
              <p className="text-primary font-medium mt-1 font-body">
                $499.00 <span className="text-muted-foreground text-sm font-normal">/ month</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {PLAN_FEATURES.map((f) => (
              <div
                key={f}
                className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors"
              >
                <CheckCircle2 size={18} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground font-body">{f}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-4">
            <button className="px-8 py-3 bg-gradient-to-r from-primary to-[#2563eb] text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 font-body">
              Upgrade Plan
            </button>
            <button className="px-8 py-3 text-foreground font-semibold text-sm hover:bg-surface-container-low rounded-xl transition-all font-body">
              View Details
            </button>
          </div>
        </div>

        {/* System Utilization */}
        <div className="bg-white rounded-3xl p-8 flex flex-col border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-foreground font-bold text-lg font-sans">System Utilization</h3>
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

      {/* Bento Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Method */}
        <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-foreground font-bold text-lg font-sans">Payment Method</h3>
            <button className="text-primary text-sm font-bold hover:underline font-body">Change</button>
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

        {/* Billing History */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 flex flex-col border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-foreground font-bold text-lg font-sans">Billing History</h3>
            <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
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

      {/* Annual Billing Banner */}
      <div className="bg-gradient-to-r from-[#495c95] to-[#2563eb] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
            <Wand2 size={28} className="text-white" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-sans">Annual Billing is now available</h4>
            <p className="text-white/80 text-sm font-body">
              Switch to yearly payments and save up to 20% on your AI execution costs.
            </p>
          </div>
        </div>
        <button className="px-8 py-3 bg-white text-primary rounded-xl font-bold text-sm whitespace-nowrap hover:bg-primary/10 transition-colors font-body">
          Switch &amp; Save
        </button>
      </div>
    </div>
  );
}
