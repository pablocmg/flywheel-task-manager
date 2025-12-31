import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SolarSystemNode } from '../components/SolarSystemNode';

interface NodeData {
    id: string;
    name: string;
    description: string;
    color: string;
    health: number;
    fullMark: number;
    is_central?: boolean;
    is_active?: boolean;
    generates_revenue?: boolean;
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
                    description: n.description || '',
                    color: n.color || '#64748b',
                    health: n.health || 100, // Default to 100 if null
                    fullMark: 100,
                    is_central: n.is_central,
                    is_active: n.is_active,
                    generates_revenue: n.generates_revenue
                }));

                // Filter out inactive nodes
                const activeNodes = formatted.filter((n: any) => n.is_active !== false);
                setNodeData(activeNodes);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        loadJava();
    }, []);

    return (
        <div>
            <h1>Panel Estratégico</h1>
            <p className="text-muted">Vista en tiempo real de la Salud del Flywheel e Interdependencias.</p>

            <div className="glass-panel" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-lg)', minHeight: '800px' }}>
                {loading ? <p>Cargando datos del Flywheel...</p> : (
                    <div className="w-full h-full">
                        <h3 className="title-gradient text-center" style={{ marginBottom: 'var(--space-lg)' }}>Vista del Sistema Solar</h3>
                        {nodeData.length > 0 ? (
                            <SolarSystemNode nodes={nodeData} />
                        ) : (
                            <p>No hay nodos configurados. Ve a "Config Nodos" para configurar tu Flywheel.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
