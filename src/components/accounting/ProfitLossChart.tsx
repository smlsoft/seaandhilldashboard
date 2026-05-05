'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ProfitLossData } from '@/lib/data/types';

interface ProfitLossChartProps {
  data: ProfitLossData[];
  height?: string;
}

export function ProfitLossChart({ data, height = '400px' }: ProfitLossChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const months = data.map(d => {
      const date = new Date(d.month);
      return date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    });

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          let result = `<div style="font-weight: bold; margin-bottom: 4px;">${params[0].axisValue}</div>`;
          params.forEach((item: any) => {
            const value = Number(item.value).toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            result += `<div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${item.color};"></span>
              <span>${item.seriesName}:</span>
              <span style="font-weight: 600;">฿${value}</span>
            </div>`;
          });
          return result;
        },
      },
      legend: {
        data: ['รายได้', 'ค่าใช้จ่าย', 'กำไรสุทธิ'],
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
        data: months,
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
      series: [
        {
          name: 'รายได้',
          type: 'bar',
          data: data.map(d => d.revenue),
          itemStyle: {
            color: '#10b981', // green
          },
        },
        {
          name: 'ค่าใช้จ่าย',
          type: 'bar',
          data: data.map(d => d.expenses),
          itemStyle: {
            color: '#ef4444', // red
          },
        },
        {
          name: 'กำไรสุทธิ',
          type: 'line',
          data: data.map(d => d.netProfit),
          itemStyle: {
            color: '#3b82f6', // blue
          },
          lineStyle: {
            width: 3,
          },
          smooth: true,
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
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">ไม่มีข้อมูล</p>
      </div>
    );
  }

  return <div ref={chartRef} style={{ height, width: '100%' }} />;
}
