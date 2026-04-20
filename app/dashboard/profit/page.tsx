"use client";

import { useState } from "react";
import { DollarSign, Package, Truck, Building2, MousePointerClick, ChevronRight, Plus, Download } from "lucide-react";

const KPI_CARDS = [
  {
    Icon: DollarSign,
    iconBg: "bg-primary/10", iconColor: "text-primary",
    badge: "+12.4%", badgeStyle: "text-emerald-600 bg-emerald-50",
    label: "Net Profit", value: "$42,904",
    barColor: "bg-primary", barWidth: "74%",
  },
  {
    Icon: Package,
    iconBg: "bg-orange-100", iconColor: "text-orange-600",
    badge: "-2.1%", badgeStyle: "text-red-600 bg-red-50",
    label: "COGS", value: "$12,450",
    barColor: "bg-orange-400", barWidth: "28%",
  },
  {
    Icon: Truck,
    iconBg: "bg-blue-100", iconColor: "text-blue-600",
    badge: "+4.2%", badgeStyle: "text-emerald-600 bg-emerald-50",
    label: "Shipping", value: "$3,102",
    barColor: "bg-blue-400", barWidth: "15%",
  },
  {
    Icon: Building2,
    iconBg: "bg-purple-100", iconColor: "text-purple-600",
    badge: "0.0%", badgeStyle: "text-muted-foreground bg-surface-container-high",
    label: "Fees", value: "$1,980",
    barColor: "bg-purple-400", barWidth: "10%",
  },
  {
    Icon: MousePointerClick,
    iconBg: "bg-rose-100", iconColor: "text-rose-600",
    badge: "-8.5%", badgeStyle: "text-red-600 bg-red-50",
    label: "Ad Spend", value: "$8,650",
    barColor: "bg-rose-400", barWidth: "22%",
  },
];

const CHART_BARS = [
  { revenue: "60%", profit: "10%" },
  { revenue: "75%", profit: "15%" },
  { revenue: "65%", profit: "20%" },
  { revenue: "85%", profit: "5%" },
  { revenue: "70%", profit: "25%" },
  { revenue: "95%", profit: "12%" },
  { revenue: "80%", profit: "8%" },
];

const CHART_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BREAKDOWN_LEGEND = [
  { dot: "bg-primary",       label: "Net Profit", value: "$42.9k" },
  { dot: "bg-orange-400",    label: "COGS",       value: "$12.4k" },
  { dot: "bg-blue-400",      label: "Shipping",   value: "$3.1k" },
  { dot: "bg-surface-container-high", label: "Other", value: "$10.6k" },
];

const TRANSACTIONS = [
  {
    Icon: DollarSign,
    iconColor: "text-primary",
    title: "Premium Subscription Plan - Batch 402",
    subtitle: "Platform: Stripe Checkout • 14:20 PM",
    col1Label: "Revenue",    col1Value: "+$12,400.00", col1Style: "text-foreground",
    col2Label: "Profit Share", col2Value: "+$8,920.00", col2Style: "text-emerald-600",
  },
  {
    Icon: MousePointerClick,
    iconColor: "text-rose-500",
    title: "Meta Ads - Retargeting Campaign Q3",
    subtitle: "Marketing • 11:05 AM",
    col1Label: "Ad Spend",       col1Value: "-$4,200.00", col1Style: "text-foreground",
    col2Label: "Impact on Profit", col2Value: "-12.5%",   col2Style: "text-rose-500",
  },
  {
    Icon: Package,
    iconColor: "text-blue-500",
    title: "Bulk Inventory Inbound - Electronics",
    subtitle: "Supply Chain • 09:15 AM",
    col1Label: "COGS Offset",  col1Value: "-$1,840.00", col1Style: "text-foreground",
    col2Label: "Unit Margin",  col2Value: "62%",        col2Style: "text-foreground",
  },
];

const CHART_TABS = ["Daily", "Weekly", "Monthly"];

