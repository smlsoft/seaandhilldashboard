'use client';

import ReactECharts from 'echarts-for-react';

export function SalesChart({ data }: { data: any[] }) {
    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params: any) {
                const date = params[0].axisValue;
                const value = params[0].data;
                return `${date}<br/>Sales: ฿${value.toLocaleString()}`;
            },
            backgroundColor: '#fff',
            borderColor: '#f1f5f9',
            textStyle: {
                color: '#1e293b'
            },
            extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;'
        },
        grid: {
            top: 10,
            right: 30,
            left: 20,
            bottom: 0,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(item => item.date),
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
                formatter: (value: number) => `฿${value.toLocaleString()}`
            }
        },
        series: [
            {
                name: 'Sales',
                type: 'line',
                smooth: true,
                showSymbol: false,
                symbol: 'circle',
                symbolSize: 6,
                data: data.map(item => item.sales),
                itemStyle: {
                    color: '#6366f1'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: 'rgba(99, 102, 241, 0.5)' // color at 0%
                            },
                            {
                                offset: 1,
                                color: 'rgba(99, 102, 241, 0)' // color at 100%
                            }
                        ],
                        global: false // default is false
                    }
                },
                lineStyle: {
                    width: 2
                }
            }
        ]
    };

    return (
        <div className="h-[250px] sm:h-[280px] md:h-[320px] lg:h-[350px] w-full">
            <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
