'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BranchComparisonData } from '@/lib/data/comparison';
import { TrendingUp, TrendingDown, Users, Package, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/charts/Sparkline';
import { ExportButton } from '@/components/ExportButton';
import { FilterBar, FilterType } from './FilterBar';

interface ComparisonTableProps {
  data: BranchComparisonData[];
}

export function ComparisonTable({ data }: ComparisonTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Apply filters
  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case 'lossMaking':
        return data.filter((b) => b.netProfit < 0);
      case 'declining':
        return data.filter((b) => b.salesGrowth < 0);
      case 'highInventory':
        return data.filter((b) => b.deadStockValue > b.inventoryValue * 0.2); // 20%+ dead stock
      default:
        return data;
    }
  }, [data, activeFilter]);

  // Helper: Get heatmap color for profit margin
  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'bg-emerald-50 text-emerald-700';
    if (margin >= 20) return 'bg-green-50 text-green-700';
    if (margin >= 10) return 'bg-yellow-50 text-yellow-700';
    if (margin >= 0) return 'bg-orange-50 text-orange-700';
    return 'bg-rose-50 text-rose-700';
  };

  // Helper: Get color for growth
  const getGrowthColor = (growth: number) => {
    if (growth >= 20) return 'text-emerald-600';
    if (growth >= 0) return 'text-green-600';
    return 'text-rose-600';
  };

  // Helper: Format large numbers
  const formatMillion = (value: number) => {
    if (value >= 1000000) return `฿${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `฿${(value / 1000).toFixed(0)}K`;
    return `฿${value.toFixed(0)}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar and Export */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <ExportButton data={filteredData} />
      </motion.div>

      {/* Results Count */}
      {activeFilter !== 'all' && (
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          แสดง {filteredData.length} จาก {data.length} กิจการ
        </motion.p>
      )}

      {/* Table */}
      <motion.div
        className="overflow-x-auto rounded-xl border bg-card shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <motion.tr
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <th className="px-4 py-3 text-left font-semibold">#</th>
              <th className="px-4 py-3 text-left font-semibold min-w-[200px]">กิจการ</th>
              <th className="px-4 py-3 text-right font-semibold">ยอดขาย</th>
              <th className="px-4 py-3 text-right font-semibold">กำไร</th>
              <th className="px-4 py-3 text-center font-semibold">Margin %</th>
              <th className="px-4 py-3 text-right font-semibold">Growth %</th>
              <th className="px-4 py-3 text-center font-semibold">Trend</th>
              <th className="px-4 py-3 text-right font-semibold">ลูกค้า</th>
              <th className="px-4 py-3 text-right font-semibold">Repeat %</th>
              <th className="px-4 py-3 text-right font-semibold">มูลค่าสต็อก</th>
              <th className="px-4 py-3 text-right font-semibold">หมุนเวียน</th>
            </motion.tr>
          </thead>
          <motion.tbody
            className="divide-y"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredData.map((branch, index) => (
              <motion.tr
                key={branch.branchKey}
                variants={rowVariants}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                className="group transition-colors"
              >
                <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                <motion.td
                  className="px-4 py-3"
                  whileHover={{ paddingLeft: 20 }}
                >
                  <div>
                    <motion.div
                      className="font-semibold text-foreground"
                      whileHover={{ color: '#6366f1' }}
                    >
                      {branch.branchName}
                    </motion.div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {branch.topProducts.length > 0 ? (
                        <motion.span
                          title={branch.topProducts.map((p) => p.productName).join(', ')}
                          whileHover={{ color: '#000' }}
                        >
                          Top: {branch.topProducts[0]?.productName}
                        </motion.span>
                      ) : (
                        <span>ไม่มีข้อมูลสินค้า</span>
                      )}
                    </div>
                  </div>
                </motion.td>
                <motion.td
                  className="px-4 py-3 text-right"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="font-semibold">{formatMillion(branch.totalSales)}</div>
                  <div className="text-xs text-muted-foreground">{branch.totalOrders.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บิล</div>
                </motion.td>
                <motion.td
                  className={cn(
                    'px-4 py-3 text-right font-semibold',
                    branch.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  )}
                  whileHover={{ scale: 1.05 }}
                >
                  {formatMillion(branch.netProfit)}
                </motion.td>
                <motion.td className="px-4 py-3" whileHover={{ scale: 1.05 }}>
                  <div
                    className={cn(
                      'inline-block px-3 py-1 rounded-full font-semibold text-xs',
                      getMarginColor(branch.profitMargin)
                    )}
                  >
                    {branch.profitMargin.toFixed(1)}%
                  </div>
                </motion.td>
                <motion.td
                  className={cn('px-4 py-3 text-right font-semibold', getGrowthColor(branch.salesGrowth))}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-end gap-1">
                    {branch.salesGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{branch.salesGrowth.toFixed(1)}%</span>
                  </div>
                </motion.td>
                <motion.td className="px-4 py-3 text-center" whileHover={{ scale: 1.05 }}>
                  <Sparkline data={branch.monthlySales} width={80} height={24} />
                </motion.td>
                <motion.td className="px-4 py-3 text-right" whileHover={{ scale: 1.05 }}>
                  <div className="flex items-center justify-end gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{branch.totalTransactions.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </motion.td>
                <motion.td className="px-4 py-3 text-right font-medium text-violet-600" whileHover={{ scale: 1.05 }}>
                  {branch.repeatCustomerRate.toFixed(1)}%
                </motion.td>
                <motion.td className="px-4 py-3 text-right" whileHover={{ scale: 1.05 }}>
                  <div className="font-medium">{formatMillion(branch.inventoryValue)}</div>
                  {branch.deadStockValue > 0 && (
                    <div className="text-xs text-rose-600">Dead: {formatMillion(branch.deadStockValue)}</div>
                  )}
                </motion.td>
                <motion.td className="px-4 py-3 text-right" whileHover={{ scale: 1.05 }}>
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                      branch.inventoryTurnover >= 2
                        ? 'bg-emerald-100 text-emerald-700'
                        : branch.inventoryTurnover >= 1
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-rose-100 text-rose-700'
                    )}
                  >
                    <Activity className="h-3 w-3" />
                    {branch.inventoryTurnover.toFixed(2)}x
                  </div>
                </motion.td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </motion.div>

      {filteredData.length === 0 && (
        <motion.div
          className="text-center py-12 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          ไม่พบกิจการที่ตรงกับเงื่อนไขที่เลือก
        </motion.div>
      )}
    </div>
  );
}
