/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../services/api';

// --- Types ---
interface NodeData {
    id: string;
    name: string;
    description: string;
    color: string;
    health?: number;
    is_central?: boolean;
    generates_revenue?: boolean;
}

interface Interaction {
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string;
    type: 'one-way' | 'mutual';
}

interface Props {
    nodes: NodeData[];
}



// --- Custom Node: Satellite ---
function SatelliteNode(props: any) {
    const { data } = props;

    return (
        <div
            className="relative group"
            onClick={data.onClick}
            style={{ cursor: 'pointer' }}
        >
            {/* Handles at 8 positions for flexible edge routing */}
            {/* Cardinal directions */}
            <Handle type="target" position={Position.Top} id="target-top" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Top} id="source-top" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Left} id="target-left" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Left} id="source-left" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Right} id="target-right" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Right} id="source-right" style={{ opacity: 0 }} />
            {/* Diagonal directions */}
            <Handle type="target" position={Position.Top} id="target-top-right" style={{ opacity: 0, left: '80%' }} />
            <Handle type="source" position={Position.Top} id="source-top-right" style={{ opacity: 0, left: '80%' }} />
            <Handle type="target" position={Position.Top} id="target-top-left" style={{ opacity: 0, left: '20%' }} />
            <Handle type="source" position={Position.Top} id="source-top-left" style={{ opacity: 0, left: '20%' }} />
            <Handle type="target" position={Position.Bottom} id="target-bottom-right" style={{ opacity: 0, left: '80%' }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom-right" style={{ opacity: 0, left: '80%' }} />
            <Handle type="target" position={Position.Bottom} id="target-bottom-left" style={{ opacity: 0, left: '20%' }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom-left" style={{ opacity: 0, left: '20%' }} />

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '40px 24px 50px 24px',
                    borderRadius: '32px',
                    backgroundColor: '#F6F4EC',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                    width: '240px',
                    height: '280px',
                    boxSizing: 'border-box',
                    position: 'relative'
                }}
            >
                {/* Revenue Badge */}
                {data.generates_revenue && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: '3px solid #132230',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.6), 0 4px 8px rgba(0,0,0,0.3)',
                            zIndex: 10,
                            animation: 'pulse-revenue 2s ease-in-out infinite'
                        }}
                    >
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>💰</span>
                    </div>
                )}

                {/* Title Pill */}
                <div
                    style={{
                        backgroundColor: data.color || '#64748b',
                        color: '#132230',
                        border: '2px solid #132230',
                        borderRadius: '50px',
                        padding: '8px 20px',
                        fontWeight: 700,
                        fontSize: '14px',
                        marginBottom: '24px',
                        maxWidth: '100%',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        lineHeight: '1.3',
                        textAlign: 'center'
                    }}
                >
                    {data.name}
                </div>

                {/* Description */}
                <p
                    style={{
                        margin: 0,
                        color: '#475569',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        padding: '0 5px',
                        width: '100%',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        textAlign: 'center'
                    }}
                >
                    {data.description}
                </p>
            </div>
        </div>
    );
}

