"use client";

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
  Cell
} from 'recharts';

interface ChartCardProps {
  title: string;
  type?: 'area' | 'bar';
  children?: ReactNode;
  data?: any[];
  dataKeys?: { key: string; color: string }[];
  className?: string;
  height?: number;
}

export function ChartCard({
  title,
  type = 'bar',
  children,
  data,
  dataKeys,
  className,
  height = 300
}: ChartCardProps) {
  return (
    <div className={cn(
      "p-8 bg-white border border-border rounded-2xl shadow-elevated h-full flex flex-col gap-10 transition-all duration-500 hover:shadow-xl",
      className
    )}>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-black italic tracking-tighter text-foreground uppercase">{title}</h3>
        <div className="flex items-center gap-4">
           {dataKeys?.map((dk, idx) => (
             <div key={idx} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dk.color }} />
                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{dk.key}</span>
             </div>
           ))}
        </div>
      </div>
      <div className="flex-1 min-h-0" style={{ height }}>
        {children ? children : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                   {dataKeys?.map((dk) => (
                    <linearGradient key={dk.key} id={`fade${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={dk.color} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={dk.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}
                />
                {dataKeys?.map((dk) => (
                  <Area
                    key={dk.key}
                    type="monotone"
                    dataKey={dk.key}
                    stroke={dk.color}
                    strokeWidth={4}
                    fillOpacity={1}
                    fill={`url(#fade${dk.key})`}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={38}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)'
                  }}
                />
                {dataKeys?.map((dk) => (
                  <Bar
                    key={dk.key}
                    dataKey={dk.key}
                    fill={dk.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}



