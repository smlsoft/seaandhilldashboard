'use client';

import React from 'react';
import { motion } from 'framer-motion';
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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const barVariants = {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-xl border border-gray-200 p-5 transition-shadow"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="p-2 bg-gray-100 rounded-lg"
            whileHover={{ rotate: 5, scale: 1.05 }}
          >
            {icon}
          </motion.div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        </div>
        {formatTotal && (
          <motion.span
            className="text-xs font-medium text-gray-500"
            whileHover={{ scale: 1.1 }}
          >
            รวม: {formatTotal(total)}
          </motion.span>
        )}
      </motion.div>

      <motion.div className="space-y-3" variants={containerVariants}>
        {branches.map((branch: BranchKPIData, index: number) => {
          const barWidth = maxValue > 0 ? (Math.abs(branch.value) / maxValue) * 100 : 0;
          const colorIndex = index % BRANCH_COLORS.length;

          return (
            <motion.div
              key={branch.branchKey}
              variants={itemVariants}
              className="space-y-1"
              whileHover={{ x: 4 }}
            >
              <div className="flex items-center justify-between text-xs">
                <motion.span
                  className="text-gray-600 truncate max-w-[140px]"
                  title={branch.branchName}
                  whileHover={{ x: 2 }}
                >
                  {branch.branchName}
                </motion.span>
                <motion.div
                  className="flex items-center gap-1.5"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="font-semibold text-gray-800">{branch.formattedValue}</span>
                  {branch.growth !== undefined && (
                    <motion.span
                      className={cn(
                        'flex items-center gap-0.5 text-[10px] font-medium',
                        branch.growth > 0
                          ? 'text-green-600'
                          : branch.growth < 0
                          ? 'text-red-600'
                          : 'text-gray-400'
                      )}
                      animate={
                        branch.growth > 0
                          ? { y: [-2, 0, -2] }
                          : branch.growth < 0
                          ? { opacity: [0.6, 1, 0.6] }
                          : {}
                      }
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    >
                      {branch.growth > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : branch.growth < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {Math.abs(branch.growth).toFixed(1)}%
                    </motion.span>
                  )}
                </motion.div>
              </div>
              <div
                className={cn(
                  'h-2.5 rounded-full overflow-hidden',
                  BRANCH_BG_COLORS[colorIndex]
                )}
              >
                <motion.div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r',
                    BRANCH_COLORS[colorIndex]
                  )}
                  variants={barVariants}
                  style={{ width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