export default function ProfitPage() {
  const [activeTab, setActiveTab] = useState("Daily");

  return (
    <div className="space-y-10">
      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {KPI_CARDS.map((c) => (
          <div
            key={c.label}
            className="bg-white p-6 rounded-xl shadow-sm border border-transparent hover:border-primary/20 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${c.iconBg} rounded-lg ${c.iconColor}`}>
                <c.Icon size={20} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full font-body ${c.badgeStyle}`}>
                {c.badge}
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1 font-body">{c.label}</p>
            <h3 className="text-2xl font-extrabold text-foreground font-sans">{c.value}</h3>
            <div className="mt-4 h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className={`h-full ${c.barColor} rounded-full`} style={{ width: c.barWidth }} />
            </div>
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profit Breakdown Donut */}
        <div className="lg:col-span-5 bg-white p-8 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-lg font-bold text-foreground font-sans tracking-tight">Profit Breakdown</h4>
            <button className="text-primary text-sm font-semibold hover:underline font-body">View Details</button>
          </div>

          <div className="relative flex justify-center items-center py-10">
            <div className="w-64 h-64 rounded-full border-20 border-surface-container-high relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-20 border-primary border-r-transparent border-b-transparent rotate-45" />
              <div className="absolute inset-0 rounded-full border-20 border-orange-400 border-l-transparent border-t-transparent border-r-transparent -rotate-12" />
              <div className="text-center">
                <span className="text-sm font-medium text-muted-foreground block font-body">Margin</span>
                <span className="text-4xl font-black text-foreground font-sans">54%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-6 mt-10 border-t border-border pt-8">
            {BREAKDOWN_LEGEND.map((l) => (
              <div key={l.label} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${l.dot}`} />
                <div>
                  <p className="text-xs text-muted-foreground font-medium font-body">{l.label}</p>
                  <p className="text-sm font-bold text-foreground font-sans">{l.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit vs Revenue Chart */}
        <div className="lg:col-span-7 bg-white p-8 rounded-xl shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-lg font-bold text-foreground font-sans tracking-tight">Profit vs Revenue</h4>
              <p className="text-sm text-muted-foreground font-body">Comparative performance trend</p>
            </div>
            <div className="flex gap-2 bg-surface-container-high rounded-lg p-1">
              {CHART_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-all font-body ${
                    activeTab === t
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full relative flex items-end justify-between gap-4 py-10 min-h-[300px]">
            <div className="flex-1 h-full flex items-end justify-between px-4 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border-t border-border/40 w-full h-0" />
                ))}
              </div>
              <div className="group relative w-full h-full flex items-end gap-2">
                {CHART_BARS.map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/5 rounded-t hover:bg-primary/10 transition-all flex flex-col justify-end"
                    style={{ height: bar.revenue }}
                  >
                    <div
                      className="w-full h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(0,91,196,0.3)]"
                      style={{ marginBottom: bar.profit }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-14 text-xs font-bold text-muted-foreground font-body">
            {CHART_DAYS.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="mt-10 flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-primary rounded-full" />
              <span className="text-xs font-semibold text-foreground font-body">Revenue ($142,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-primary/20 rounded-full" />
              <span className="text-xs font-semibold text-foreground font-body">Net Profit ($42,900)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Profit Influencers */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-bold text-foreground font-sans tracking-tight">Recent Profit Influencers</h4>
          <button className="px-4 py-2 text-sm font-bold text-primary hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-2 font-body">
            <Download size={14} /> Download Audit Report
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {TRANSACTIONS.map((tx) => (
            <div
              key={tx.title}
              className="bg-surface-container-low hover:bg-surface-container-high transition-all p-5 rounded-xl flex items-center justify-between group"
            >
              <div className="flex items-center gap-6">
                <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center ${tx.iconColor} shadow-sm`}>
                  <tx.Icon size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-foreground font-sans">{tx.title}</h5>
                  <p className="text-xs text-muted-foreground font-medium font-body">{tx.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium font-body">{tx.col1Label}</p>
                  <p className={`text-sm font-bold font-body ${tx.col1Style}`}>{tx.col1Value}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium font-body">{tx.col2Label}</p>
                  <p className={`text-sm font-extrabold font-body ${tx.col2Style}`}>{tx.col2Value}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAB */}
      <button className="fixed bottom-10 right-10 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group">
        <Plus size={24} className="group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
}
