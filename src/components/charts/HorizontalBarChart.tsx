'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export interface HorizontalBarItem {
  rank: number;
  name: string;
  value: number;
  subLabel?: string;
  extraData?: Record<string, any>;
}

export interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  height?: string;
  // Formatting
  valueFormatter?: (value: number) => string;
  labelFormatter?: (item: HorizontalBarItem, percentage: number) => string;
  tooltipFormatter?: (item: HorizontalBarItem, percentage: number) => string;
  // Colors
  getBarColor?: (rank: number) => string;
  // Display options
  showLegend?: boolean;
  showPercentage?: boolean;
  showRank?: boolean;
  barWidth?: string;
  fontSize?: number;
  // Grid
  gridLeft?: number;
  gridRight?: number;
  // Y-axis label margin
  yAxisLabelMargin?: number;
}

// Default color function - gold/silver/bronze for top 3
const defaultGetBarColor = (rank: number): string => {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  // Gradient blue for others
  const intensity = 0.9 - (rank - 4) * 0.08;
  return `rgba(59, 130, 246, ${Math.max(0.3, intensity)})`;
};

// Default value formatter
const defaultValueFormatter = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function HorizontalBarChart({
  data,
  height = '400px',
  valueFormatter = defaultValueFormatter,
  labelFormatter,
  tooltipFormatter,
  getBarColor = defaultGetBarColor,
  showLegend = true,
  showPercentage = true,
  showRank = true,
  barWidth = '85%',
  fontSize = 12,
  gridLeft = 150,
  gridRight = 150,
  yAxisLabelMargin,
}: HorizontalBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Sort by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    // Reverse for display (lowest rank at top, highest at bottom)
    const displayData = [...sortedData].reverse();

    // Calculate total for percentage
    const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const item = params[0];
          const itemData = displayData[item.dataIndex];
          const percentage = ((itemData.value / totalValue) * 100).toFixed(1);
          
          if (tooltipFormatter) {
            return tooltipFormatter(itemData, parseFloat(percentage));
          }
          
          const rankLabel = showRank ? `อันดับ ${itemData.rank}: ` : '';
          
          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 6px;">${rankLabel}${itemData.name}</div>
              ${itemData.subLabel ? `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">${itemData.subLabel}</div>` : ''}
              <div style="margin-top: 8px;">
                <div>ยอด: <b style="color: #3b82f6;">฿${itemData.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
                <div>สัดส่วน: <b>${percentage}%</b></div>
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: gridLeft,
        right: gridRight,
        bottom: '5%',
        top: '3%',
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `฿${valueFormatter(value)}`,
          fontSize: fontSize,
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: displayData.map((item) => showRank ? `${item.rank}. ${item.name}` : item.name),
        axisLabel: {
          fontSize: fontSize,
          align: 'left',
          margin: yAxisLabelMargin !== undefined ? yAxisLabelMargin : 220,
          color: '#374151',
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
      },
      series: [
        {
          name: 'Value',
          type: 'bar',
          data: displayData.map((item) => ({
            value: item.value,
            itemStyle: {
              color: getBarColor(item.rank),
              borderRadius: [0, 4, 4, 0],
            },
          })),
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const itemData = displayData[params.dataIndex];
              const percentage = ((itemData.value / totalValue) * 100).toFixed(1);
              
              if (labelFormatter) {
                return labelFormatter(itemData, parseFloat(percentage));
              }
              
              if (showPercentage) {
                return `฿${valueFormatter(params.value)} (${percentage}%)`;
              }
              return `฿${valueFormatter(params.value)}`;
            },
            fontSize: fontSize,
            color: '#374151',
          },
          barWidth: barWidth,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
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
  }, [data, valueFormatter, labelFormatter, tooltipFormatter, getBarColor, showPercentage, barWidth, fontSize, gridLeft, gridRight]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
        ไม่มีข้อมูล
      </div>
    );
  }

  return (
    <div className="w-full">
      <div ref={chartRef} style={{ height, width: '100%' }} />
      {/* Legend for top 3 */}
      {showLegend && (
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFD700' }}></div>
            <span>อันดับ 1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#C0C0C0' }}></div>
            <span>อันดับ 2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#CD7F32' }}></div>
            <span>อันดับ 3</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.7)' }}></div>
            <span>อันดับ 4+</span>
          </div>
        </div>
      )}
    </div>
  );
}
