'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { PurchaseByCategory } from '@/lib/data/types';

interface PurchaseByCategoryChartProps {
  data: PurchaseByCategory[];
  height?: string;
}

export function PurchaseByCategoryChart({ data, height = '400px' }: PurchaseByCategoryChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Sort by totalPurchaseValue descending and take top 10
    const sortedData = [...data].sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue).slice(0, 10);

    const categories = sortedData.map(item => item.categoryName);
    const amounts = sortedData.map(item => item.totalPurchaseValue);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = `฿${Number(params.value).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
          return `<div>
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div>${params.marker} ยอดซื้อ: <strong>${value}</strong></div>
            <div style="margin-top: 4px;">สัดส่วน: ${params.percent.toFixed(1)}%</div>
          </div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: {
          fontSize: 11,
        },
        type: 'scroll',
      },
      series: [
        {
          name: 'ยอดซื้อ',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: sortedData.map((item, index) => ({
            value: item.totalPurchaseValue,
            name: item.categoryName,
            itemStyle: {
              color: [
                '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6',
                '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
              ][index % 10],
            },
          })),
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