// --- Custom Node: Sun (Central) ---
function SunNode(props: any) {
    const { data } = props;
    // satelliteAngles: array of { id: string, angle: number } for each satellite
    const satelliteAngles = data.satelliteAngles || [];

    // Calculate handle positions on the OUTER edge of the colored ring
    const RING_RADIUS = 195; // Outer edge of the gradient ring (node is 400px, so radius 200 minus small padding)
    const NODE_SIZE = 400;
    const CENTER = NODE_SIZE / 2;

    return (
        <div
            onClick={data.onClick}
            style={{
                position: 'relative',
                width: '400px',
                height: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
            }}
        >
            {/* Dynamic handles positioned at the center of each satellite's color segment */}
            {satelliteAngles.map((sat: { id: string; angle: number }) => {
                // Calculate position on the ring for this satellite's color segment
                // The angle is already calculated to be at the center of the segment
                const handleX = CENTER + RING_RADIUS * Math.cos(sat.angle);
                const handleY = CENTER + RING_RADIUS * Math.sin(sat.angle);

                return (
                    <React.Fragment key={sat.id}>
                        <Handle
                            type="target"
                            position={Position.Top}
                            id={`target-${sat.id}`}
                            style={{
                                opacity: 0,
                                position: 'absolute',
                                left: `${handleX}px`,
                                top: `${handleY}px`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        />
                        <Handle
                            type="source"
                            position={Position.Top}
                            id={`source-${sat.id}`}
                            style={{
                                opacity: 0,
                                position: 'absolute',
                                left: `${handleX}px`,
                                top: `${handleY}px`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        />
                    </React.Fragment>
                );
            })}

            {/* Fallback handles for non-satellite connections */}
            <Handle type="target" position={Position.Top} id="target-top" style={{ opacity: 0, top: '50px' }} />
            <Handle type="source" position={Position.Top} id="source-top" style={{ opacity: 0, top: '50px' }} />
            <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ opacity: 0, bottom: '50px' }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ opacity: 0, bottom: '50px' }} />
            <Handle type="target" position={Position.Left} id="target-left" style={{ opacity: 0, left: '50px' }} />
            <Handle type="source" position={Position.Left} id="source-left" style={{ opacity: 0, left: '50px' }} />
            <Handle type="target" position={Position.Right} id="target-right" style={{ opacity: 0, right: '50px' }} />
            <Handle type="source" position={Position.Right} id="source-right" style={{ opacity: 0, right: '50px' }} />

            {/* Colored Ring with conic gradient */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: data.gradient,
                    boxShadow: '0 0 0 10px #132230',
                    zIndex: 5
                }}
            />

            {/* Center circle with name */}
            <div
                style={{
                    position: 'absolute',
                    width: '220px',
                    height: '220px',
                    borderRadius: '50%',
                    backgroundColor: '#F6F4EC',
                    border: '10px solid #132230',
                    color: '#132230',
                    zIndex: 20,
                    padding: '0 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <h1
                    style={{
                        fontWeight: 800,
                        fontSize: '12px',
                        width: '100%',
                        textAlign: 'center',
                        wordWrap: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: '1.2',
                        margin: 0,
                        padding: 0
                    }}
                >
                    {data.name}
                </h1>
            </div>
        </div>
    );
}

const nodeTypes = {
    satellite: SatelliteNode,
    sun: SunNode,
};

// --- Circular Layout Algorithm with Smart Anchors ---
function getCircularLayout(
    nodesData: NodeData[],
    interactions: Interaction[],
    onNodeClick: () => void
): { nodes: any[]; edges: any[]; nodeAngles: Map<string, number> } {
    const centerX = 600;
    const centerY = 500;
    const ORBIT_RADIUS = 500;

    const centralNode = nodesData.find(n => n.is_central) ||
        nodesData.find(n => n.name.toLowerCase().includes('motor')) ||
        nodesData[0];

    if (!centralNode) {
        return { nodes: [], edges: [], nodeAngles: new Map() };
    }

    const satellites = nodesData.filter(n => n.id !== centralNode.id);
    const nodeAngles = new Map<string, number>();

    const rfNodes: any[] = [];
    const rfEdges: any[] = [];

    // Generate conic gradient for central node
    const generateGradient = () => {
        if (satellites.length === 0) return 'gray';
        const count = satellites.length;
        const degPerNode = 360 / count;
        const offset = degPerNode / 2;
        const stops = satellites.map((node, i) => {
            const start = i * degPerNode;
            const end = (i + 1) * degPerNode;
            return `${node.color} ${start}deg ${end}deg`;
        });
        return `conic-gradient(from -${offset}deg, ${stops.join(', ')})`;
    };

    // Calculate satellite angles FIRST so we can pass them to the Sun node
    const satelliteAngles: { id: string; angle: number }[] = [];
    satellites.forEach((node, index) => {
        const angle = (index / satellites.length) * 2 * Math.PI - (Math.PI / 2);
        satelliteAngles.push({ id: node.id, angle });
    });

    // 1. Central Node (Sun) - with satellite angles for dynamic handle positioning
    rfNodes.push({
        id: centralNode.id,
        type: 'sun',
        position: { x: centerX - 200, y: centerY - 200 },
        data: {
            ...centralNode,
            label: centralNode.name,
            gradient: generateGradient(),
            onClick: onNodeClick,
            satelliteAngles: satelliteAngles
        },
        draggable: true,
    });

    // 2. Satellites in circle
    satellites.forEach((node, index) => {
        const angle = (index / satellites.length) * 2 * Math.PI - (Math.PI / 2);
        const x = centerX + ORBIT_RADIUS * Math.cos(angle) - 120;
        const y = centerY + ORBIT_RADIUS * Math.sin(angle) - 140;

        rfNodes.push({
            id: node.id,
            type: 'satellite',
            position: { x, y },
            data: {
                ...node,
                label: node.name,
                onClick: onNodeClick
            },
            draggable: true,
        });
    });

    // Store node positions for edge routing
    const nodePositions = new Map<string, { x: number; y: number }>();
    rfNodes.forEach(node => {
        // Calculate center of node based on position and size
        const width = node.type === 'sun' ? 400 : 240;
        const height = node.type === 'sun' ? 400 : 280;
        nodePositions.set(node.id, {
            x: node.position.x + width / 2,
            y: node.position.y + height / 2
        });
    });

    // Helper: Calculate best handle based on actual positions (returns handle direction string)
    function getBestHandleForConnection(
        fromPos: { x: number; y: number },
        toPos: { x: number; y: number }
    ): string {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;

        // Calculate angle in radians, then convert to degrees
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = ((angleRad * 180 / Math.PI) + 360) % 360;

        // 8-direction selection based on 45° segments
        // 0° = right, 90° = down, 180° = left, 270° = up
        if (angleDeg >= 337.5 || angleDeg < 22.5) {
            return 'right';
        } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
            return 'bottom-right';
        } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
            return 'bottom';
        } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
            return 'bottom-left';
        } else if (angleDeg >= 157.5 && angleDeg < 202.5) {
            return 'left';
        } else if (angleDeg >= 202.5 && angleDeg < 247.5) {
            return 'top-left';
        } else if (angleDeg >= 247.5 && angleDeg < 292.5) {
            return 'top';
        } else {
            return 'top-right';
        }
    }

    // 3. Create Edges from INTERACTIONS only (database-driven)
    interactions.forEach((inter) => {
        const cleanLabel = inter.label.replace(/^(Output|Input):\s*/i, '');

        const sourcePos = nodePositions.get(inter.source_node_id);
        const targetPos = nodePositions.get(inter.target_node_id);

        if (!sourcePos || !targetPos) return;

        // Determine if this involves the central node
        const isSourceCentral = inter.source_node_id === centralNode.id;
        const isTargetCentral = inter.target_node_id === centralNode.id;

        let sourceHandlePos: string;
        let targetHandlePos: string;

        if (isSourceCentral) {
            // Source is Sun - use target satellite's ID as the handle
            sourceHandlePos = `source-${inter.target_node_id}`;
            targetHandlePos = `target-${getBestHandleForConnection(targetPos, sourcePos)}`;
        } else if (isTargetCentral) {
            // Target is Sun - use source satellite's ID as the handle
            sourceHandlePos = `source-${getBestHandleForConnection(sourcePos, targetPos)}`;
            targetHandlePos = `target-${inter.source_node_id}`;
        } else {
            // Satellite to satellite
            sourceHandlePos = `source-${getBestHandleForConnection(sourcePos, targetPos)}`;
            targetHandlePos = `target-${getBestHandleForConnection(targetPos, sourcePos)}`;
        }

        rfEdges.push({
            id: inter.id,
            source: inter.source_node_id,
            target: inter.target_node_id,
            sourceHandle: sourceHandlePos,
            targetHandle: targetHandlePos,
            label: cleanLabel,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
            labelStyle: { fill: '#e2e8f0', fontWeight: 600, fontSize: 11 },
            labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#94a3b8',
            },
        });
    });

    return { nodes: rfNodes, edges: rfEdges, nodeAngles };
}

