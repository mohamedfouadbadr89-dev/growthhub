"use client";

import React from 'react';
import { Card, ProgressBar, Text, Metric, Grid, Flex, Badge, BadgeDelta } from "@tremor/react";
import { PrecisionChart } from '@/components/dashboard/PrecisionChart';
import { useDashboardData } from '@/lib/data/mock-data';
import { Tv, TrendingUp, Download, Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ChannelPage() {
  const { chartData } = useDashboardData();

  const channels = [
    { title: 'META ADS', spend: '$14,290', revenue: '$42,870', roas: '3.0x', color: 'blue', progress: 72 },
    { title: 'GOOGLE ADS', spend: '$18,440', revenue: '$38,120', roas: '2.1x', color: 'cyan', progress: 45 },
    { title: 'TIKTOK ADS', spend: '$9,100', revenue: '$31,850', roas: '3.5x', color: 'rose', progress: 91 },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
         <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.25em]">
               <Tv className="w-4 h-4" strokeWidth={1.5} />
               <span>Performance Dynamics Matrix</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase italic underline decoration-primary decoration-8 underline-offset-10">
              Channel Matrix
            </h1>
            <p className="text-muted-foreground max-w-2xl text-[13px] font-bold mt-4 leading-relaxed uppercase tracking-tight">
               Real-time performance distribution across all acquisition matrices. Benchmarked against target ROAS coefficients.
            </p>
         </div>
         <div className="flex items-center gap-4">
            <button className="px-6 py-3 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl text-[11px] font-black text-muted-foreground hover:bg-slate-50 transition-all uppercase tracking-[0.2em] flex items-center gap-2">
               <Download className="w-5 h-5 text-primary" strokeWidth={1.5} /> Matrix Export
            </button>
            <button className="px-6 py-3 bg-primary text-white rounded-2xl text-[11px] font-black hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/30 uppercase tracking-[0.2em]">
               <Plus className="w-5 h-5" strokeWidth={1.5} /> Scale Engine
            </button>
         </div>
      </div>

      <Grid numItemsMd={2} numItemsLg={3} className="gap-10">
        {channels.map((ch, i) => (
          <Card key={i} className="p-10 bg-white border border-[#F1F5F9] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-0 rounded-2xl hover:scale-[1.02] transition-all duration-500 cursor-pointer group hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)]">
             <Flex className="mb-10">
                <Text className="text-[11px] font-black tracking-[0.25em] text-muted-foreground uppercase italic">{ch.title}</Text>
                <Badge color={ch.color} size="xs" className="font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-0 bg-slate-50 text-slate-600">Scaling</Badge>
             </Flex>
             
             <Grid numItems={2} className="gap-10 mb-12">
                <div className="space-y-1">
                   <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40 italic">Spend</Text>
                   <Metric className="text-3xl font-black tracking-tighter text-foreground decoration-primary/10 underline decoration-4 underline-offset-4">{ch.spend}</Metric>
                </div>
                <div className="space-y-1">
                   <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40 italic">Revenue</Text>
                   <Metric className="text-3xl font-black tracking-tighter text-foreground decoration-primary/10 underline decoration-4 underline-offset-4">{ch.revenue}</Metric>
                </div>
             </Grid>

             <div className="space-y-6 pt-10 border-t border-slate-50">
                <Flex>
                   <Text className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Efficiency Coefficient (ROAS)</Text>
                   <Text className={cn(
                      "text-sm font-black italic underline underline-offset-4 decoration-2",
                      parseFloat(ch.roas) >= 3 ? "text-emerald-600 decoration-emerald-200" : "text-amber-500 decoration-amber-200"
                   )}>{ch.roas}</Text>
                </Flex>
                <ProgressBar value={ch.progress} color={ch.color as any} className="h-3 rounded-full" />
                <Flex className="mt-4">
                   <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Performance Parity</Text>
                   <Text className="text-[11px] font-black text-foreground">{ch.progress}%</Text>
                </Flex>
             </div>
          </Card>
        ))}
      </Grid>

      <div className="pb-20">
         <PrecisionChart 
           title="Channel Revenue Attenuation" 
           subtitle="Daily metrics fluctuations across primary acquisition sources"
           type="area"
           data={chartData}
           categories={[
             { key: 'revenue', color: 'var(--primary)' },
             { key: 'cac', color: '#cbd5e1' }
           ]}
         />
      </div>
    </div>
  );
}
