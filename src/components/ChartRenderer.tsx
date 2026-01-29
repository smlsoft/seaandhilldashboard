'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Dynamic import ECharts to avoid SSR issues
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  data: number[];
}

interface ChartRendererProps {
  chartData: ChartData;
}

export default function ChartRenderer({ chartData }: ChartRendererProps) {
  const { type, title, labels, data } = chartData;

  const option = useMemo(() => {
    const baseOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: type === 'pie' ? 'item' : 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
    };

    if (type === 'pie') {
      return {
        ...baseOption,
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 4,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: {
              show: true,
              formatter: '{b}: {d}%',
              fontSize: 10,
            },
            data: labels.map((label, index) => ({
              value: data[index],
              name: label,
            })),
          },
        ],
      };
    }

    // Bar or Line chart
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          fontSize: 10,
          rotate: labels.length > 6 ? 45 : 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          formatter: (value: number) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value.toString();
          },
        },
      },
      series: [
        {
          type: type,
          data: data,
          itemStyle: {
            color: type === 'bar' ? '#3b82f6' : undefined,
          },
          lineStyle: type === 'line' ? { width: 2 } : undefined,
          areaStyle: type === 'line' ? { opacity: 0.1 } : undefined,
          smooth: type === 'line',
          barMaxWidth: 40,
        },
      ],
    };
  }, [type, title, labels, data]);

  return (
    <div className="my-3 bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
      <ReactECharts
        option={option}
        style={{ height: '250px', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}

// Parser function to extract chart data from markdown comment
export function parseChartTag(content: string): { chartData: ChartData | null; cleanContent: string } {
  const chartRegex = /<!--chart\s*([\s\S]*?)-->/g;
  let chartData: ChartData | null = null;

  const cleanContent = content.replace(chartRegex, (match, chartContent) => {
    try {
      const lines = chartContent.trim().split('\n');
      const config: Record<string, string> = {};

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          config[key] = value;
        }
      }

      if (config.type && config.labels && config.data) {
        const type = config.type as 'bar' | 'line' | 'pie';
        const title = config.title || '';
        const labels = config.labels.split(',').map(l => l.trim());
        const data = config.data.split(',').map(d => parseFloat(d.trim()));

        if (labels.length === data.length && data.every(d => !isNaN(d))) {
          chartData = { type, title, labels, data };
        }
      }
    } catch (e) {
      console.error('Failed to parse chart tag:', e);
    }

    return ''; // Remove chart tag from content
  });

  return { chartData, cleanContent: cleanContent.trim() };
}
