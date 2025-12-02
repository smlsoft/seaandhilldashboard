'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PurchaseByBrand } from '@/lib/data/types';

interface PurchaseByBrandChartProps {
  data: PurchaseByBrand[];
  height?: string;
}

export function PurchaseByBrandChart({ data, height = '400px' }: PurchaseByBrandChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Sort by totalPurchaseValue descending and take top 10
    const sortedData = [...data].sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue).slice(0, 10);

    const brands = sortedData.map(item => item.brandName);
    const amounts = sortedData.map(item => item.totalPurchaseValue);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const brand = params[0].axisValue;
          const value = `฿${Number(params[0].value).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
          return `<div>
            <div style="font-weight: bold; margin-bottom: 4px;">${brand}</div>
            <div>${params[0].marker} ยอดซื้อ: <strong>${value}</strong></div>
          </div>`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          },
        },
      },
      yAxis: {
        type: 'category',
        data: brands,
        axisLabel: {
          interval: 0,
        },
      },
      series: [
        {
          name: 'ยอดซื้อ',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#a78bfa' },
            ]),
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const value = params.value;
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            },
          },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
