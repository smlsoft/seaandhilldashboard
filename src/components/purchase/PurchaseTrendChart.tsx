'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PurchaseTrendData } from '@/lib/data/types';

interface PurchaseTrendChartProps {
  data: PurchaseTrendData[];
  height?: string;
}

export function PurchaseTrendChart({ data, height = '400px' }: PurchaseTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const dates = data.map(item => item.month);

    const purchaseData = data.map(item => item.totalPurchases);
    const orderData = data.map(item => item.poCount);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        formatter: (params: any) => {
          const date = params[0].axisValue;
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`;

          params.forEach((param: any) => {
            const value = param.seriesName === 'ยอดซื้อ'
              ? `฿${Number(param.value).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`
              : `${param.value.toLocaleString('th-TH')} รายการ`;

            result += `<div style="margin-bottom: 4px;">
              ${param.marker} ${param.seriesName}: <strong>${value}</strong>
            </div>`;
          });

          return result;
        },
      },
      legend: {
        data: ['ยอดซื้อ', 'จำนวนออเดอร์'],
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
        data: dates,
        boundaryGap: false,
      },
      yAxis: [
        {
          type: 'value',
          name: 'ยอดซื้อ (฿)',
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
          name: 'ยอดซื้อ',
          type: 'line',
          data: purchaseData,
          smooth: true,
          yAxisIndex: 0,
          itemStyle: {
            color: '#f59e0b',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
            ]),
          },
        },
        {
          name: 'จำนวนออเดอร์',
          type: 'bar',
          data: orderData,
          yAxisIndex: 1,
          itemStyle: {
            color: '#8b5cf6',
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
