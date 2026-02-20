'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { SalesByCategory } from '@/lib/data/types';

interface SalesByCategoryChartProps {
    data: SalesByCategory[];
    height?: string;
}

export function SalesByCategoryChart({ data, height = '400px' }: SalesByCategoryChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current || data.length === 0) return;

        const chart = echarts.init(chartRef.current);

        // Sort by totalSales descending
        const sortedData = [...data].sort((a, b) => b.totalSales - a.totalSales);

        // Take top 10 categories to avoid clutter if there are many
        const topCategories = sortedData.slice(0, 10);

        // Prepare data for Pie/Donut chart
        const chartData = topCategories.map(item => ({
            value: item.totalSales,
            name: item.categoryCode ? `${item.categoryCode} ${item.categoryName}` : item.categoryName,
            itemStyle: {
                // Generate colors dynamically if needed, or stick to ECharts default palette
            },
            // Keep original data for formatting
            originalData: item
        }));

        const option: echarts.EChartsOption = {
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const dataIndex = params.dataIndex;
                    const item = topCategories[dataIndex];
                    const value = `฿${Number(params.value).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
                    const orderCount = `${item.orderCount.toLocaleString('th-TH')} รายการ`;
                    const percent = params.percent;

                    return `
                        <div style="font-weight: bold; margin-bottom: 8px;">${params.name}</div>
                        <div style="margin-bottom: 4px;">
                            ${params.marker} ยอดขาย: <strong>${value}</strong> (${percent}%)
                        </div>
                        <div style="margin-bottom: 4px; padding-left: 14px; font-size: 0.9em; color: #666;">
                            จำนวนออเดอร์: ${orderCount}
                        </div>
                    `;
                },
            },
            legend: {
                top: '5%',
                left: 'center',
                type: 'scroll', // Allow scrolling if many categories
            },
            series: [
                {
                    name: 'ยอดขายตามหมวดหมู่',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    padAngle: 2, // Creates gap between slices
                    itemStyle: {
                        borderRadius: 6,
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold',
                            formatter: '{b}\n{c} ({d}%)' // Show name, value, percent on hover center
                        },
                        scale: true,
                        scaleSize: 10
                    },
                    labelLine: {
                        show: false
                    },
                    data: chartData,
                }
            ]
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
