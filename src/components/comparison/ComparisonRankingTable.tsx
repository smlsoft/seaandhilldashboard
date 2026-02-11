'use client';

import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComparisonRankingMetric {
  label: string;
  value: number;
  formattedValue: string;
  higherIsBetter?: boolean;
}

export interface ComparisonRankingItem {
  branchKey: string;
  branchName: string;
  metrics: ComparisonRankingMetric[];
}

interface ComparisonRankingTableProps {
  title: string;
  description?: string;
  data: ComparisonRankingItem[];
  sortByMetric?: number; // index of the metric to sort by, defaults to 0
}

const RANK_BADGES = [
  { icon: Trophy, bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  { icon: Award, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  { icon: Medal, bg: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-200' },
];

export default function ComparisonRankingTable({
  title,
  description,
  data,
  sortByMetric = 0,
}: ComparisonRankingTableProps) {
  // Sort by the primary metric (descending by default)
  const sorted = [...data].sort((a: ComparisonRankingItem, b: ComparisonRankingItem) => {
    const aVal = a.metrics[sortByMetric]?.value ?? 0;
    const bVal = b.metrics[sortByMetric]?.value ?? 0;
    const higherIsBetter = a.metrics[sortByMetric]?.higherIsBetter !== false; // default true
    return higherIsBetter ? bVal - aVal : aVal - bVal;
  });

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-gray-500 font-medium w-12">อันดับ</th>
              <th className="text-left py-2 px-3 text-gray-500 font-medium">กิจการ</th>
              {sorted[0]?.metrics.map((m: ComparisonRankingMetric, i: number) => (
                <th key={i} className="text-right py-2 px-3 text-gray-500 font-medium">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item: ComparisonRankingItem, index: number) => {
              const badge = RANK_BADGES[index];
              const BadgeIcon = badge?.icon;
              return (
                <tr
                  key={item.branchKey}
                  className={cn(
                    "border-b border-gray-50 last:border-0",
                    index < 3 && "font-medium"
                  )}
                >
                  <td className="py-2.5 px-3">
                    {badge && BadgeIcon ? (
                      <div className={cn(
                        "inline-flex items-center justify-center w-7 h-7 rounded-full border",
                        badge.bg, badge.text, badge.border
                      )}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 text-gray-400 text-xs font-medium">
                        {index + 1}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={cn(
                      "truncate block max-w-[200px]",
                      index < 3 ? "text-gray-800" : "text-gray-600"
                    )} title={item.branchName}>
                      {item.branchName}
                    </span>
                  </td>
                  {item.metrics.map((m: ComparisonRankingMetric, i: number) => (
                    <td key={i} className="py-2.5 px-3 text-right">
                      <span className={cn(
                        index < 3 ? "text-gray-800" : "text-gray-600"
                      )}>
                        {m.formattedValue}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
