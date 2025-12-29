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

export const RadarDashboard: React.FC<Props> = ({ data }) => {
    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="var(--glass-border)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                    <Radar
                        name="Node Health"
                        dataKey="health"
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        fillOpacity={0.5}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-panel)', border: 'var(--glass-border)', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--primary)' }}
                    />
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
