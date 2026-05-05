'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { SalesByBranch } from '@/lib/data/types';

interface SalesByBranchChartProps {
  data: SalesByBranch[];
  height?: string;
}

export function SalesByBranchChart({ data, height = '400px' }: SalesByBranchChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Sort by totalSales descending
    const sortedData = [...data].sort((a, b) => b.totalSales - a.totalSales);

    const branchNames = sortedData.map(item => item.branchName);
    const salesData = sortedData.map(item => item.totalSales);
    const orderData = sortedData.map(item => item.orderCount);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const branch = params[0].axisValue;
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${branch}</div>`;

          params.forEach((param: any) => {
            const value = param.seriesName === 'ยอดขาย'
              ? `฿${Number(param.value).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
              : `${param.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} รายการ`;

            result += `<div style="margin-bottom: 4px;">
              ${param.marker} ${param.seriesName}: <strong>${value}</strong>
            </div>`;
          });

          return result;
        },
      },
      legend: {
        data: ['ยอดขาย', 'จำนวนออเดอร์'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: branchNames,
        axisLabel: {
          interval: 0,
          rotate: branchNames.length > 5 ? 45 : 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'ยอดขาย (฿)',
          position: 'left',
          axisLabel: {
            formatter: (value: number) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            },
          },
        },
        {
          type: 'value',
          name: 'จำนวนออเดอร์',
          position: 'right',
          axisLabel: {
            formatter: '{value}',
          },
        },
      ],
      series: [
        {
          name: 'ยอดขาย',
          type: 'bar',
          data: salesData,
          yAxisIndex: 0,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#10b981' },
              { offset: 1, color: '#059669' },
            ]),
          },
        },
        {
          name: 'จำนวนออเดอร์',
          type: 'line',
          data: orderData,
          yAxisIndex: 1,
          smooth: true,
          itemStyle: {
            color: '#3b82f6',
          },
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
        <p className="text-muted-foreground text-sm">ไม่มีข้อมูล</p>
      </div>
    );
  }

  return <div ref={chartRef} style={{ height, width: '100%' }} />;
}
