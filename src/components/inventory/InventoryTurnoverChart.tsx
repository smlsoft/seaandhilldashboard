'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { InventoryTurnover } from '@/lib/data/types';

interface InventoryTurnoverChartProps {
  data: InventoryTurnover[];
  height?: string;
}

export function InventoryTurnoverChart({ data, height = '400px' }: InventoryTurnoverChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Sort by turnoverRatio descending and take top 10
    const sortedData = [...data].sort((a, b) => b.turnoverRatio - a.turnoverRatio).slice(0, 10);

    const categories = sortedData.map(item => item.categoryName);
    const turnoverRatios = sortedData.map(item => item.turnoverRatio);
    const daysToSell = sortedData.map(item => item.daysToSell);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const category = params[0].axisValue;
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${category}</div>`;

          params.forEach((param: any) => {
            const value = param.seriesName === 'อัตราหมุนเวียน'
              ? `${Number(param.value).toFixed(2)} เท่า`
              : `${Math.round(param.value)} วัน`;

            result += `<div style="margin-bottom: 4px;">
              ${param.marker} ${param.seriesName}: <strong>${value}</strong>
            </div>`;
          });

          return result;
        },
      },
      legend: {
        data: ['อัตราหมุนเวียน', 'วันขายหมด'],
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
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: categories.length > 5 ? 45 : 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'อัตราหมุนเวียน (เท่า)',
          position: 'left',
          axisLabel: {
            formatter: '{value}',
          },
        },
        {
          type: 'value',
          name: 'วันขายหมด',
          position: 'right',
          axisLabel: {
            formatter: '{value}',
          },
        },
      ],
      series: [
        {
          name: 'อัตราหมุนเวียน',
          type: 'bar',
          data: turnoverRatios,
          yAxisIndex: 0,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#60a5fa' },
            ]),
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => params.value.toFixed(1),
          },
        },
        {
          name: 'วันขายหมด',
          type: 'line',
          data: daysToSell,
          yAxisIndex: 1,
          smooth: true,
          itemStyle: {
            color: '#f59e0b',
          },
          lineStyle: {
            width: 3,
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
