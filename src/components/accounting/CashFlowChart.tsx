'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { CashFlowData } from '@/lib/data/types';

interface CashFlowChartProps {
  data: CashFlowData[];
  height?: string;
}

export function CashFlowChart({ data, height = '350px' }: CashFlowChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const activities = data.map(d => d.activityType);
    const cashFlows = data.map(d => d.netCashFlow);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const item = params[0];
          const value = Number(item.value).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return `<div>
            <div style="font-weight: bold; margin-bottom: 4px;">${item.axisValue}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>กระแสเงินสดสุทธิ:</span>
              <span style="font-weight: 600; color: ${item.value >= 0 ? '#10b981' : '#ef4444'};">฿${value}</span>
            </div>
          </div>`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: activities,
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
          name: 'Cash Flow',
          type: 'bar',
          data: cashFlows,
          itemStyle: {
            color: (params: any) => {
              return params.value >= 0 ? '#10b981' : '#ef4444';
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => {
              const value = Number(params.value);
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}K`;
              }
              return value.toFixed(0);
            },
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
        <p className="text-muted-foreground">ไม่มีข้อมูล</p>
      </div>
    );
  }

  return <div ref={chartRef} style={{ height, width: '100%' }} />;
}
