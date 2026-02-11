'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BranchKPIData {
  branchKey: string;
  branchName: string;
  value: number;
  formattedValue: string;
  growth?: number;
}

interface ComparisonKPICardProps {
  title: string;
  icon: React.ReactNode;
  branches: BranchKPIData[];
  formatTotal?: (total: number) => string;
}

const BRANCH_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

const BRANCH_BG_COLORS = [
  'bg-blue-50',
  'bg-emerald-50',
  'bg-violet-50',
  'bg-amber-50',
  'bg-rose-50',
  'bg-cyan-50',
];

export default function ComparisonKPICard({
  title,
  icon,
  branches,
  formatTotal,
}: ComparisonKPICardProps) {
  const maxValue = Math.max(...branches.map((b: BranchKPIData) => Math.abs(b.value)), 1);
  const total = branches.reduce((sum: number, b: BranchKPIData) => sum + b.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-100 rounded-lg">
            {icon}
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        </div>
        {formatTotal && (
          <span className="text-xs font-medium text-gray-500">
            รวม: {formatTotal(total)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {branches.map((branch: BranchKPIData, index: number) => {
          const barWidth = maxValue > 0 ? (Math.abs(branch.value) / maxValue) * 100 : 0;
          const colorIndex = index % BRANCH_COLORS.length;

          return (
            <div key={branch.branchKey} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[140px]" title={branch.branchName}>
                  {branch.branchName}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-800">{branch.formattedValue}</span>
                  {branch.growth !== undefined && (
                    <span className={cn(
                      "flex items-center gap-0.5 text-[10px] font-medium",
                      branch.growth > 0 ? "text-green-600" : branch.growth < 0 ? "text-red-600" : "text-gray-400"
                    )}>
                      {branch.growth > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : branch.growth < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {Math.abs(branch.growth).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className={cn("h-2.5 rounded-full overflow-hidden", BRANCH_BG_COLORS[colorIndex])}>
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", BRANCH_COLORS[colorIndex])}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
