"use client";

import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';

interface PrecisionChartProps {
  title: string;
  subtitle?: string;
  data: any[];
  categories: { key: string; color: string; gradient?: boolean }[];
  type?: 'area' | 'bar';
  className?: string;
}

export function PrecisionChart({
  title,
  subtitle,
  data,
  categories,
  type = 'area',
  className
}: PrecisionChartProps) {
  return (
    <div className={cn(
      "p-8 bg-white border border-border shadow-modern-saas rounded-2xl h-full flex flex-col gap-10 group transition-all duration-500 hover:shadow-[0_24px_48px_rgba(5,52,92,0.08)]",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
           <h3 className="text-[18px] font-extrabold tracking-tight text-foreground font-sans">{title}</h3>
           {subtitle && <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] font-body">{subtitle}</p>}
        </div>
        <button className="p-2 hover:bg-primary/5 rounded-xl transition-all">
           <MoreHorizontal className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-all" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 w-full min-h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                {categories.map((cat) => (
                  <linearGradient key={cat.key} id={`grad-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cat.color === '#005bc4' ? '#005bc4' : cat.color} stopOpacity={0.16} />
                    <stop offset="95%" stopColor={cat.color === '#005bc4' ? '#005bc4' : cat.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(145, 180, 228, 0.2)" strokeDasharray="4 4" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e9eb7', fontSize: 10, fontWeight: 700 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e9eb7', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ stroke: '#005bc4', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid rgba(145, 180, 228, 0.4)',
                  borderRadius: '12px',
                  boxShadow: '0 20px 40px rgba(5,52,92,0.1)',
                  padding: '16px'
                }}
                itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#05345c' }}
                labelStyle={{ fontSize: '10px', color: '#8e9eb7', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}
              />
              {categories.map((cat) => (
                <Area
                  key={cat.key}
                  type="monotone"
                  dataKey={cat.key}
                  stroke={cat.color === '#005bc4' ? '#005bc4' : cat.color}
                  strokeWidth={4}
                  fillOpacity={1}
                  fill={`url(#grad-${cat.key})`}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#005bc4' }}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} barSize={32}>
              <defs>
                 {categories.map((cat) => (
                  <linearGradient key={cat.key} id={`bar-grad-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cat.color === '#005bc4' ? '#005bc4' : cat.color} stopOpacity={1} />
                    <stop offset="100%" stopColor={cat.color === '#005bc4' ? '#005bc4' : '#4388fd'} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(145, 180, 228, 0.2)" strokeDasharray="0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e9eb7', fontSize: 10, fontWeight: 700 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#8e9eb7', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: '#f8f9ff' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid rgba(145, 180, 228, 0.4)',
                  borderRadius: '12px'
                }}
              />
              {categories.map((cat) => (
                <Bar
                  key={cat.key}
                  dataKey={cat.key}
                  fill={`url(#bar-grad-${cat.key})`}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
