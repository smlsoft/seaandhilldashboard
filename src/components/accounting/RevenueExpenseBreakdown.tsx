'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { CategoryBreakdown } from '@/lib/data/types';

interface RevenueExpenseBreakdownProps {
  revenueData: CategoryBreakdown[];
  expenseData: CategoryBreakdown[];
  height?: string;
}

export function RevenueExpenseBreakdown({
  revenueData,
  expenseData,
  height = '300px',
}: RevenueExpenseBreakdownProps) {
  const revenueChartRef = useRef<HTMLDivElement>(null);
  const expenseChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revenueChartRef.current || revenueData.length === 0) return;
    const chart = echarts.init(revenueChartRef.current);
    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = Number(params.value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return `<div><div style="font-weight:bold;margin-bottom:4px">${params.name}</div><div>฿${value} (${params.percent.toFixed(1)}%)</div></div>`;
        },
      },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
      series: [{
        name: 'รายได้',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: revenueData.map(item => ({ value: item.amount, name: item.accountName || item.accountGroup })),
      }],
    };
    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [revenueData]);

  useEffect(() => {
    if (!expenseChartRef.current || expenseData.length === 0) return;
    const chart = echarts.init(expenseChartRef.current);
    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = Number(params.value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return `<div><div style="font-weight:bold;margin-bottom:4px">${params.name}</div><div>฿${value} (${params.percent.toFixed(1)}%)</div></div>`;
        },
      },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 11 } },
      series: [{
        name: 'ค่าใช้จ่าย',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: expenseData.map(item => ({ value: item.amount, name: item.accountName || item.accountGroup })),
      }],
    };
    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chart.dispose(); };
  }, [expenseData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium mb-4">รายได้ตามหมวด</h3>
        {revenueData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-muted-foreground text-sm">ไม่มีข้อมูล</p>
          </div>
        ) : (
          <div ref={revenueChartRef} style={{ height, width: '100%' }} />
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium mb-4">ค่าใช้จ่ายตามหมวด</h3>
        {expenseData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <p className="text-muted-foreground text-sm">ไม่มีข้อมูล</p>
          </div>
        ) : (
          <div ref={expenseChartRef} style={{ height, width: '100%' }} />
        )}
      </div>
    </div>
  );
}