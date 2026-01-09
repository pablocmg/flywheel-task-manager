import React from 'react';
import { Circle, Clock, ExternalLink } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    status: 'Backlog' | 'Todo' | 'Doing' | 'Waiting' | 'Done' | string;
    weight: number;
    priority_score: number;
    evidence_url?: string;
    objective_title?: string;
    impacted_node_count?: number;
    impacted_nodes?: string[]; // Array of Node IDs
    node_id?: string; // Added for node color
    project_name?: string;
    week_number?: number;
    node_color?: string;
}

interface TaskCardProps {
    task: Task;
    onEdit?: (task: Task) => void;
    nodeColors?: Record<string, string>; // Map ID -> Color
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, nodeColors }) => {

    // Determine Border Color: node_color (from backend) -> node_id check -> default
    const borderColor = task.node_color ||
        ((task.node_id && nodeColors && nodeColors[task.node_id]) ? nodeColors[task.node_id] : 'var(--border-color)');


    return (
        <div className="glass-panel" style={{
            marginBottom: '8px',
            padding: '10px 12px',
            borderLeft: `4px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            position: 'relative' // For absolute positioning if needed, or stick to flex
        }}>

            {/* Objective Breadcrumb & Project Name */}
            <div style={{
                fontSize: '0.70rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                width: '100%'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {task.objective_title && (
                        <>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }}></span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.objective_title}</span>
                        </>
                    )}
                </div>

                {task.project_name && (
                    <span style={{
                        color: '#60a5fa',
                        fontWeight: 'normal',
                        flexShrink: 0,
                        background: 'rgba(96, 165, 250, 0.1)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                    }}>
                        {task.project_name.substring(0, 8)}{task.project_name.length > 8 ? '.' : ''}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', lineHeight: '1.2', fontWeight: 100 }}>{task.title}</h3>
                    {task.description && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{task.description}</p>}
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {onEdit && (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }}
                            className="btn-icon"
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'var(--primary-light)' }}
                            title="Ver Detalle Completo"
                        >
                            ✏️
                        </button>
                    )}
                </div>
            </div>

            {/* Badges & Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {/* Visual Indicators */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Dependency Badge */}
                    {task.impacted_node_count && task.impacted_node_count > 0 ? (
                        <div title={`${task.impacted_node_count} dependencias aguas abajo`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--node-amber)', fontSize: '0.8rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Circle size={14} />
                                <span style={{ position: 'absolute', top: '-6px', right: '-6px', fontSize: '0.6rem', fontWeight: 'bold' }}>{task.impacted_node_count}</span>
                            </div>
                            <small>Impacto</small>
                        </div>
                    ) : null}

                    {/* Bridge Links (Nodes Impacted) */}
                    {task.impacted_nodes && nodeColors && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {task.impacted_nodes.map(nodeId => (
                                <div key={nodeId} title="Impacta Nodo" style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: nodeColors[nodeId] || 'gray',
                                    boxShadow: `0 0 5px ${nodeColors[nodeId] || 'gray'}`
                                }}></div>
                            ))}
                        </div>
                    )}

                    {/* Evidence Link (Read Only) */}
                    {task.evidence_url && (
                        <a href={task.evidence_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }} title="Ver Evidencia">
                            <ExternalLink size={14} /> Evidencia
                        </a>
                    )}
                </div>
            </div>

            {task.status === 'Waiting' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--state-warning)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> Esperando dependencias...
                </div>
            )}
        </div>
    );
};
