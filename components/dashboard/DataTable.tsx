import React from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  columns: { header: string; accessor: string; cell?: (row: any) => React.ReactNode }[];
  data: any[];
  className?: string;
}

export function DataTable({ columns, data, className }: DataTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-sm bg-surface-container-low", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-surface-container-highest/20">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/30">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="">
            {data.map((row, i) => (
              <tr key={i} className={cn(
                "hover:bg-surface-container-high/50 transition-colors group",
                i % 2 === 1 && "bg-surface-container-highest/5"
              )}>
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4 text-[13px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

