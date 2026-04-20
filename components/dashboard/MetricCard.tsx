"use client";

import React from 'react';
import { Card, Metric, Text, Flex } from "@tremor/react";
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
}

export function MetricCard({ title, value, trend, trendType, icon: Icon }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="precision-card p-8 rounded-2xl relative overflow-hidden group">
        <Flex alignItems="start" justifyContent="between">
          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/5">
                   <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.15em] font-body">
                  {title}
                </span>
             </div>
             
             <div className="space-y-2">
                <Metric className="text-4xl font-extrabold tracking-tighter text-foreground font-sans">
                  {value}
                </Metric>
                <div className="flex items-center gap-2">
                   <div className={cn(
                     "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-body",
                     trendType === 'up' ? "bg-emerald-50 text-emerald-600" : 
                     trendType === 'down' ? "bg-rose-50 text-rose-600" : 
                     "bg-slate-50 text-slate-500"
                   )}>
                      <span className="leading-none">{trend}</span>
                   </div>
                   <span className="text-[11px] font-medium text-muted-foreground font-body">vs baseline</span>
                </div>
             </div>
          </div>
          
          <div className="w-1.5 h-12 bg-primary/20 rounded-full mt-2 group-hover:h-16 group-hover:bg-primary transition-all duration-500" />
        </Flex>
      </Card>
    </motion.div>
  );
}