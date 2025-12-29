import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RadarDashboard } from '../components/RadarDashboard';

interface NodeData {
    id: string;
    name: string;
    health: number;
    fullMark: number;
}

const Dashboard: React.FC = () => {
    const [nodeData, setNodeData] = useState<NodeData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadJava = async () => {
            try {
                const nodes = await api.getNodes();
                // Map to format
                const formatted = nodes.map((n: any) => ({
                    id: n.id,
                    name: n.name,
                    health: n.health || 100, // Default to 100 if null
                    fullMark: 100
                }));
                setNodeData(formatted);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        loadJava();
    }, []);

    return (
        <div>
            <h1>Strategic Dashboard</h1>
            <p className="text-muted">Real-time view of Flywheel Health and Interdependencies.</p>

            <div className="glass-panel" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                {loading ? <p>Loading Flywheel Data...</p> : (
                    <>
                        <h3 className="title-gradient">Flywheel Balance Radar</h3>
                        {nodeData.length > 0 ? (
                            <RadarDashboard data={nodeData} />
                        ) : (
                            <p>No nodes configured. Go to "Nodes Config" to set up your Flywheel.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
