import { useMemo } from 'react';

export interface Metric {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  prefix?: string;
  suffix?: string;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  roas: number;
  cac: number;
  ltv: number;
  [key: string]: string | number;
}

export interface TableRow {
  id: string;
  [key: string]: any;
}

export const MOCK_CHART_DATA: ChartDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2024-03-${String(i + 1).padStart(2, '0')}`,
  revenue: 4000 + Math.random() * 2000,
  roas: 2.5 + Math.random() * 1.5,
  cac: 45 + Math.random() * 10,
  ltv: 120 + Math.random() * 20,
}));

export const MOCK_METRICS: Record<string, Metric[]> = {
  overview: [
    { label: 'Revenue', value: '142,580', change: 8.2, trend: 'up' as const, prefix: '$' },
    { label: 'ROAS', value: '3.8', change: -0.4, trend: 'down' as const, suffix: 'x' },
    { label: 'Spend', value: '37,521', change: 0, trend: 'neutral' as const, prefix: '$' },
    { label: 'Growth Rating', value: '92', change: 12.4, trend: 'up' as const, suffix: '%' },
  ],
  saas: [
    { label: 'MRR', value: '45,000', change: 5.2, trend: 'up' as const, prefix: '$' },
    { label: 'Churn Rate', value: '2.4%', change: -0.5, trend: 'up' as const },
    { label: 'ARPU', value: '85.00', change: 1.2, trend: 'up' as const, prefix: '$' },
    { label: 'Active Subs', value: '1,240', change: 3.4, trend: 'up' as const },
  ],
};

export const MOCK_CHANNELS: TableRow[] = [
  { id: '1', channel: 'Facebook Ads', spend: 12400, revenue: 42300, roas: 3.41, status: 'Scaling' },
  { id: '2', channel: 'Google Search', spend: 8500, revenue: 38200, roas: 4.49, status: 'Stable' },
  { id: '3', channel: 'TikTok Ads', spend: 9200, revenue: 21400, roas: 2.32, status: 'At Risk' },
  { id: '4', channel: 'Email Marketing', spend: 2800, revenue: 40600, roas: 14.5, status: 'Efficient' },
];


export const MOCK_CREATIVES: TableRow[] = [
  { id: '1', name: 'Summer_Sale_V1', spend: 1200, ctr: '2.4%', roas: 3.1, hook_rate: '28%' },
  { id: '2', name: 'Product_Demo_Final', spend: 850, ctr: '1.8%', roas: 2.4, hook_rate: '22%' },
  { id: '3', name: 'UGC_Testimonial_01', spend: 2400, ctr: '3.1%', roas: 4.2, hook_rate: '35%' },
];

export function useDashboardData() {
  return useMemo(() => ({
    chartData: MOCK_CHART_DATA,
    metrics: MOCK_METRICS,
    channels: MOCK_CHANNELS,
    creatives: MOCK_CREATIVES,
  }), []);
}

export function useFilters() {
  return {
    dateRange: { from: '2024-03-01', to: '2024-03-31' },
    channels: ['All'],
  };
}
