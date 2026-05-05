'use client';

import ReactECharts from 'echarts-for-react';

interface ProfitLossChartProps {
    data: {
        month: string;
        revenue: number;
        expenses: number;
        profit: number;
    }[];
}

export function ProfitLossChart({ data }: ProfitLossChartProps) {
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function (params: any) {
                let tooltip = `<div class="font-bold mb-2">${params[0].axisValue}</div>`;
                params.forEach((param: any) => {
                    const color = param.color;
                    const value = param.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    tooltip += `
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-2">
                                <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>
                                <span>${param.seriesName}</span>
                            </div>
                            <span class="font-mono font-medium">฿${value}</span>
                        </div>
                    `;
                });
                return tooltip;
            },
            backgroundColor: '#fff',
            borderColor: '#f1f5f9',
            textStyle: {
                color: '#1e293b'
            },
            extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px; padding: 12px;'
        },
        legend: {
            data: ['รายได้', 'ค่าใช้จ่าย', 'กำไร(ขาดทุน)'],
            bottom: 0,
            textStyle: {
                color: '#64748b'
            }
        },
        grid: {
            top: 30,
            right: 20,
            left: 20,
            bottom: 40,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(item => item.month),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
                color: '#64748b',
                fontSize: 12,
                margin: 10
            }
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
                lineStyle: {
                    color: '#f1f5f9'
                }
            },
            axisLabel: {
                color: '#64748b',
                fontSize: 12,
                formatter: (value: number) => `฿${(value / 1000).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}k`
            }
        },
        series: [
            {
                name: 'รายได้',
                type: 'bar',
                data: data.map(item => item.revenue),
                itemStyle: {
                    color: '#10b981',
                    borderRadius: [4, 4, 0, 0]
                },
                barGap: '20%'
            },
            {
                name: 'ค่าใช้จ่าย',
                type: 'bar',
                data: data.map(item => item.expenses),
                itemStyle: {
                    color: '#ef4444',
                    borderRadius: [4, 4, 0, 0]
                }
            },
            {
                name: 'กำไร(ขาดทุน)',
                type: 'line',
                data: data.map(item => item.profit),
                itemStyle: {
                    color: '#3b82f6'
                },
                lineStyle: {
                    width: 3
                },
                symbol: 'circle',
                symbolSize: 8
            }
        ]
    };

    return (
        <div className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] w-full">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
