'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { APOutstanding } from '@/lib/data/types';

interface APOutstandingChartProps {
  data: APOutstanding[];
  height?: string;
}

export function APOutstandingChart({ data, height = '350px' }: APOutstandingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const supplierLabels = data.map(item => item.supplierName);
    const outstandingData = data.map(item => item.totalOutstanding);
    const overdueData = data.map(item => item.overdueAmount);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const supplier = params[0].axisValue;
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${supplier}</div>`;

          params.forEach((param: any) => {
            const value = `฿${Number(param.value).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
            result += `<div style="margin-bottom: 4px;">
              ${param.marker} ${param.seriesName}: <strong>${value}</strong>
            </div>`;
          });

          return result;
        },
      },
      legend: {
        data: ['ยอดค้างชำระ', 'ยอดเกินกำหนด'],
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
        data: supplierLabels,
        axisLabel: {
          interval: 0,
          rotate: supplierLabels.length > 3 ? 30 : 0,
        },
      },
      yAxis: {
        type: 'value',
        name: 'จำนวนเงิน (฿)',
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          },
        },
      },
      series: [
        {
          name: 'ยอดค้างชำระ',
          type: 'bar',
          stack: 'total',
          data: outstandingData,
          itemStyle: {
            color: '#f59e0b',
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              if (params.value === 0) return '';
              if (params.value >= 1000000) return `${(params.value / 1000000).toFixed(1)}M`;
              if (params.value >= 1000) return `${(params.value / 1000).toFixed(0)}K`;
              return params.value.toString();
            },
          },
        },
        {
          name: 'ยอดเกินกำหนด',
          type: 'bar',
          stack: 'total',
          data: overdueData,
          itemStyle: {
            color: '#ef4444',
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              if (params.value === 0) return '';
              if (params.value >= 1000000) return `${(params.value / 1000000).toFixed(1)}M`;
              if (params.value >= 1000) return `${(params.value / 1000).toFixed(0)}K`;
              return params.value.toString();
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
