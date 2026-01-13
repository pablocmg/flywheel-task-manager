import React from 'react';
import { Circle, Clock, ExternalLink, AlertTriangle } from 'lucide-react';

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
    impacted_nodes?: string[];
    node_id?: string;
    project_name?: string;
    week_number?: number;
    node_color?: string;
    assignee_name?: string;
    complexity?: 'S' | 'M' | 'L' | 'XL' | 'XXL';
    is_waiting_third_party?: boolean;
    has_incomplete_dependencies?: boolean;
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

    // Visual states for special conditions
    const isWaitingThirdParty = task.is_waiting_third_party;
    const isBlockedByDependencies = task.has_incomplete_dependencies && !isWaitingThirdParty;
    const hasSpecialBorder = isWaitingThirdParty || isBlockedByDependencies;
    const [isHovered, setIsHovered] = React.useState(false);

    // Determine border style
    const getBorderStyle = () => {
        if (isWaitingThirdParty) return '2px dashed rgba(245, 158, 11, 0.6)'; // Amber
        if (isBlockedByDependencies) return '2px dashed rgba(239, 68, 68, 0.6)'; // Red
        return undefined;
    };

    return (
        <div
            className="glass-panel"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                marginBottom: '8px',
                padding: '10px 12px',
                borderLeft: hasSpecialBorder ? 'none' : `4px solid ${borderColor}`,
                border: getBorderStyle(),
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                position: 'relative',
                opacity: hasSpecialBorder && !isHovered ? 0.6 : 1,
                transition: 'opacity 0.2s ease, border 0.2s ease'
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

                    {/* Assignee Badge */}
                    {task.assignee_name && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(147, 51, 234, 0.15)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: '#a78bfa',
                            fontWeight: 500
                        }}>
                            👤 {task.assignee_name}
                        </div>
                    )}

                    {/* Waiting for Third Party Icon */}
                    {task.is_waiting_third_party && (
                        <div
                            title="Esperando respuesta externa"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#F59E0B',
                                fontSize: '0.75rem'
                            }}
                        >
                            <Clock size={14} />
                            <span style={{ fontWeight: 500 }}>Esperando terceros</span>
                        </div>
                    )}

                    {/* Blocked by Dependencies Icon */}
                    {task.has_incomplete_dependencies && !task.is_waiting_third_party && (
                        <div
                            title="Bloqueada por dependencias incompletas"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#ef4444',
                                fontSize: '0.75rem'
                            }}
                        >
                            <AlertTriangle size={14} />
                            <span style={{ fontWeight: 500 }}>Dependencia Incompleta</span>
                        </div>
                    )}

                    {/* Complexity Badge */}
                    {task.complexity && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: task.complexity === 'S' ? 'rgba(34, 197, 94, 0.2)' :
                                task.complexity === 'M' ? 'rgba(59, 130, 246, 0.2)' :
                                    task.complexity === 'L' ? 'rgba(249, 115, 22, 0.2)' :
                                        task.complexity === 'XL' ? 'rgba(239, 68, 68, 0.2)' :
                                            'rgba(220, 38, 38, 0.25)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            color: task.complexity === 'S' ? '#22c55e' :
                                task.complexity === 'M' ? '#3b82f6' :
                                    task.complexity === 'L' ? '#f97316' :
                                        task.complexity === 'XL' ? '#ef4444' :
                                            '#dc2626',
                            fontWeight: 600
                        }}>
                            {task.complexity}
                        </div>
                    )}
                </div>
            </div>

            {task.status === 'Waiting' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--state-alert)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> Bloqueado
                </div>
            )}
        </div>
    );
};
