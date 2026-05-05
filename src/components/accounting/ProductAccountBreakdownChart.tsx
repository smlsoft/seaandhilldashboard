'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ProductAccountData } from '@/lib/data/types';

interface ProductAccountBreakdownChartProps {
  data: ProductAccountData[];
  height?: string;
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  INCOME: 'รายได้',
  EQUITY: 'ทุน',
  EXPENSES: 'ค่าใช้จ่าย',
};

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  INCOME: '#10b981',
  EQUITY: '#6366f1',
  EXPENSES: '#f43f5e',
};

export function ProductAccountBreakdownChart({
  data,
  height = '420px',
}: ProductAccountBreakdownChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Aggregate: per category, sum revenue/equity/expenses across all account codes
    const categoryMap = new Map<
      string,
      { categoryName: string; revenue: number; equity: number; expenses: number }
    >();

    for (const row of data) {
      const key = row.categoryCode || row.categoryName;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.revenue += row.revenue;
        existing.equity += row.equity;
        existing.expenses += row.expenses;
      } else {
        categoryMap.set(key, {
          categoryName: row.categoryName,
          revenue: row.revenue,
          equity: row.equity,
          expenses: row.expenses,
        });
      }
    }

    // Sort by revenue descending, take top 15
    const sorted = [...categoryMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    const categories = sorted.map((d) => d.categoryName);
    const revenueValues = sorted.map((d) => d.revenue);
    const equityValues = sorted.map((d) => d.equity);
    const expensesValues = sorted.map((d) => d.expenses);

    const formatVal = (v: number) =>
      v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(2)}M`
        : v >= 1_000
        ? `${(v / 1_000).toFixed(0)}K`
        : v.toFixed(0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let html = `<div style="font-weight:bold;margin-bottom:4px">${params[0].axisValue}</div>`;
          params.forEach((item: any) => {
            if (Number(item.value) === 0) return;
            const val = Number(item.value).toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            html += `<div style="display:flex;align-items:center;gap:8px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color}"></span>
              <span>${item.seriesName}:</span>
              <span style="font-weight:600">฿${val}</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        data: [
          ACCOUNT_TYPE_LABEL.INCOME,
          ACCOUNT_TYPE_LABEL.EQUITY,
          ACCOUNT_TYPE_LABEL.EXPENSES,
        ],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '12%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          rotate: 30,
          interval: 0,
          fontSize: 11,
          overflow: 'truncate',
          width: 90,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (v: number) => formatVal(v),
        },
      },
      series: [
        {
          name: ACCOUNT_TYPE_LABEL.INCOME,
          type: 'bar',
          stack: 'stack',
          data: revenueValues,
          itemStyle: { color: ACCOUNT_TYPE_COLOR.INCOME },
        },
        {
          name: ACCOUNT_TYPE_LABEL.EQUITY,
          type: 'bar',
          stack: 'stack',
          data: equityValues,
          itemStyle: { color: ACCOUNT_TYPE_COLOR.EQUITY },
        },
        {
          name: ACCOUNT_TYPE_LABEL.EXPENSES,
          type: 'bar',
          data: expensesValues,
          itemStyle: { color: ACCOUNT_TYPE_COLOR.EXPENSES },
        },
      ],
    };

    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => { if (!chart.isDisposed()) chart.resize(); });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        ไม่มีข้อมูลในช่วงเวลาที่เลือก
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height }} />;
}
