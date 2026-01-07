import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Node {
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
    nodes: Node[];
}

// Card Dimensions
const CARD_WIDTH = 240;
const CARD_HEIGHT = 280;
const SUN_RADIUS = 200;

export const SolarSystemNode: React.FC<Props> = ({ nodes }) => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [centralNodeId, setCentralNodeId] = useState<string | null>(null);

    // Responsive Observer
    useEffect(() => {
        const updateDimensions = () => {
            let w = 1000;
            let h = 800;

            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0) w = clientWidth;
                if (clientHeight > 0) h = clientHeight;
            }

            setDimensions({ width: w, height: h });
        };

        updateDimensions();

        let observer: ResizeObserver | null = null;
        if (containerRef.current) {
            observer = new ResizeObserver(updateDimensions);
            observer.observe(containerRef.current);
        }

        const timeout = setTimeout(updateDimensions, 100);

        return () => {
            if (observer) observer.disconnect();
            clearTimeout(timeout);
        };
    }, []);

    useEffect(() => {
        loadInteractions();

        if (nodes.length > 0) {
            const configCenter = nodes.find(n => n.is_central);

            if (configCenter) {
                setCentralNodeId(configCenter.id);
            } else {
                const currentCenterExists = nodes.find(n => n.id === centralNodeId);

                if (!centralNodeId || !currentCenterExists) {
                    const defaultCenter = nodes.find(n => n.name.toLowerCase().includes('motor')) || nodes[0];
                    setCentralNodeId(defaultCenter.id);
                }
            }
        }
    }, [nodes]);

    const loadInteractions = async () => {
        try {
            const data = await api.getInteractions();
            setInteractions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const nodePositions = useMemo(() => {
        if (!centralNodeId) return {};

        const { width, height } = dimensions;
        if (width === 0 || height === 0) return {};

        const centerX = width / 2;
        const centerY = (height / 2) + 40;

        const positions: Record<string, { x: number, y: number, width: number, height: number, isSun: boolean }> = {};
        const orbitalNodes = nodes.filter(n => n.id !== centralNodeId);

        positions[centralNodeId] = { x: centerX, y: centerY, width: SUN_RADIUS * 2, height: SUN_RADIUS * 2, isSun: true };

        const ORBIT_RADIUS_X = Math.max(400, Math.min(width * 0.48, 650));
        const ORBIT_RADIUS_Y = Math.max(380, Math.min(height * 0.45, 420));

        orbitalNodes.forEach((node, index) => {
            const count = orbitalNodes.length;
            const angle = (index / count) * 2 * Math.PI - (Math.PI / 2);

            positions[node.id] = {
                x: centerX + ORBIT_RADIUS_X * Math.cos(angle),
                y: centerY + ORBIT_RADIUS_Y * Math.sin(angle),
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                isSun: false
            };
        });

        return positions;
    }, [nodes, centralNodeId, dimensions]);

    // Generate Conic Gradient for Central Node
    const centerGradient = useMemo(() => {
        const orbitalNodes = nodes.filter(n => n.id !== centralNodeId);
        if (orbitalNodes.length === 0) return 'gray';

        const count = orbitalNodes.length;
        const degPerNode = 360 / count;
        const offset = degPerNode / 2;

        const stops = orbitalNodes.map((node, i) => {
            const start = i * degPerNode;
            const end = (i + 1) * degPerNode;
            return `${node.color} ${start}deg ${end}deg`;
        });

        return `conic-gradient(from -${offset}deg, ${stops.join(', ')})`;
    }, [nodes, centralNodeId]);

    // Map satellite nodes to what they send to the core
    const nodeToCoreLabels = useMemo(() => {
        if (!centralNodeId) return {};
        const labels: Record<string, string> = {};
        interactions.forEach(inter => {
            // If this satellite sends to the core
            if (inter.target_node_id === centralNodeId && inter.source_node_id !== centralNodeId) {
                labels[inter.source_node_id] = inter.label;
            }
        });
        return labels;
    }, [interactions, centralNodeId]);

    // Positions for labels around the core ring
    const coreLabelPositions = useMemo(() => {
        if (!centralNodeId) return [];
        const orbitalNodes = nodes.filter(n => n.id !== centralNodeId);
        const count = orbitalNodes.length;
        if (count === 0) return [];

        const degPerNode = 360 / count;
        const offset = degPerNode / 2;
        // Position labels in the middle of the colored ring
        const labelRadius = 155; // Centered on the colored ring

        return orbitalNodes.map((node, i) => {
            // Calculate angle for the center of this node's segment
            const angleDeg = (i * degPerNode) - offset + (degPerNode / 2) - 90; // -90 to start from top
            const angleRad = (angleDeg * Math.PI) / 180;
            return {
                nodeId: node.id,
                color: node.color,
                x: Math.cos(angleRad) * labelRadius,
                y: Math.sin(angleRad) * labelRadius,
                angleDeg,
                label: nodeToCoreLabels[node.id] || ''
            };
        });
    }, [nodes, centralNodeId, nodeToCoreLabels]);

    // State for real DOM positions
    const [realNodePositions, setRealNodePositions] = useState<Record<string, { x: number, y: number }>>({});

    // DOM-based measurement for perfect alignment
    const [arrowLines, setArrowLines] = useState<Array<{ id: string, x1: number, y1: number, x2: number, y2: number }>>([]);

    useLayoutEffect(() => {
        if (!centralNodeId || nodes.length === 0) return;

        const timer = requestAnimationFrame(() => {
            const container = containerRef.current;
            if (!container) return;
            const containerRect = container.getBoundingClientRect();

            const newLines: typeof arrowLines = [];
            const newRealPositions: Record<string, { x: number, y: number }> = {};

            nodes.forEach(node => {
                const el = document.getElementById(`node-${node.id}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const centerX = (rect.left - containerRect.left) + (rect.width / 2);
                    const centerY = (rect.top - containerRect.top) + (rect.height / 2);
                    newRealPositions[node.id] = { x: centerX, y: centerY };
                }
            });

            setRealNodePositions(newRealPositions);

            const sunPos = newRealPositions[centralNodeId];
            if (sunPos) {
                nodes.filter(n => n.id !== centralNodeId).forEach(node => {
                    const nodePos = newRealPositions[node.id];
                    if (nodePos) {
                        const dx = sunPos.x - nodePos.x;
                        const dy = sunPos.y - nodePos.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx);

                        const offsetAmt = 15;
                        const perpX = (-dy / dist) * offsetAmt;
                        const perpY = (dx / dist) * offsetAmt;

                        const startDist = 140;
                        const endDist = dist - 170;

                        newLines.push({
                            id: node.id,
                            x1: (nodePos.x + Math.cos(angle) * startDist) + perpX,
                            y1: (nodePos.y + Math.sin(angle) * startDist) + perpY,
                            x2: (nodePos.x + Math.cos(angle) * endDist) + perpX,
                            y2: (nodePos.y + Math.sin(angle) * endDist) + perpY
                        });
                    }
                });
                setArrowLines(newLines);
            }
        });
        return () => cancelAnimationFrame(timer);
    }, [nodes, centralNodeId, dimensions, realNodePositions]);

    const handleNodeClick = () => {
        // Navigate to node config on click
        navigate(`/nodes`);
    };

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
            `}</style>
            <div className="w-full h-full flex flex-col items-center">
                <div className="flex gap-4 mb-4 z-10 w-full justify-center items-center px-4">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Mapa del Ecosistema
                    </h2>
                </div>

                <div
                    ref={containerRef}
                    className="w-full relative"
                    style={{
                        height: '1000px',
                        overflow: 'visible'
                    }}
                >
                    <svg width="100%" height="100%" className="absolute top-0 left-0 pointer-events-none z-30 overflow-visible">
                        <defs>
                            <marker id="arrowhead" markerWidth="12" markerHeight="9" refX="0" refY="4.5" orient="auto">
                                <polygon points="0 0, 12 4.5, 0 9" fill="#94a3b8" />
                            </marker>
                            <marker id="stylizedArrow" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">
                                <path d="M0,0 L5,2.5 L0,5 L1.5,2.5 Z" fill="#F6F4EC" />
                            </marker>
                            <marker id="stylizedArrowReverse" markerWidth="5" markerHeight="5" refX="0" refY="2.5" orient="auto">
                                <path d="M5,0 L0,2.5 L5,5 L3.5,2.5 Z" fill="#F6F4EC" />
                            </marker>
                        </defs>

                        {/* Orbital Connectors - White arrows from nodes to core */}
                        {arrowLines.map(line => (
                            <line
                                key={`arrow-${line.id}`}
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke="#F6F4EC"
                                strokeWidth="4"
                                strokeLinecap="round"
                                opacity="1"
                                markerStart="none"
                                markerEnd="url(#stylizedArrow)"
                            />
                        ))}

                        {/* Interaction Lines - For core→satellite and satellite→satellite */}
                        {interactions
                            .filter(inter => {
                                // Exclude satellite -> core interactions (white arrows already represent those)
                                if (inter.target_node_id === centralNodeId && inter.source_node_id !== centralNodeId) {
                                    return false;
                                }
                                return true;
                            })
                            .map(inter => {
                                const start = realNodePositions[inter.source_node_id];
                                const end = realNodePositions[inter.target_node_id];

                                if (!start || !end) return null;

                                const dx = end.x - start.x;
                                const dy = end.y - start.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                if (dist === 0) return null;

                                // Check if core is involved
                                const isFromCore = inter.source_node_id === centralNodeId;
                                const isToCore = inter.target_node_id === centralNodeId;
                                const isCentralInteraction = isFromCore || isToCore;

                                // Calculate proper start and end points
                                const angle = Math.atan2(dy, dx);

                                // Offset from center of nodes (core is bigger)
                                const startOffset = isFromCore ? 210 : 130;
                                const endOffset = isToCore ? 210 : 155; // More space for satellite nodes

                                const startX = start.x + Math.cos(angle) * startOffset;
                                const startY = start.y + Math.sin(angle) * startOffset;
                                const endX = end.x - Math.cos(angle) * endOffset;
                                const endY = end.y - Math.sin(angle) * endOffset;

                                let cpX = (startX + endX) / 2;
                                let cpY = (startY + endY) / 2;

                                if (isCentralInteraction) {
                                    const curveAmount = 40;
                                    const perpX = -dy / dist;
                                    const perpY = dx / dist;
                                    cpX += perpX * curveAmount;
                                    cpY += perpY * curveAmount;
                                }

                                // Get node names for direction indicator
                                const sourceNode = nodes.find(n => n.id === inter.source_node_id);
                                const targetNode = nodes.find(n => n.id === inter.target_node_id);
                                const sourceName = sourceNode?.name.substring(0, 8) || '?';
                                const targetName = targetNode?.name.substring(0, 8) || '?';
                                const cleanLabel = inter.label.replace(/^(Output|Input):\s*/i, '');

                                return (
                                    <g key={inter.id}>
                                        <path
                                            d={`M${startX},${startY} Q${cpX},${cpY} ${endX},${endY}`}
                                            stroke="rgba(148, 163, 184, 0.8)"
                                            strokeWidth="2.5"
                                            fill="none"
                                            markerEnd="url(#arrowhead)"
                                        />
                                        {/* Direction label box */}
                                        <rect x={cpX - 70} y={cpY - 22} width="140" height="44" rx="8" fill="#0f172a" stroke="rgba(148,163,184,0.4)" strokeWidth="1" />
                                        {/* Direction indicator */}
                                        <text x={cpX} y={cpY - 6} fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="400">
                                            {sourceName}... → {targetName}...
                                        </text>
                                        {/* Main label */}
                                        <text x={cpX} y={cpY + 12} fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="600">
                                            {cleanLabel}
                                        </text>
                                    </g>
                                );
                            })}
                    </svg>

                    {/* HTML Nodes Layer */}
                    {nodes.map(node => {
                        const pos = nodePositions[node.id];
                        if (!pos) return null;
                        const isCenter = pos.isSun;

                        return (
                            <div
                                key={node.id}
                                id={`node-${node.id}`}
                                onClick={() => handleNodeClick()}
                                className={`flex flex-col items-center justify-center text-center transition-all duration-700 ease-out z-20 group
                                ${isCenter ? 'overflow-visible' : ''} 
                            `}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: `${pos.width}px`,
                                    height: `${pos.height}px`,
                                    transform: `translate3d(${pos.x - pos.width / 2}px, ${pos.y - pos.height / 2}px, 0)`,
                                    borderRadius: isCenter ? '50%' : '32px',
                                    background: 'transparent',
                                    border: 'none',
                                    boxShadow: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                {/* Sun Content */}
                                {isCenter && (
                                    <div
                                        className="relative flex items-center justify-center overflow-visible"
                                        style={{ width: '400px', height: '400px' }}
                                    >
                                        {/* Colored Ring with gradient */}
                                        <div
                                            className="absolute"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                background: centerGradient,
                                                boxShadow: '0 0 0 10px #132230',
                                                zIndex: 5
                                            }}
                                        ></div>

                                        {/* Labels around the ring for what nodes send to core */}
                                        {coreLabelPositions.map(labelPos => (
                                            labelPos.label && (
                                                <div
                                                    key={`core-label-${labelPos.nodeId}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: '50%',
                                                        top: '50%',
                                                        transform: `translate(calc(-50% + ${labelPos.x}px), calc(-50% + ${labelPos.y}px))`,
                                                        zIndex: 15,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    <span style={{
                                                        color: 'white',
                                                        fontSize: '9px',
                                                        fontWeight: 600,
                                                        background: 'rgba(0, 0, 0, 0.6)',
                                                        padding: '3px 6px',
                                                        borderRadius: '4px',
                                                        whiteSpace: 'normal',
                                                        width: '70px',
                                                        display: 'block',
                                                        textAlign: 'center',
                                                        lineHeight: '1.3'
                                                    }}>
                                                        {labelPos.label.replace(/^(Output|Input):\s*/i, '')}
                                                    </span>
                                                </div>
                                            )
                                        ))}

                                        {/* Center circle with name */}
                                        <div
                                            className="absolute z-20"
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
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
                                                className="font-extrabold leading-tight"
                                                style={{
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
                                                {node.name}
                                            </h1>
                                        </div>
                                    </div>
                                )}

                                {!isCenter && (
                                    <div
                                        className="w-full h-full flex flex-col items-center relative"
                                        style={{
                                            backgroundColor: '#F6F4EC',
                                            borderRadius: '32px',
                                            padding: '40px 24px 50px 24px',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        {/* Revenue Badge */}
                                        {node.generates_revenue && (
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
                                        <div
                                            className="inline-block shrink-0 text-center"
                                            style={{
                                                backgroundColor: node.color,
                                                color: '#132230',
                                                border: '2px solid #132230',
                                                borderRadius: '50px',
                                                padding: '8px 20px',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                marginBottom: '24px',
                                                width: 'auto',
                                                maxWidth: '100%',
                                                wordWrap: 'break-word',
                                                overflowWrap: 'break-word',
                                                lineHeight: '1.3'
                                            }}
                                        >
                                            {node.name}
                                        </div>

                                        <p
                                            className="m-0"
                                            style={{
                                                color: '#475569',
                                                fontSize: '15px',
                                                lineHeight: '1.5',
                                                padding: '0 5px',
                                                width: '100%',
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 4,
                                                WebkitBoxOrient: 'vertical'
                                            }}
                                        >
                                            {node.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div >
            </div >
        </>
    );
};
