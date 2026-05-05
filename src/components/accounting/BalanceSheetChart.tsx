'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { BalanceSheetItem } from '@/lib/data/types';

interface BalanceSheetChartProps {
  data: BalanceSheetItem[];
  height?: string;
}

export function BalanceSheetChart({ data, height = '400px' }: BalanceSheetChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Group by account type
    const groupedData = data.reduce((acc, item) => {
      if (!acc[item.typeName]) {
        acc[item.typeName] = [];
      }
      acc[item.typeName].push(item);
      return acc;
    }, {} as Record<string, BalanceSheetItem[]>);

    const categories = Object.keys(groupedData);
    const series = categories.map(category => ({
      name: category,
      type: 'bar',
      stack: 'total',
      data: categories.map(cat =>
        cat === category
          ? groupedData[cat].reduce((sum, item) => sum + item.balance, 0)
          : 0
      ),
      itemStyle: {
        color:
          category === 'สินทรัพย์'
            ? '#10b981'
            : category === 'หนี้สิน'
            ? '#ef4444'
            : '#3b82f6',
      },
    }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: bold; margin-bottom: 4px;">${params[0].axisValue}</div>`;
          params.forEach((item: any) => {
            if (item.value > 0) {
              const value = Number(item.value).toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              result += `<div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${item.color};"></span>
                <span>${item.seriesName}:</span>
                <span style="font-weight: 600;">฿${value}</span>
              </div>`;
            }
          });
          return result;
        },
      },
      legend: {
        data: categories,
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            return value >= 1000000
              ? `${(value / 1000000).toFixed(1)}M`
              : value >= 1000
              ? `${(value / 1000).toFixed(0)}K`
              : value.toString();
          },
        },
      },
      series: series as any,
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
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">ไม่มีข้อมูล</p>
      </div>
    );
  }

  return <div ref={chartRef} style={{ height, width: '100%' }} />;
}
