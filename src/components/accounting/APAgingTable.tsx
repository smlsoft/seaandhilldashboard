'use client';

import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import type { AgingItem } from '@/lib/data/types';

interface APAgingTableProps {
  data: AgingItem[];
  height?: string;
}

export function APAgingTable({ data, height = '300px' }: APAgingTableProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Group data by aging bucket
  const bucketData = useMemo(() => {
    const bucketOrder = [
      'ยังไม่ครบกำหนด',
      '1-30 วัน',
      '31-60 วัน',
      '61-90 วัน',
      'มากกว่า 90 วัน',
    ];

    const bucketColors: Record<string, string> = {
      'ยังไม่ครบกำหนด': '#22c55e', // green-500
      '1-30 วัน': '#eab308',        // yellow-500
      '31-60 วัน': '#f97316',       // orange-500
      '61-90 วัน': '#ef4444',       // red-500
      'มากกว่า 90 วัน': '#b91c1c',  // red-700
    };

    const grouped = data.reduce((acc, item) => {
      const bucket = bucketOrder.includes(item.agingBucket) 
        ? item.agingBucket 
        : 'มากกว่า 90 วัน';
      
      if (!acc[bucket]) {
        acc[bucket] = { amount: 0, count: 0 };
      }
      acc[bucket].amount += item.outstanding;
      acc[bucket].count += 1;
      return acc;
    }, {} as Record<string, { amount: number; count: number }>);

    return bucketOrder
      .filter(bucket => grouped[bucket])
      .map(bucket => ({
        bucket,
        amount: grouped[bucket].amount,
        count: grouped[bucket].count,
        color: bucketColors[bucket],
      }));
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || bucketData.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = bucketData.find(b => b.bucket === params.name);
          if (!item) return '';
          return `<div>
            <div style="font-weight: bold; margin-bottom: 4px;">${params.name}</div>
            <div>฿${formatCurrency(item.amount)} (${params.percent.toFixed(1)}%)</div>
            <div style="color: #6b7280; font-size: 12px;">${item.count} รายการ</div>
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
      },
      series: [
        {
          name: 'อายุเจ้าหนี้',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '50%'],
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
          data: bucketData.map(item => ({
            value: item.amount,
            name: item.bucket,
            itemStyle: { color: item.color },
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
  }, [bucketData]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground text-sm">ไม่มีเจ้าหนี้ค้างชำระ</p>
      </div>
    );
  }

  return (
    <div ref={chartRef} style={{ height, width: '100%' }} />
  );
}