// --- Main Component ---
export const SolarSystemFlow: React.FC<Props> = ({ nodes: rawNodes }) => {
    const navigate = useNavigate();
    const [interactions, setInteractions] = useState<Interaction[]>([]);

    useEffect(() => {
        const loadInteractions = async () => {
            try {
                const data = await api.getInteractions();
                setInteractions(data);
            } catch (err) {
                console.error('Failed to load interactions:', err);
            }
        };
        loadInteractions();
    }, []);

    const handleNodeClick = useCallback(() => {
        navigate('/nodes');
    }, [navigate]);

    const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
        () => getCircularLayout(rawNodes, interactions, handleNodeClick),
        [rawNodes, interactions, handleNodeClick]
    );

    const [rfNodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
    const [rfEdges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

    // Update nodes when data changes
    useEffect(() => {
        const { nodes: newNodes, edges: newEdges } = getCircularLayout(rawNodes, interactions, handleNodeClick);
        if (newNodes.length > 0) {
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [rawNodes, interactions, handleNodeClick, setNodes, setEdges]);

    if (rawNodes.length === 0) {
        return <p>No hay nodos configurados.</p>;
    }

    return (
        <>
            <style>{`
                @keyframes pulse-revenue {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 15px rgba(16, 185, 129, 0.6), 0 4px 8px rgba(0,0,0,0.3);
                    }
                    50% {
                        transform: scale(1.1);
                        box-shadow: 0 0 25px rgba(16, 185, 129, 0.9), 0 6px 12px rgba(0,0,0,0.4);
                    }
                }
                .react-flow__node {
                    z-index: 10 !important;
                }
                .react-flow__edge-path {
                    stroke-width: 2;
                }
                .react-flow__edge.animated path {
                    stroke-dasharray: 5;
                    animation: dashdraw 0.5s linear infinite;
                }
                @keyframes dashdraw {
                    from { stroke-dashoffset: 10; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
            <div style={{ width: '100%', height: '900px' }}>
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.3}
                    maxZoom={1.5}
                    attributionPosition="bottom-right"
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#334155" gap={30} size={1} />
                    <Controls
                        style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    />
                </ReactFlow>
            </div>
        </>
    );
};
