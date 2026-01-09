// @ts-nocheck
import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';

interface NodeHealth {
    id: string;
    name: string;
    health: number; // 0-100
    fullMark: number;
}

interface Props {
    data: NodeHealth[];
}

const getHealthColor = (health: number) => {
    if (health < 30) return 'var(--danger)'; // Red
    if (health < 70) return 'var(--warning)'; // Amber
    return 'var(--success)'; // Green
};

const CustomTick = ({ payload, x, y, textAnchor, stroke, radius, data }: any) => {
    const node = data.find((d: any) => d.name === payload.value);
    const color = node ? getHealthColor(node.health) : 'var(--text-secondary)';

    return (
        <g className="recharts-layer recharts-polar-angle-axis-tick">
            <text
                radius={radius}
                stroke={stroke}
                x={x}
                y={y}
                className="recharts-text recharts-polar-angle-axis-tick-value"
                textAnchor={textAnchor}
            >
                <tspan x={x} dy="0em" fill={color} fontWeight="bold">
                    {payload.value}
                </tspan>
                <tspan x={x} dy="1em" fill="var(--text-muted)" fontSize="0.8em">
                    {node?.health}%
                </tspan>
            </text>
        </g>
    );
};

export const RadarDashboard: React.FC<Props> = ({ data }) => {
    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                {/* @ts-ignore - Recharts children type mismatch */}
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="var(--glass-border)" />
                    {/* @ts-ignore - Recharts type definition mismatch */}
                    <PolarAngleAxis
                        dataKey="name"
                        tick={(props) => <CustomTick {...props} data={data} />}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                    <Radar
                        name="Node Health"
                        dataKey="health"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.4}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-panel)', border: 'var(--glass-border)', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--primary)' }}
                        formatter={(value: any) => [value + '%', 'Health']}
                    />
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
