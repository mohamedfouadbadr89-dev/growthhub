"use client";

import React from 'react';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { useDashboardData } from '@/lib/data/mock-data';

export default function SaaSPage() {
  const { metrics, chartData } = useDashboardData();

  return (
    <div className="space-y-8 animate-drift">
      <SectionHeader 
        title="SaaS Intelligence" 
        description="Monitor subscription growth, churn dynamic, and unit economics."
      />

      <FilterBar />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.saas.map((m, i) => (
          <MetricCard key={i} {...m} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
          title="Monthly Recurring Revenue (MRR)" 
          type="bar"
          data={chartData}
          dataKeys={[{ key: 'revenue', color: '#81ecff' }]}
        />
        <ChartCard 
          title="Average Revenue Per User (ARPU)" 
          type="bar"
          data={chartData}
          dataKeys={[{ key: 'ltv', color: 'rgba(229,226,225,0.4)' }]}
        />
      </div>
      
      <ChartCard 
        title="Predictive Subscription Growth" 
        type="area"
        data={chartData}
        dataKeys={[
          { key: 'revenue', color: '#81ecff' },
          { key: 'cac', color: '#ff716c' }
        ]}
      />
    </div>
  );
}

