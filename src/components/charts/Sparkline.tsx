'use client';

interface SparklineProps {
    data: Array<{ month: string; sales: number }>;
    width?: number;
    height?: number;
    color?: string;
}

export function Sparkline({
    data,
    width = 80,
    height = 24,
    color = '#6366f1'
}: SparklineProps) {
    if (!data || data.length === 0) {
        return <div className="w-[80px] h-[24px] bg-muted/20 rounded" />;
    }

    // Find min and max for scaling
    const values = data.map(d => d.sales);
    const max = Math.max(...values, 1); // Avoid division by zero
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    // Generate SVG path
    const points = data.map((d, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * width;
        const y = height - ((d.sales - min) / range) * height;
        return `${x},${y}`;
    });

    const path = `M ${points.join(' L ')}`;

    // Determine trend color
    const isUptrend = data.length > 1 && data[data.length - 1].sales > data[0].sales;
    const strokeColor = isUptrend ? '#10b981' : '#ef4444';

    return (
        <svg
            width={width}
            height={height}
            className="inline-block"
            viewBox={`0 0 ${width} ${height}`}
        >
            <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
